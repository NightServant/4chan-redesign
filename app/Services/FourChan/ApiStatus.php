<?php

declare(strict_types=1);

namespace App\Services\FourChan;

/**
 * How an upstream request turned out.
 *
 * `Unchanged` is a success, not a failure and not an empty result. 4chan asks
 * every client to send `If-Modified-Since` and answers `304` when nothing has
 * moved, which is the common case on a board that is quiet — most of a sync's
 * requests end here. A caller that could not tell it apart from "the board
 * returned no threads" would delete rows every time a board went quiet.
 */
enum ApiStatus: string
{
    /** A `200` with a decoded body. */
    case Fetched = 'fetched';

    /** A `304`: the endpoint has not changed since we last read it. */
    case Unchanged = 'unchanged';

    /** A `404`: the board or thread is gone upstream. */
    case Missing = 'missing';
}
