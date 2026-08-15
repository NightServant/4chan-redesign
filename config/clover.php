<?php

declare(strict_types=1);

return [

    /*
    |---------------------------------------------------------------------------
    | Upstream API
    |---------------------------------------------------------------------------
    |
    | 4chan's read-only JSON API. Its documentation asks for no more than one
    | request a second and for `If-Modified-Since` on every request, so the
    | client honours both rather than treating them as advisory.
    |
    | Nothing is ever written upstream: the API accepts GET, HEAD and OPTIONS
    | only. Anything an anon does here stays in this application's database.
    |
    */

    'api' => [
        'base_url' => env('CLOVER_API_BASE_URL', 'https://a.4cdn.org'),

        /** Seconds between requests. Upstream asks for one; this is the floor. */
        'rate_limit_seconds' => 1,

        'timeout' => 10,
    ],

    /*
    |---------------------------------------------------------------------------
    | Content delivery
    |---------------------------------------------------------------------------
    |
    | Where attachments are served from. Two hosts, both 4chan's:
    |
    |   i.4cdn.org   uploads and their thumbnails
    |   s.4cdn.org   the site's own static images, which is where the spoiler
    |                placeholder lives
    |
    | These URLs go into `src` attributes, so an anon's browser fetches them
    | from 4chan directly and 4chan sees that request. Proxying them through
    | this application would hide it, at the cost of putting every image
    | through the app; hotlinking is the documented arrangement and the one
    | every other client uses.
    |
    | Nothing is ever downloaded or stored here. The application holds the id
    | of a file, not the file.
    |
    */

    'cdn' => [
        'images' => env('CLOVER_CDN_IMAGES', 'https://i.4cdn.org'),
        'static' => env('CLOVER_CDN_STATIC', 'https://s.4cdn.org'),
    ],

    /*
    |---------------------------------------------------------------------------
    | Board categories
    |---------------------------------------------------------------------------
    |
    | Ours, not upstream's. 4chan groups boards on its index page but does not
    | expose the grouping in `boards.json`, so the directory would have nothing
    | to group by without this map. Anything unlisted falls to the default,
    | which keeps a board created after this list was written visible rather
    | than dropping it off the directory entirely.
    |
    | Category describes subject matter and nothing else. It is deliberately
    | orthogonal to `ws_board`: /wg/, /t/ and /pol/ are all marked not-worksafe
    | upstream without being adult boards, so folding safety into the grouping
    | would file them under a heading that misdescribes them. What an anon is
    | shown is decided by `worksafe`; what it sits under is decided here.
    |
    | A slug must appear at most once. `BoardCategoryTest` fails if one appears
    | twice, because a duplicate makes the lookup order-dependent and the board
    | would land in whichever heading happened to be declared first.
    |
    */

    'categories' => [

        'default' => 'Other',

        'map' => [
            'Japanese Culture' => ['a', 'c', 'w', 'm', 'cgl', 'cm', 'f', 'n', 'jp', 'vt'],
            'Video Games' => ['v', 'vg', 'vm', 'vmg', 'vp', 'vr', 'vrpg', 'vst', 'tg', 'qst', 'vip'],
            'Interests' => ['g', 'co', 'diy', 'sci', 'his', 'int', 'k', 'o', 'ck', 'lit', 'sp', 'tv', 'news', 'out', 'toy', 'trv', 'an', 'fa', 'biz', 'fit', 'pw', 'xs', 'x', 'adv'],
            'Creative' => ['3', 'i', 'ic', 'gd', 'mu', 'po', 'p', 'wg', 'wsg', 'wsr', 'hr', 't'],
            'Adult' => ['aco', 'd', 'e', 'gif', 'h', 'hc', 'hm', 'r', 's', 'u', 'y', 'soc'],
            'Misc' => ['b', 'bant', 'pol', 'r9k', 's4s', 'trash', 'mlp', 'lgbt'],
        ],

    ],

    /*
    |---------------------------------------------------------------------------
    | Sync
    |---------------------------------------------------------------------------
    |
    | What `clover:sync` pulls on an unqualified run.
    |
    | `threads_per_board` is null: take the catalog whole. One request returns
    | every thread on a board, across all its pages, so a cap throws away rows
    | that have already been fetched and paid for at the rate limit. It was 30,
    | which is why most of 4chan was missing from the boards.
    |
    | Set a number while developing if a short list is easier to work with.
    |
    */

    'sync' => [
        'threads_per_board' => null,

        /*
        | How many threads per board `--with-posts` fetches in full.
        |
        | Finite, unlike `threads_per_board`, and for a reason the two do not
        | share: a catalog is one request for every thread on the board, while
        | a thread page is one request each. Left uncapped against a full sync
        | that stores eleven thousand threads, this is better than three hours
        | at one request a second.
        |
        | Ten a board is roughly a quarter of an hour across all 77. Raise it
        | when a deeper archive is worth the wait.
        */
        'threads_with_posts' => 10,

        /**
         * Boards synced when none are named. Empty means every board the API
         * returns, which is the intended steady state; a short list is useful
         * while developing so a full sync is not 77 requests.
         *
         * @var array<int, string>
         */
        'boards' => [],
    ],

    /*
    |---------------------------------------------------------------------------
    | Routing fallback
    |---------------------------------------------------------------------------
    |
    | `/{board}` has the same shape as every named page on the site, so without
    | a constraint the router resolves `/rules` as a board and shadows the real
    | page. The constraint is built from the synced board slugs.
    |
    | Routes are registered before the database is necessarily reachable —
    | during `migrate` on a fresh clone, for instance — so the slug list needs
    | a value that does not depend on a query having succeeded. These are it.
    | They are a floor, not the real list: once a sync has run the constraint
    | comes from the `boards` table.
    |
    */

    'fallback_boards' => ['g', 'wg', 'biz', 'x', 'fit', 'co', 'b'],

    /*
    |---------------------------------------------------------------------------
    | Social description
    |---------------------------------------------------------------------------
    |
    | What a link to Clover says when it is pasted somewhere that unfurls it.
    |
    | Rendered by the root Blade view rather than by `PageMeta`, because every
    | social crawler reads the HTML without executing any JavaScript: tags
    | written by Inertia's `<Head>` do not exist yet when Slack or X looks at
    | the page. `PageMeta` refines this per screen for browsers and for SSR;
    | this is the floor, and it is the part a crawler actually sees.
    |
    */

    /*
    |---------------------------------------------------------------------------
    | Attachments on local replies
    |---------------------------------------------------------------------------
    |
    | A reply written on Clover may carry an image. Everything ingested points
    | at 4chan's CDN and is never copied; this covers the other direction, and
    | it is the only case in which Clover holds a file at all.
    |
    | Images only, and only formats a browser renders without a plugin. `webm`
    | and `gif` animations are what 4chan is known for and are deliberately not
    | here: video needs a player, a poster frame and a size budget this feature
    | does not have, and accepting an upload Clover cannot display would be
    | worse than declining it.
    |
    */

    'attachments' => [
        'disk' => env('CLOVER_ATTACHMENT_DISK', 'public'),
        'directory' => 'attachments',
        /* Kilobytes, which is what Laravel's `max` rule counts in. */
        'max_kilobytes' => 4096,
        'mimes' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    ],

    'meta_description' => 'Clover mirrors 4chan\'s boards in an interface built for reading. No profiles, no algorithm, no ads, and reading needs no account.',

];
