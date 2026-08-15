<?php

/**
 * What a link to Clover says when it is pasted somewhere that unfurls it.
 *
 * These assert the *served HTML*, not a React component, and that is the whole
 * point. `PageMeta` writes its tags through Inertia's `<Head>`, which means
 * they exist only once JavaScript has run — and every social crawler there is
 * reads the HTML without executing anything. Before this, a link to Clover
 * previewed as a bare URL: no image, no description, and the title "Laravel".
 *
 * A test that rendered the component and found the tags would have passed
 * throughout.
 */
test('every page serves a social card without needing JavaScript', function (string $path) {
    $html = $this->get($path)->getContent();

    expect($html)->toContain('property="og:image"');
    expect($html)->toContain('/og.png');
    expect($html)->toContain('name="description"');
    expect($html)->toContain('name="twitter:card"');
})->with(['/', '/popular', '/communities', '/status', '/rules', '/faq', '/privacy']);

test('the card is a large image rather than a cropped square', function () {
    expect($this->get('/')->getContent())
        ->toContain('content="summary_large_image"');
});

test('the description says something rather than being empty', function () {
    $html = $this->get('/')->getContent();

    preg_match('/<meta head-key="description" name="description" content="([^"]*)"/', $html, $matches);

    expect($matches[1] ?? '')->not->toBe('');
    expect($matches[1])->toContain('4chan');
});

/** The file the tags point at has to be there, and has to be the right shape. */
test('the social card exists at the size every network crops to', function () {
    $path = public_path('og.png');

    expect(file_exists($path))->toBeTrue();

    [$width, $height] = getimagesize($path);

    expect($width)->toBe(1200);
    expect($height)->toBe(630);
});
