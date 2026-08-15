<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\ThreadNotifications;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * New replies in threads this anon is in.
 *
 * The last destination that was still a placeholder. It said "Replies and
 * janitor actions appear here", which named two things this application does
 * not have: there is no janitor queue, and no reply is addressed to an account
 * because a post carries no identity to address.
 *
 * What it shows instead is real and comes entirely from local rows — see
 * `ThreadNotifications` for the derivation and for why a notification here
 * belongs to a thread rather than to a person.
 */
class NotificationsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('notifications', [
            'notifications' => ThreadNotifications::for(
                $request->user(),
                $this->showsMatureBoards($request),
            ),
        ]);
    }
}
