<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Board;
use App\Models\Thread;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Thread>
 */
class ThreadFactory extends Factory
{
    protected $model = Thread::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $postedAt = $this->faker->dateTimeBetween('-30 days', '-1 hour');

        return [
            'board_id' => Board::factory(),

            /**
             * Post numbers are a per-board sequence upstream and run in the
             * hundred-millions, so the range here is realistic rather than
             * starting at 1: several display paths render the number and a
             * three-digit one would not exercise them the way a real post does.
             */
            'no' => $this->faker->unique()->numberBetween(100_000_000, 999_999_999),

            /** Most threads genuinely have none, so most rows here do not either. */
            'subject' => $this->faker->boolean(30) ? $this->faker->sentence(4) : null,

            'sticky' => false,
            'closed' => false,
            'replies_count' => $this->faker->numberBetween(0, 400),
            'images_count' => $this->faker->numberBetween(0, 120),
            'posted_at' => $postedAt,
            'bumped_at' => $this->faker->dateTimeBetween($postedAt, 'now'),
            'posts_synced_at' => null,
            'synced_at' => now(),
        ];
    }

    public function sticky(): static
    {
        return $this->state(fn (array $attributes): array => [
            'sticky' => true,
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'closed' => true,
        ]);
    }

    /** A thread whose full post list has been fetched, not only its catalog stub. */
    public function synced(): static
    {
        return $this->state(fn (array $attributes): array => [
            'posts_synced_at' => now(),
        ]);
    }
}
