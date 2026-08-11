<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Board;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Board>
 */
class BoardFactory extends Factory
{
    protected $model = Board::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => $this->faker->unique()->lexify('???'),
            'title' => $this->faker->words(2, true),
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(array_keys(config('clover.categories.map'))),
            'worksafe' => true,
            'max_comment_chars' => 2000,
            'bump_limit' => 310,
            'image_limit' => 150,
            'per_page' => 15,
            'pages' => 10,
            'is_archived' => false,
            'synced_at' => now(),
        ];
    }

    /**
     * A board 4chan marks not worksafe.
     *
     * Named for the upstream flag rather than for adult content, because the
     * two are not the same set: /wg/ and /t/ carry the flag without being
     * adult boards. What this state models is "hidden unless an anon opts in".
     */
    public function notWorksafe(): static
    {
        return $this->state(fn (array $attributes): array => [
            'worksafe' => false,
        ]);
    }

    public function slug(string $slug): static
    {
        return $this->state(fn (array $attributes): array => [
            'slug' => $slug,
        ]);
    }
}
