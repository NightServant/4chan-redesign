<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Observers\UserObserver;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
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
#[ObservedBy(UserObserver::class)]
#[Fillable(['email', 'password', 'handle', 'tripcode', 'bio', 'shows_mature_boards'])]
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
     * `handle` is nullable — every account created before the column existed
     * has none, and a profile with a blank heading reads as broken rather than
     * as unset — so there is a fallback. It is derived from the id and nothing
     * else.
     *
     * It used to fall through the account's `name` first, which put whatever
     * an anon typed at registration on their profile. Registration asks for a
     * name and people give their real one; this account's is a full legal name.
     * On a site whose entire premise is anonymity, defaulting the public
     * heading to that is a leak, not a nicety. An anon who wants their name
     * shown can set it as their handle, which is now a field they can reach.
     */
    public function displayHandle(): string
    {
        return $this->handle ?? "anon_{$this->id}";
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
