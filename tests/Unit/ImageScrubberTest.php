<?php

declare(strict_types=1);

use App\Support\ImageScrubber;

/**
 * What an uploaded image keeps and what it loses.
 *
 * The fixtures are built here: a real picture from GD, then the things a phone
 * or an editor would add around it (EXIF with a position and a camera, text
 * chunks, comments, a second file glued on the end). The assertion is always
 * the same pair: the personal details are gone, and the picture is the same.
 */

/** A picture with noise in it, so entropy-coded data contains 0xFF bytes. */
function scrubberImage(int $width = 32, int $height = 16): GdImage
{
    mt_srand(7);
    $image = imagecreatetruecolor($width, $height);

    for ($x = 0; $x < $width; $x++) {
        for ($y = 0; $y < $height; $y++) {
            imagesetpixel($image, $x, $y, (int) imagecolorallocate($image, mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 255)));
        }
    }

    return $image;
}

function scrubberEncode(GdImage $image, string $format): string
{
    ob_start();
    match ($format) {
        'jpeg' => imagejpeg($image, null, 90),
        'png' => imagepng($image),
        'gif' => imagegif($image),
        'webp' => imagewebp($image, null, 90),
    };

    return (string) ob_get_clean();
}

/** An APP1 segment with a camera make, an orientation and (optionally) a position. */
function scrubberExif(int $orientation, bool $gps): string
{
    $entry = fn (int $tag, int $type, int $count, string $value): string => pack('vvV', $tag, $type, $count).str_pad($value, 4, "\0");

    $entries = $gps ? 3 : 2;
    $makeAt = 8 + 2 + 12 * $entries + 4;
    $gpsAt = $makeAt + 6;

    $ifd0 = pack('v', $entries)
        .$entry(0x010F, 2, 6, pack('V', $makeAt))
        .$entry(0x0112, 3, 1, pack('v', $orientation))
        .($gps ? $entry(0x8825, 4, 1, pack('V', $gpsAt)) : '')
        .pack('V', 0);

    $tiff = "II*\0".pack('V', 8).$ifd0."Pixel\0";

    if ($gps) {
        $ratios = fn (int ...$n): string => implode('', array_map(fn (int $v): string => pack('VV', $v, 1), $n));
        $latAt = $gpsAt + 2 + 4 * 12 + 4;

        $tiff .= pack('v', 4)
            .$entry(1, 2, 2, "N\0")
            .$entry(2, 5, 3, pack('V', $latAt))
            .$entry(3, 2, 2, "E\0")
            .$entry(4, 5, 3, pack('V', $latAt + 24))
            .pack('V', 0)
            .$ratios(51, 30, 0)
            .$ratios(0, 7, 30);
    }

    return "\xFF\xE1".pack('n', 2 + 6 + strlen($tiff))."Exif\0\0".$tiff;
}

function scrubberWithExif(string $jpeg, string $app1): string
{
    return "\xFF\xD8".$app1.substr($jpeg, 2);
}

function scrubberExifOf(string $bytes): array|false
{
    $path = (string) tempnam(sys_get_temp_dir(), 'exif');
    file_put_contents($path, $bytes);
    $exif = @exif_read_data($path);
    unlink($path);

    return $exif;
}

/** Every pixel, so "the picture is the same" is checked rather than assumed. */
function scrubberPixels(string $bytes): array
{
    $image = imagecreatefromstring($bytes);
    $pixels = [];

    for ($x = 0; $x < imagesx($image); $x++) {
        for ($y = 0; $y < imagesy($image); $y++) {
            $pixels[] = imagecolorat($image, $x, $y);
        }
    }

    return $pixels;
}

function scrubberPngChunk(string $type, string $data): string
{
    return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
}

it('takes the position and the camera out of a JPEG', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $photo = scrubberWithExif($plain, scrubberExif(1, gps: true));

    expect($photo)->toContain('Pixel');

    $clean = ImageScrubber::clean($photo, 'image/jpeg');

    expect($clean)->not->toBeNull()
        ->and($clean['bytes'])->not->toContain('Pixel')
        ->and($clean['bytes'])->not->toContain('Exif')
        ->and(scrubberPixels($clean['bytes']))->toBe(scrubberPixels($plain));

    if (function_exists('exif_read_data')) {
        expect(scrubberExifOf($photo))->toHaveKey('GPSLatitude');
        $after = scrubberExifOf($clean['bytes']);
        expect($after === false || ! array_key_exists('GPSLatitude', $after))->toBeTrue()
            ->and($after === false || ! array_key_exists('Make', $after))->toBeTrue();
    }
});

/**
 * Dropping the orientation with the rest would turn a portrait photo on its
 * side. It is the one tag kept, written fresh, and the size recorded is the
 * size the browser will show.
 */
it('keeps a JPEG upright by keeping its orientation and nothing else of the EXIF', function (): void {
    $photo = scrubberWithExif(scrubberEncode(scrubberImage(40, 20), 'jpeg'), scrubberExif(6, gps: true));

    $clean = ImageScrubber::clean($photo, 'image/jpeg');

    expect($clean['width'])->toBe(20)
        ->and($clean['height'])->toBe(40)
        ->and($clean['bytes'])->toContain('Exif')
        ->and($clean['bytes'])->not->toContain('Pixel');

    if (function_exists('exif_read_data')) {
        $after = scrubberExifOf($clean['bytes']);
        expect($after['Orientation'])->toBe(6)
            ->and($after)->not->toHaveKey('GPSLatitude')
            ->and($after)->not->toHaveKey('Make');
    }
});

it('writes no EXIF at all when the orientation is the default', function (): void {
    $photo = scrubberWithExif(scrubberEncode(scrubberImage(40, 20), 'jpeg'), scrubberExif(1, gps: false));

    $clean = ImageScrubber::clean($photo, 'image/jpeg');

    expect($clean['bytes'])->not->toContain('Exif')
        ->and($clean['width'])->toBe(40)
        ->and($clean['height'])->toBe(20);
});

it('drops a JPEG comment and anything glued on after the image', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $comment = "\xFF\xFE".pack('n', 2 + 6).'SECRET';
    $glued = scrubberWithExif($plain, $comment).'PK-hidden-archive<?php echo 1;';

    $clean = ImageScrubber::clean($glued, 'image/jpeg');

    expect($clean['bytes'])->not->toContain('SECRET')
        ->and($clean['bytes'])->not->toContain('hidden-archive')
        ->and(substr($clean['bytes'], -2))->toBe("\xFF\xD9")
        ->and(scrubberPixels($clean['bytes']))->toBe(scrubberPixels($plain));
});

it('takes the text, time and EXIF chunks out of a PNG and the file hidden after it', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $iend = strlen($plain) - 12;
    $noisy = substr($plain, 0, $iend)
        .scrubberPngChunk('tEXt', "Comment\0SECRET")
        .scrubberPngChunk('tIME', str_repeat("\0", 7))
        .scrubberPngChunk('eXIf', 'Pixel')
        .substr($plain, $iend)
        .'PK-hidden-archive';

    $clean = ImageScrubber::clean($noisy, 'image/png');

    expect($clean['bytes'])->not->toContain('SECRET')
        ->and($clean['bytes'])->not->toContain('Pixel')
        ->and($clean['bytes'])->not->toContain('hidden-archive')
        ->and(scrubberPixels($clean['bytes']) === scrubberPixels($plain))->toBeTrue()
        ->and([$clean['width'], $clean['height']])->toBe([32, 16]);
});

it('keeps the transparency of a PNG', function (): void {
    $image = imagecreatetruecolor(8, 8);
    imagealphablending($image, false);
    imagesavealpha($image, true);
    imagefill($image, 0, 0, (int) imagecolorallocatealpha($image, 10, 20, 30, 100));
    $png = scrubberEncode($image, 'png');

    $clean = ImageScrubber::clean($png.'tail', 'image/png');

    expect(scrubberPixels($clean['bytes']))->toBe(scrubberPixels($png));
});

it('takes the comment and the trailing file out of a GIF', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'gif');
    $noisy = substr($plain, 0, -1)."\x21\xFE\x06SECRET\x00;".'PK-hidden-archive';

    $clean = ImageScrubber::clean($noisy, 'image/gif');

    expect($clean['bytes'])->not->toContain('SECRET')
        ->and($clean['bytes'])->not->toContain('hidden-archive')
        ->and(scrubberPixels($clean['bytes']))->toBe(scrubberPixels($plain));
});

/** A hand-built two-frame GIF: GD cannot write one. */
function scrubberAnimatedGif(string $extra = ''): string
{
    $frame = "\x21\xF9\x04\x00\x0A\x00\x00\x00"."\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x00"."\x02\x01\x44\x00";

    return "GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xFF\xFF\xFF"
        ."\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00"
        .$extra.$frame.$frame.';';
}

it('keeps every frame and the loop count of an animated GIF, and drops the rest', function (): void {
    $noisy = scrubberAnimatedGif("\x21\xFE\x06SECRET\x00\x21\xFF\x0BXMP DataXMP\x04abcd\x00").'PK-hidden-archive';

    $clean = ImageScrubber::clean($noisy, 'image/gif');

    expect($clean)->not->toBeNull()
        ->and($clean['bytes'])->toBe(scrubberAnimatedGif())
        ->and(substr_count($clean['bytes'], "\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x00"))->toBe(2);
});

it('takes the EXIF and XMP out of a WebP and clears the flags that announced them', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'webp');
    $image = substr($plain, 12);
    $vp8x = 'VP8X'.pack('V', 10).chr(0x0C)."\0\0\0".substr(pack('V', 31), 0, 3).substr(pack('V', 15), 0, 3);
    $body = 'WEBP'.$vp8x.$image.'EXIF'.pack('V', 4).'SPOT'.'XMP '.pack('V', 4).'xmp!';
    $noisy = 'RIFF'.pack('V', strlen($body)).$body.'PK-hidden-archive';

    $clean = ImageScrubber::clean($noisy, 'image/webp');

    expect($clean)->not->toBeNull()
        ->and($clean['bytes'])->not->toContain('SPOT')
        ->and($clean['bytes'])->not->toContain('xmp!')
        ->and($clean['bytes'])->not->toContain('hidden-archive')
        ->and(ord($clean['bytes'][20]))->toBe(0)
        ->and(unpack('V', $clean['bytes'], 4)[1])->toBe(strlen($clean['bytes']) - 8)
        ->and([$clean['width'], $clean['height']])->toBe([32, 16])
        ->and(scrubberPixels($clean['bytes']))->toBe(scrubberPixels($plain));
});

it('refuses what it cannot read to the end', function (string $mime, string $bytes): void {
    expect(ImageScrubber::clean($bytes, $mime))->toBeNull();
})->with(function (): array {
    $jpeg = scrubberEncode(scrubberImage(), 'jpeg');
    $png = scrubberEncode(scrubberImage(), 'png');
    $gif = scrubberEncode(scrubberImage(), 'gif');
    $webp = scrubberEncode(scrubberImage(), 'webp');

    return [
        'JPEG with no end' => ['image/jpeg', substr($jpeg, 0, -2)],
        'JPEG cut in a segment' => ['image/jpeg', substr($jpeg, 0, 30)],
        'not a JPEG' => ['image/jpeg', 'hello'],
        'PNG with no end' => ['image/png', substr($png, 0, -12)],
        'PNG cut in a chunk' => ['image/png', substr($png, 0, 40)],
        'GIF with no image in it' => ['image/gif', substr($gif, 0, 13 + 3 * (2 << (ord($gif[10]) & 7))).';'],
        'GIF cut in its image data' => ['image/gif', substr($gif, 0, -5)],
        'WebP shorter than it says' => ['image/webp', substr($webp, 0, -10)],
        'a type it does not handle' => ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
    ];
});

/* ---- Payloads inside structures the cleaner keeps ------------------------ */

/** A JPEG segment: marker, length, payload. */
function scrubberSegment(int $marker, string $payload): string
{
    return "\xFF".chr($marker).pack('n', strlen($payload) + 2).$payload;
}

it('drops a JPEG segment that is not on the list, whatever marker it hides behind', function (int $marker): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $noisy = scrubberWithExif($plain, scrubberSegment($marker, 'MARKERTEXT'));

    $clean = ImageScrubber::clean($noisy, 'image/jpeg');

    expect($clean)->not->toBeNull()
        ->and($clean['bytes'])->not->toContain('MARKERTEXT')
        ->and(scrubberPixels($clean['bytes']) === scrubberPixels($plain))->toBeTrue();
})->with([
    'APP14 that is not Adobe' => 0xEE,
    'reserved 0x02' => 0x02,
    'reserved 0xF5' => 0xF5,
    'JPG 0xC8' => 0xC8,
    'APP0' => 0xE0,
    'APP15' => 0xEF,
    'hierarchical 0xDE' => 0xDE,
]);

it('rewrites Adobe APP14 to its one meaningful byte', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $adobe = scrubberSegment(0xEE, 'Adobe'."\x00\x64MARK".chr(2));

    $clean = ImageScrubber::clean(scrubberWithExif($plain, $adobe), 'image/jpeg');

    expect($clean['bytes'])->toContain("\xFF\xEE\x00\x0EAdobe\x00\x64\x00\x00\x00\x00\x02")
        ->and($clean['bytes'])->not->toContain('MARK');

    $long = scrubberSegment(0xEE, 'Adobe'."\x00\x64MARK".chr(2).'MARKERTEXT');

    expect(ImageScrubber::clean(scrubberWithExif($plain, $long), 'image/jpeg')['bytes'])->not->toContain('MARK');
});

it('refuses a JPEG with a restart interval longer than it can be', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');

    expect(ImageScrubber::clean(scrubberWithExif($plain, scrubberSegment(0xDD, "\0\x01MARKER")), 'image/jpeg'))->toBeNull();
});

it('refuses a JPEG that keeps hundreds of tiny segments to carry something in their count', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $many = str_repeat(scrubberSegment(0xDD, "\0\x01"), 600);

    expect(ImageScrubber::clean(scrubberWithExif($plain, $many), 'image/jpeg'))->toBeNull();
});

it('refuses a JPEG with no frame or no scan', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'jpeg');
    $withoutScan = substr($plain, 0, strpos($plain, "\xFF\xDA"))."\xFF\xD9";
    $withoutFrame = "\xFF\xD8".scrubberSegment(0xDB, str_repeat("\x01", 65))."\xFF\xD9";

    expect(ImageScrubber::clean($withoutScan, 'image/jpeg'))->toBeNull()
        ->and(ImageScrubber::clean($withoutFrame, 'image/jpeg'))->toBeNull();
});

it('refuses a PNG chunk whose length is not the one the format fixes', function (string $type, string $payload): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $iend = strlen($plain) - 12;
    $noisy = substr($plain, 0, $iend).scrubberPngChunk($type, $payload).substr($plain, $iend);

    expect(ImageScrubber::clean($noisy, 'image/png'))->toBeNull();
})->with([
    'gAMA of 100' => ['gAMA', str_pad('MARKERTEXT', 100, 'x')],
    'sRGB of 10' => ['sRGB', 'MARKERTEXT'],
    'cHRM of 10' => ['cHRM', 'MARKERTEXT'],
    'cICP of 10' => ['cICP', 'MARKERTEXT'],
    'acTL of 10' => ['acTL', 'MARKERTEXT'],
    'fcTL of 10' => ['fcTL', 'MARKERTEXT'],
    'PLTE not a multiple of 3' => ['PLTE', 'MARKERTEXT'],
    'PLTE of 771' => ['PLTE', str_repeat("\0", 771)],
    'tRNS of 300' => ['tRNS', str_repeat("\0", 300)],
]);

it('refuses an IEND that carries a payload', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $noisy = substr($plain, 0, -12).scrubberPngChunk('IEND', 'MARKERTEXT');

    expect(ImageScrubber::clean($noisy, 'image/png'))->toBeNull();
});

it('refuses a PNG that repeats a chunk that may appear once', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $iend = strlen($plain) - 12;
    $twice = scrubberPngChunk('gAMA', "\0\0\xB1\x8F").scrubberPngChunk('gAMA', "\0\0\xB1\x8F");

    expect(ImageScrubber::clean(substr($plain, 0, $iend).$twice.substr($plain, $iend), 'image/png'))->toBeNull();
});

it('drops a PNG colour profile, as it does for the others', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $iend = strlen($plain) - 12;
    $noisy = substr($plain, 0, $iend).scrubberPngChunk('iCCP', "icc\0\0".gzcompress('MARKERTEXT')).substr($plain, $iend);

    $clean = ImageScrubber::clean($noisy, 'image/png');

    expect($clean['bytes'])->not->toContain('iCCP')
        ->and(scrubberPixels($clean['bytes']) === scrubberPixels($plain))->toBeTrue();
});

it('refuses a PNG without IHDR first or without any image data', function (): void {
    $plain = scrubberEncode(scrubberImage(), 'png');
    $idat = strpos($plain, 'IDAT') - 4;
    $withoutData = substr($plain, 0, $idat).substr($plain, -12);
    $headerNotFirst = substr($plain, 0, 8).scrubberPngChunk('gAMA', "\0\0\xB1\x8F").substr($plain, 8);

    expect(ImageScrubber::clean($withoutData, 'image/png'))->toBeNull()
        ->and(ImageScrubber::clean($headerNotFirst, 'image/png'))->toBeNull();
});

it('rewrites a GIF graphic control and loop count to their fixed shape', function (): void {
    $withExtraBlocks = scrubberAnimatedGif();
    $withExtraBlocks = str_replace(
        ["\x21\xF9\x04\x00\x0A\x00\x00\x00", "NETSCAPE2.0\x03\x01\x00\x00\x00"],
        ["\x21\xF9\x04\x00\x0A\x00\x00\x06MARKER\x00", "NETSCAPE2.0\x03\x01\x00\x00\x0AMARKERTEXT\x00"],
        $withExtraBlocks,
    );

    expect($withExtraBlocks)->toContain('MARKERTEXT');

    $clean = ImageScrubber::clean($withExtraBlocks, 'image/gif');

    expect($clean)->not->toBeNull()
        ->and($clean['bytes'])->toBe(scrubberAnimatedGif())
        ->and($clean['bytes'])->not->toContain('MARKER');
});

it('drops a GIF graphic control or loop count that is not the shape it has to be', function (): void {
    $odd = str_replace(
        ["\x21\xF9\x04\x00\x0A\x00\x00\x00", "NETSCAPE2.0\x03\x01\x00\x00\x00"],
        ["\x21\xF9\x09MARKERTEX\x00", "NETSCAPE2.0\x09MARKERTEX\x00"],
        scrubberAnimatedGif(),
    );

    $clean = ImageScrubber::clean($odd, 'image/gif');

    expect($clean['bytes'])->not->toContain('MARKER')
        ->and(substr_count($clean['bytes'], "\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x00"))->toBe(2);
});

it('reads a GIF that stops after a whole block without its trailer', function (): void {
    $gif = scrubberEncode(scrubberImage(), 'gif');

    $clean = ImageScrubber::clean(substr($gif, 0, -1), 'image/gif');

    expect($clean)->not->toBeNull()
        ->and(substr($clean['bytes'], -1))->toBe(';')
        ->and(scrubberPixels($clean['bytes']) === scrubberPixels($gif))->toBeTrue();
});

/** A WebP with an animation chunk and one frame whose payload carries an extra chunk. */
function scrubberAnimatedWebp(string $inFrame): string
{
    $still = substr(scrubberEncode(scrubberImage(), 'webp'), 12);
    $chunk = fn (string $type, string $data): string => $type.pack('V', strlen($data)).$data.(strlen($data) & 1 ? "\0" : '');

    $frame = "\0\0\0\0\0\0".substr(pack('V', 31), 0, 3).substr(pack('V', 15), 0, 3).substr(pack('V', 100), 0, 3)."\0".$inFrame.$still;
    $vp8x = chr(0x02)."\0\0\0".substr(pack('V', 31), 0, 3).substr(pack('V', 15), 0, 3);
    $body = 'WEBP'.$chunk('VP8X', $vp8x).$chunk('ANIM', "\0\0\0\0\0\0").$chunk('ANMF', $frame);

    return 'RIFF'.pack('V', strlen($body)).$body;
}

it('keeps only the header and the image chunks inside a WebP animation frame', function (): void {
    $extra = 'EXIF'.pack('V', 12).'MARKERTEXT!!';

    $clean = ImageScrubber::clean(scrubberAnimatedWebp($extra), 'image/webp');

    expect(scrubberAnimatedWebp($extra))->toContain('MARKERTEXT')
        ->and($clean)->not->toBeNull()
        ->and($clean['bytes'])->not->toContain('MARKERTEXT')
        ->and($clean['bytes'])->toBe(scrubberAnimatedWebp(''))
        ->and([$clean['width'], $clean['height']])->toBe([32, 16]);
});

it('refuses a WebP whose chunks do not have the shape their names say', function (string $name, string $webp): void {
    expect(ImageScrubber::clean($webp, 'image/webp'))->toBeNull();
})->with(function (): array {
    $still = scrubberEncode(scrubberImage(), 'webp');
    $riff = fn (string $body): string => 'RIFF'.pack('V', strlen($body) + 4).'WEBP'.$body;
    $body = substr($still, 12);

    return [
        'VP8 without its start code' => ['a', $riff('VP8 '.pack('V', 12).str_repeat("\0", 12))],
        'VP8L without its signature' => ['b', $riff('VP8L'.pack('V', 12).str_repeat("\0", 12))],
        'VP8X of the wrong size' => ['c', $riff('VP8X'.pack('V', 12).str_repeat("\0", 12).$body)],
        'two images' => ['d', $riff($body.$body)],
        'ANIM of the wrong size' => ['e', $riff('ANIM'.pack('V', 12).str_repeat("\0", 12).$body)],
    ];
});

/* ---- How big a picture may say it is ------------------------------------- */

/** A real PNG with the sizes in its header replaced. The CRC is left stale, as a hostile file would. */
function scrubberPngDeclaring(int $width, int $height): string
{
    $png = scrubberEncode(scrubberImage(), 'png');

    return substr($png, 0, 16).pack('NN', $width, $height).substr($png, 24);
}

it('refuses a picture that declares a size no viewer should be asked to allocate', function (int $width, int $height): void {
    expect(ImageScrubber::clean(scrubberPngDeclaring($width, $height), 'image/png'))->toBeNull();
})->with([
    '30000 x 30000' => [30000, 30000],
    '2^32 - 1 wide' => [0xFFFFFFFF, 1],
    '2^31 - 1 both ways' => [0x7FFFFFFF, 0x7FFFFFFF],
    'zero wide' => [0, 16],
    'zero high' => [16, 0],
    'one side over the limit' => [10001, 1],
    'just over 40 megapixels' => [10000, 4001],
]);

it('accepts a picture at the edge of what is allowed', function (): void {
    $clean = ImageScrubber::clean(scrubberPngDeclaring(10000, 4000), 'image/png');

    expect($clean)->not->toBeNull()
        ->and([$clean['width'], $clean['height']])->toBe([10000, 4000]);
});

it('applies the same limits to a GIF and a JPEG', function (): void {
    $gif = scrubberEncode(scrubberImage(), 'gif');
    $huge = substr($gif, 0, 6).pack('vv', 0, 0).substr($gif, 10);
    $jpeg = scrubberEncode(scrubberImage(), 'jpeg');
    $sof = strpos($jpeg, "\xFF\xC0") + 5;
    $tall = substr($jpeg, 0, $sof).pack('nn', 40000, 40000).substr($jpeg, $sof + 4);

    expect(ImageScrubber::clean($huge, 'image/gif'))->toBeNull()
        ->and(ImageScrubber::clean($tall, 'image/jpeg'))->toBeNull();
});
