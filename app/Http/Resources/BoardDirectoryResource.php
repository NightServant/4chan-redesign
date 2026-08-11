<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * A board as the directory lists it: `BoardDirectoryEntry`.
 *
 * `worksafe` is sent even though the server has already filtered the list by
 * it. The directory renders the flag — a not-worksafe board an anon has opted
 * into is labelled as such — so the field is display data here, not a second
 * access check. The access check is the query.
 */
final class BoardDirectoryResource extends BoardResource
{
    /**
     * @param  mixed  $resource
     */
    public function __construct($resource)
    {
        parent::__construct($resource);

        $this->withDescription();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $board = $this->board();

        return [
            ...parent::toArray($request),
            'category' => $board->category,

            /**
             * Subscriptions are task 11b: there is no table to read one from,
             * so nobody is subscribed to anything. A true zero rather than a
             * guess — the alternative would be inventing state for an anon.
             */
            'subscribed' => false,

            'worksafe' => $board->worksafe,
        ];
    }
}
