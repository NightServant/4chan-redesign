<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Thread;
use App\Models\ThreadRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ThreadRead>
 */
class ThreadReadFactory extends Factory
{
    protected $model = ThreadRead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'thread_id' => Thread::factory(),
            'progress' => 0,
            'last_read_at' => now(),
        ];
    }
}
