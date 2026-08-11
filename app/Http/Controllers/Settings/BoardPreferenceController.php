<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BoardPreferenceController extends Controller
{
    /**
     * Set whether this anon sees boards 4chan marks as not worksafe.
     *
     * Its own endpoint rather than a field on the profile form: this is a
     * single switch that saves the moment it is flipped, and folding it into a
     * form with a Save button would mean an anon could toggle it, navigate
     * away, and be wrong about what they had agreed to see.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'shows_mature_boards' => ['required', 'boolean'],
        ]);

        $request->user()->update([
            'shows_mature_boards' => $validated['shows_mature_boards'],
        ]);

        return back();
    }
}
