<?php

declare(strict_types=1);

/**
 * Serves the files under `public/` that Vercel's own static hosting cannot
 * reach: `public/build/**` chief among them.
 *
 * This runtime (vercel-php) builds the frontend during composer's `vercel`
 * script -- see `composer.json` -- which runs *after* the project is
 * uploaded. Vercel's static-file table is built from what was uploaded, so
 * anything `npm run build` writes afterwards exists only inside this
 * function's own filesystem. The runtime's README documents exactly this
 * limitation and its fix: a small lambda that reads the file back out and
 * serves it, which is what this does. `vercel.json` routes `/build/*` and
 * the handful of root-level static files (favicon, robots.txt, the social
 * card image) here.
 */
$root = realpath(__DIR__.'/../public');

if ($root === false) {
    http_response_code(500);
    exit;
}

$requestPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$candidate = realpath($root.'/'.ltrim($requestPath, '/'));

/* `realpath` also resolves `..`, so this is what stops a request walking out
   of `public/` -- the same guard `ReplyController` relies on for an upload's
   stored path, applied here to a request path instead. */
if ($candidate === false || ! str_starts_with($candidate, $root.DIRECTORY_SEPARATOR) || ! is_file($candidate)) {
    http_response_code(404);
    exit;
}

$mime = match (strtolower(pathinfo($candidate, PATHINFO_EXTENSION))) {
    'js', 'mjs' => 'application/javascript',
    'css' => 'text/css',
    'json' => 'application/json',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg', 'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'ico' => 'image/x-icon',
    'txt' => 'text/plain; charset=utf-8',
    'woff2' => 'font/woff2',
    'woff' => 'font/woff',
    'ttf' => 'font/ttf',
    default => 'application/octet-stream',
};

header('Content-Type: '.$mime);

/* Built assets carry a content hash in the filename (`app-CX5jZOGU.js`), so a
   new build is a new URL and this can cache forever. Everything else here --
   the favicon, robots.txt -- changes rarely enough that a short cache beats
   none. */
header(str_starts_with($requestPath, '/build/')
    ? 'Cache-Control: public, max-age=31536000, immutable'
    : 'Cache-Control: public, max-age=3600');

readfile($candidate);
