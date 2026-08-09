<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * A single board, e.g. `/g/`.
 *
 * The slug arrives already constrained to a known board by the route, so there
 * is nothing to validate here yet. Once the backend lands this resolves an
 * Eloquent model and the constraint moves to a route binding.
 */
class BoardController extends Controller
{
    public function __invoke(string $board): Response
    {
        return Inertia::render('board', [
            /** Carries its delimiters on the client, e.g. `/g/`. */
            'slug' => "/{$board}/",
        ]);
    }
}
