<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Get the validation rules used to validate profile handles.
     *
     * The handle is what the account screen puts at the top of the page, and
     * until now nothing could write it: the profile displayed a field no form
     * on the site could edit, so "Edit profile" led to a page that changed
     * neither of the two things the profile actually shows.
     *
     * Nullable, because an anon who sets none keeps the `anon_{id}` fallback,
     * which is the right default on a board that promises anonymity. Unique,
     * because it identifies a profile. Restricted to word characters so a
     * handle cannot be padded with spaces or lookalikes to impersonate another.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function handleRules(?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'min:3',
            'max:32',
            'regex:/^[A-Za-z0-9_]+$/',
            $userId === null
                ? Rule::unique(User::class, 'handle')
                : Rule::unique(User::class, 'handle')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate profile bios.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function bioRules(): array
    {
        return ['nullable', 'string', 'max:280'];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
