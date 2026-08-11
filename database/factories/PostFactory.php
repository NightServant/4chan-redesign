<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Post;
use App\Models\Thread;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'thread_id' => Thread::factory(),
            'no' => $this->faker->unique()->numberBetween(100_000_000, 999_999_999),
            'is_op' => false,
            'author' => 'Anonymous',
            'tripcode' => null,
            'capcode' => null,
            'body' => $this->faker->paragraph(),
            'quotes' => [],
            'media_filename' => null,
            'media_extension' => null,
            'media_tim' => null,
            'media_width' => null,
            'media_height' => null,
            'media_thumb_width' => null,
            'media_thumb_height' => null,
            'media_size' => null,
            'media_spoiler' => false,
            'posted_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
        ];
    }

    public function op(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_op' => true,
        ]);
    }

    /**
     * A post with an attachment.
     *
     * Only ever metadata. The application never fetches or hotlinks the file,
     * so a factory that produced a URL would be modelling something the
     * product does not do.
     */
    public function withMedia(): static
    {
        return $this->state(fn (array $attributes): array => [
            'media_filename' => $this->faker->slug(3),
            'media_extension' => $this->faker->randomElement(['.png', '.jpg', '.webm', '.gif']),

            /**
             * The id the CDN addresses the file by: a unix timestamp in
             * microseconds. Without it there is no URL to build, so a media
             * state that omitted it would model a post the interface treats
             * as having no attachment at all.
             */
            'media_tim' => $this->faker->numberBetween(1_600_000_000_000_000, 1_800_000_000_000_000),

            'media_width' => $this->faker->numberBetween(320, 3840),
            'media_height' => $this->faker->numberBetween(240, 2160),
            'media_thumb_width' => 250,
            'media_thumb_height' => $this->faker->numberBetween(140, 250),
            'media_size' => $this->faker->numberBetween(20_000, 4_000_000),
        ]);
    }

    /**
     * @param  array<int, int>  $quotes
     */
    public function quoting(array $quotes): static
    {
        return $this->state(fn (array $attributes): array => [
            'quotes' => $quotes,
        ]);
    }
}
