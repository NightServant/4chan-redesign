<?php

/**
 * Entry point for the community PHP runtime (vercel-php) on Vercel.
 *
 * Every request that is not a static asset (see `api/assets.php` and
 * `vercel.json`'s routes) lands here and is handed straight to Laravel's own
 * front controller, unchanged. There is nothing Vercel-specific below this
 * line: the platform differences live in `bootstrap/app.php` (trusted
 * proxies) and in the environment variables `vercel.json` sets (writable
 * paths under `/tmp`, the database driver, and so on).
 */
require __DIR__.'/../public/index.php';
