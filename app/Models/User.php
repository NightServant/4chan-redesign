<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property CarbonImmutable|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property CarbonImmutable|null $two_factor_confirmed_at
 * @property string|null $handle
 * @property string|null $tripcode
 * @property string $bio
 * @property bool $shows_mature_boards
 * @property string|null $remember_token
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'handle', 'tripcode', 'bio', 'shows_mature_boards'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /** @return HasMany<Bookmark, $this> */
    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }

    /** @return HasMany<ThreadRead, $this> */
    public function reads(): HasMany
    {
        return $this->hasMany(ThreadRead::class);
    }

    /** @return BelongsToMany<Board, $this> */
    public function subscribedBoards(): BelongsToMany
    {
        return $this->belongsToMany(Board::class, 'board_subscriptions')
            ->withTimestamps();
    }

    /**
     * Posts this anon wrote here.
     *
     * For finding their own writing again, never for attributing it to them
     * in public. Nothing renders this relation to anyone else.
     *
     * @return HasMany<Post, $this>
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    /**
     * The name the profile shows.
     *
     * Falls back to the account's display name, then to something derived
     * from its id, because `handle` is nullable: every account created before
     * the column existed has none, and a profile with a blank heading reads
     * as broken rather than as unset.
     */
    public function displayHandle(): string
    {
        return $this->handle ?? $this->name ?? "anon_{$this->id}";
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'shows_mature_boards' => 'boolean',
        ];
    }
}
