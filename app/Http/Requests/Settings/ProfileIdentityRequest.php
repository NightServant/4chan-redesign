<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The two fields the account screen actually puts on the page: the handle at
 * the top and the line under it.
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
            'handle' => $this->handleRules($this->user()->id),
            'bio' => $this->bioRules(),
        ];
    }

    /**
     * A blank handle means "use the fallback", not "an empty string".
     *
     * An anon clearing the field submits an empty value, which is not null and
     * would sail past `nullable` straight into the unique index — where the
     * second anon to clear theirs collides with the first.
     *
     * `bio` is normalised the other way. Its column is a non-null text with an
     * empty default, so a cleared bio has to arrive as `''` rather than null.
     *
     * Only keys the request actually sent are touched: merging a key that was
     * absent would read as null and wipe a handle on any request that happened
     * not to include it.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('handle')) {
            $handle = $this->input('handle');

            $this->merge([
                'handle' => is_string($handle) && trim($handle) === '' ? null : $handle,
            ]);
        }

        if ($this->has('bio')) {
            $bio = $this->input('bio');

            $this->merge(['bio' => is_string($bio) ? trim($bio) : '']);
        }
    }
}
