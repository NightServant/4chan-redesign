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
use Illuminate\Support\Str;
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
 * @property string $handle
 * @property string|null $tripcode
 * @property string $bio
 * @property bool $shows_mature_boards
 * @property string|null $remember_token
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[ObservedBy(UserObserver::class)]
#[Fillable(['email', 'password', 'tripcode', 'bio', 'shows_mature_boards'])]
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
     * A handle for a new account: `anon_` and eight random letters and digits.
     *
     * Assigned, never chosen. Clover promises anonymity, and a handle an anon
     * picked was the one thing on an account that could name them; people
     * type their real name into a box labelled "Username". Random rather than
     * `anon_{id}`, which would publish how many accounts exist and in what
     * order they joined. Not fillable, so no request can write it.
     */
    public static function generateHandle(): string
    {
        do {
            $handle = 'anon_'.Str::lower(Str::random(8));
        } while (static::query()->where('handle', $handle)->exists());

        return $handle;
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
