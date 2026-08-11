<?php

declare(strict_types=1);

return [

    /*
    |---------------------------------------------------------------------------
    | Board slugs
    |---------------------------------------------------------------------------
    |
    | Board URLs keep the imageboard's own shape, so `/g/` is a board and
    | `/g/58210441` is a thread on it. That shape matches every other
    | single-segment route on the site, which means the router would happily
    | resolve `/rules` as a board named "rules" and shadow the real page.
    |
    | Constraining the route parameter to this list is what prevents that. It
    | mirrors the slugs in `resources/js/fixtures/clover.ts` and is replaced by
    | a database lookup when the backend lands.
    |
    */

    'boards' => ['g', 'wg', 'biz', 'x', 'fit', 'co', 'b'],

];
