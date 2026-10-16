<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The line under the handle on the account screen. The handle itself is
 * assigned at creation and cannot be changed (`User::generateHandle()`).
 *
 * Separate from `ProfileUpdateRequest` because they are edited from a different
 * place and by a different gesture. The settings form owns the account's name
 * and email and requires both; this owns what a profile shows, is opened in a
 * dialog beside the profile it changes, and must not demand an email address to
 * fix a typo in a bio.
 */
class ProfileIdentityRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bio' => $this->bioRules(),
        ];
    }

    /**
     * A cleared bio arrives as `''` rather than null: its column is a non-null
     * text with an empty default. Only sent when the request sent it, so a
     * request without one cannot wipe it.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('bio')) {
            $bio = $this->input('bio');

            $this->merge(['bio' => is_string($bio) ? trim($bio) : '']);
        }
    }
}
