<?php

declare(strict_types=1);

/**
 * The icons a browser or a phone fetches outside the page.
 *
 * Only `favicon.svg` was ever replaced with the Clover mark. `favicon.ico` and
 * `apple-touch-icon.png` stayed the starter kit's Laravel logo, so a tab that
 * fell back to the ICO, or a phone saving the site to its home screen, showed
 * Laravel's. Both are drawn from the SVG now, on its brand green.
 */

/** @return array{int, int, int} */
function rgbAt(GdImage $image, int $x, int $y): array
{
    $colour = imagecolorsforindex($image, imagecolorat($image, $x, $y));

    return [$colour['red'], $colour['green'], $colour['blue']];
}

const CLOVER_GREEN = [0x34, 0xC7, 0x6F];

it('gives a phone the Clover mark, square and edge to edge', function (): void {
    $icon = imagecreatefrompng(public_path('apple-touch-icon.png'));

    expect([imagesx($icon), imagesy($icon)])->toBe([180, 180]);

    /* The very corner too: iOS rounds the icon itself and paints any
       transparency black, so the green runs to the edge. */
    expect(rgbAt($icon, 0, 0))->toBe(CLOVER_GREEN)
        ->and(rgbAt($icon, 4, 90))->toBe(CLOVER_GREEN);
});

it('carries the Clover mark at every size in the ICO', function (): void {
    $ico = (string) file_get_contents(public_path('favicon.ico'));
    $header = unpack('vreserved/vtype/vcount', $ico);

    expect($header['type'])->toBe(1)->and($header['count'])->toBeGreaterThan(0);

    foreach (range(0, $header['count'] - 1) as $index) {
        $entry = unpack('Cwidth/Cheight/Ccolours/Creserved/vplanes/vbits/Vsize/Voffset', substr($ico, 6 + 16 * $index, 16));
        $image = imagecreatefromstring(substr($ico, $entry['offset'], $entry['size']));

        expect($image)->toBeInstanceOf(GdImage::class);

        /* Middle of the left edge: inside the tile's rounded corners at 16px. */
        expect(rgbAt($image, 3, intdiv($entry['height'], 2)))->toBe(CLOVER_GREEN);
    }
});
