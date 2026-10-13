<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Takes the personal details out of an uploaded image without touching its
 * pixels.
 *
 * A phone photo carries the place it was taken, the device, the time and
 * sometimes a thumbnail of the uncropped original, and the product's claim is
 * that a post carries nothing that points back at its author. So the file is
 * rewritten keeping only the pieces a decoder needs, each checked against the
 * size that piece has to be, and cutting everything after the image's own end
 * marker, which is also where a polyglot hides the second file it is
 * pretending to be.
 *
 * Done by walking the container rather than decoding and re-encoding because
 * the runtime has no image library: vercel-php 0.8.0 ships `exif` and
 * `fileinfo` but not `gd`. It is also lossless, and keeps animation.
 *
 * Each cleaner returns null for input it cannot parse end to end, and the
 * caller treats that as "not an image Clover accepts". Nothing here trusts a
 * length field without checking it against what is left. The picture's own
 * size is bounded as well (`MAX_SIDE`, `MAX_PIXELS`): a few hundred bytes can
 * declare a canvas every viewer's browser would try to allocate.
 *
 * What survives, by format:
 *   JPEG  a whitelist of segments: frame header, tables, restart interval,
 *         scans, and Adobe's APP14 rewritten to its one meaningful byte (it
 *         says how to read CMYK). Every other segment goes, the EXIF one
 *         included. If that EXIF had an orientation other than the default, a
 *         new segment holding that one tag is written, so a sideways photo
 *         still displays upright.
 *   PNG   the chunks a decoder needs, at the lengths the format fixes for
 *         them: header, palette, transparency, data, animation, colour.
 *   GIF   frames, with the graphic control and loop-count extensions rewritten
 *         to their fixed shape.
 *   WebP  image, alpha and animation chunks, with the EXIF, XMP and ICC flags
 *         cleared; inside an animation frame only the frame header and its
 *         image chunks.
 *
 * Not kept: the orientation of a PNG or WebP (browsers do not agree on it for
 * those), and any embedded colour profile.
 *
 * ponytail: this is a whitelist over the container, not a decode, so it cannot
 * remove bytes that sit where the format allows arbitrary data: the
 * entropy-coded scan of a JPEG (and anything between the last scan and the end
 * marker, which a decoder reads as more scan), PNG and APNG `IDAT`/`fdAT`, GIF
 * image data and palettes, a WebP `VP8 `/`VP8L` body, and the quantisation and
 * Huffman tables of a JPEG. Someone who controls the encoder can put a payload
 * in those and it will be stored and served. Ordinary files, and anything a
 * camera or an editor writes, carry their metadata outside them. What limits
 * the damage: `nosniff` and a fixed image type on every response, so it is
 * never run as anything but an image; the 4MB file limit; and the per-account
 * and total quotas. The upgrade is decoding and re-encoding, which needs `gd`
 * or `imagick` on the runtime.
 */
final class ImageScrubber
{
    /** The longest side and the most pixels an image may declare. */
    public const MAX_SIDE = 10_000;

    public const MAX_PIXELS = 40_000_000;

    /** The most pieces of a JPEG, bar its scans, that are kept. A real file has a dozen. */
    private const JPEG_SEGMENTS = 512;

    /** PNG chunks whose length the format fixes. */
    private const PNG_FIXED = [
        'IHDR' => 13, 'IEND' => 0,
        'gAMA' => 4, 'cHRM' => 32, 'sRGB' => 1, 'cICP' => 4,
        'acTL' => 8, 'fcTL' => 26,
    ];

    /** PNG chunks that may appear once, and the most bytes each can hold. */
    private const PNG_ONCE = [
        'tRNS' => 256, 'bKGD' => 6, 'sBIT' => 4,
    ];

    /**
     * The file's bytes without metadata, its size on screen, or null when it
     * cannot be read as the format it claims.
     *
     * @return array{bytes: string, width: int, height: int}|null
     */
    public static function clean(string $bytes, string $mime): ?array
    {
        $cleaned = match ($mime) {
            'image/jpeg', 'image/pjpeg' => self::jpeg($bytes),
            'image/png', 'image/apng', 'image/vnd.mozilla.apng' => self::png($bytes),
            'image/gif' => self::gif($bytes),
            'image/webp' => self::webp($bytes),
            default => null,
        };

        if ($cleaned === null) {
            return null;
        }

        [$out, $orientation] = $cleaned;
        $size = @getimagesizefromstring($out);

        if ($size === false) {
            return null;
        }

        [$width, $height] = $size;

        if ($width < 1 || $height < 1 || $width > self::MAX_SIDE || $height > self::MAX_SIDE || $width * $height > self::MAX_PIXELS) {
            return null;
        }

        /* Orientations 5 to 8 turn the picture a quarter, so the browser shows
           it with the sides swapped. The size recorded is the size shown. */
        $turned = $orientation >= 5;

        return [
            'bytes' => $out,
            'width' => $turned ? $height : $width,
            'height' => $turned ? $width : $height,
        ];
    }

    /**
     * @return array{0: string, 1: int}|null the file and its EXIF orientation
     */
    private static function jpeg(string $b): ?array
    {
        $n = strlen($b);

        if (! str_starts_with($b, "\xFF\xD8")) {
            return null;
        }

        $out = '';
        $orientation = 1;
        $pos = 2;
        $segments = 0;
        $framed = false;
        $scanned = false;

        while ($pos < $n) {
            if ($b[$pos] !== "\xFF") {
                return null;
            }

            while ($pos < $n && $b[$pos] === "\xFF") {
                $pos++;
            }

            $marker = ord($b[$pos] ?? "\0");
            $pos++;

            if ($marker === 0xD9) {
                return $framed && $scanned
                    ? ["\xFF\xD8".self::jpegOrientationSegment($orientation).$out."\xFF\xD9", $orientation]
                    : null;
            }

            if ($marker === 0x00) {
                return null;
            }

            /* Markers with no length. Restarts belong inside a scan, which is
               handled below; out here they and the rest mean nothing. */
            if ($marker === 0x01 || ($marker >= 0xD0 && $marker <= 0xD8)) {
                continue;
            }

            if ($pos + 2 > $n) {
                return null;
            }

            $length = (ord($b[$pos]) << 8) | ord($b[$pos + 1]);
            $end = $pos + $length;

            if ($length < 2 || $end > $n) {
                return null;
            }

            $payload = substr($b, $pos + 2, $length - 2);

            if ($marker === 0xE1 && $orientation === 1 && str_starts_with($payload, "Exif\0\0")) {
                $orientation = self::exifOrientation(substr($payload, 6));
            }

            $segment = null;

            if ($marker >= 0xC0 && $marker <= 0xCF && ! in_array($marker, [0xC4, 0xC8, 0xCC], true)) {
                /* Start of frame: 8 bytes, then 3 per component. */
                if ($length < 8 || $length !== 8 + 3 * ord($payload[5])) {
                    return null;
                }

                $framed = true;
                $segment = substr($b, $pos, $length);
            } elseif (in_array($marker, [0xC4, 0xCC, 0xDB], true)) {
                $segment = substr($b, $pos, $length);
            } elseif ($marker === 0xDD || $marker === 0xDC) {
                if ($length !== 4) {
                    return null;
                }

                $segment = substr($b, $pos, $length);
            } elseif ($marker === 0xDA) {
                /* Start of scan: 6 bytes, then 2 per component. */
                if (! $framed || $length < 6 || $length !== 6 + 2 * ord($payload[0])) {
                    return null;
                }

                $scanned = true;
                $segment = substr($b, $pos, $length);
            } elseif ($marker === 0xEE && $length === 14 && str_starts_with($payload, 'Adobe') && ord($payload[11]) <= 2) {
                /* Version, flags and the colour transform: only the last says
                   anything, so the rest is written as the usual values. */
                $segment = "\x00\x0EAdobe\x00\x64\x00\x00\x00\x00".$payload[11];
            }

            $pos = $end;

            if ($segment !== null) {
                if ($marker !== 0xDA && ++$segments > self::JPEG_SEGMENTS) {
                    return null;
                }

                $out .= "\xFF".chr($marker).$segment;
            }

            /* The entropy-coded data after a scan header runs on to the next
               marker that is not a stuffed 0xFF00 or a restart. */
            if ($marker === 0xDA) {
                $found = false;
                $at = $pos;

                while ($at < $n) {
                    $mark = strpos($b, "\xFF", $at);

                    if ($mark === false) {
                        break;
                    }

                    $next = ord($b[$mark + 1] ?? "\0");

                    if ($next !== 0x00 && ($next < 0xD0 || $next > 0xD7)) {
                        $found = $mark;

                        break;
                    }

                    $at = $mark + 2;
                }

                if ($found === false) {
                    return null;
                }

                $out .= substr($b, $pos, $found - $pos);
                $pos = $found;
            }
        }

        return null;
    }

    /** The one EXIF tag worth keeping, as a segment of its own, or nothing. */
    private static function jpegOrientationSegment(int $orientation): string
    {
        if ($orientation < 2 || $orientation > 8) {
            return '';
        }

        /* Big-endian TIFF, one IFD with one entry: tag 0x0112, type SHORT, count 1. */
        $exif = "Exif\0\0MM\0*\0\0\0\x08\0\x01\x01\x12\0\x03\0\0\0\x01".pack('n', $orientation)."\0\0\0\0\0\0";

        return "\xFF\xE1".pack('n', strlen($exif) + 2).$exif;
    }

    /** An unsigned integer at an offset, 0 when the bytes run out. */
    private static function number(string $format, string $b, int $at): int
    {
        if ($at < 0 || $at + strlen(pack($format, 0)) > strlen($b)) {
            return 0;
        }

        $value = unpack($format, $b, $at);

        return $value === false ? 0 : (int) $value[1];
    }

    /** IFD0's orientation from a TIFF block, 1 when absent or unreadable. */
    private static function exifOrientation(string $tiff): int
    {
        $order = substr($tiff, 0, 2);

        if (($order !== 'II' && $order !== 'MM') || strlen($tiff) < 8) {
            return 1;
        }

        $little = $order === 'II';
        $short = fn (int $at): int => self::number($little ? 'v' : 'n', $tiff, $at);
        $long = fn (int $at): int => self::number($little ? 'V' : 'N', $tiff, $at);

        $ifd = $long(4);
        $count = $short($ifd);

        for ($i = 0; $i < $count && $i < 64; $i++) {
            $entry = $ifd + 2 + $i * 12;

            if ($short($entry) === 0x0112 && $short($entry + 2) === 3) {
                $value = $short($entry + 8);

                return $value >= 1 && $value <= 8 ? $value : 1;
            }
        }

        return 1;
    }

    /**
     * @return array{0: string, 1: int}|null
     */
    private static function png(string $b): ?array
    {
        $n = strlen($b);

        if (! str_starts_with($b, "\x89PNG\r\n\x1A\n")) {
            return null;
        }

        $out = substr($b, 0, 8);
        $pos = 8;
        $seen = [];
        $data = false;

        while ($pos + 12 <= $n) {
            $length = self::number('N', $b, $pos);
            $type = substr($b, $pos + 4, 4);
            $next = $pos + 12 + $length;

            if ($next > $n || ($pos === 8) !== ($type === 'IHDR')) {
                return null;
            }

            $keep = self::pngKeeps($type, $length);

            if ($keep === false || ($keep === true && isset($seen[$type]) && $type !== 'fcTL' && $type !== 'IDAT' && $type !== 'fdAT')) {
                return null;
            }

            if ($keep === true) {
                $seen[$type] = true;
                $data = $data || $type === 'IDAT';
                $out .= substr($b, $pos, 12 + $length);
            }

            if ($type === 'IEND') {
                return $data ? [$out, 1] : null;
            }

            $pos = $next;
        }

        return null;
    }

    /** Whether a PNG chunk is kept: true, dropped (null), or the wrong length for what it is (false). */
    private static function pngKeeps(string $type, int $length): ?bool
    {
        if (isset(self::PNG_FIXED[$type])) {
            return $length === self::PNG_FIXED[$type];
        }

        if (isset(self::PNG_ONCE[$type])) {
            return $length <= self::PNG_ONCE[$type];
        }

        return match ($type) {
            'PLTE' => $length >= 3 && $length <= 768 && $length % 3 === 0,
            'IDAT' => true,
            'fdAT' => $length >= 4,
            default => null,
        };
    }

    /**
     * @return array{0: string, 1: int}|null
     */
    private static function gif(string $b): ?array
    {
        $n = strlen($b);

        if ($n < 14 || ! in_array(substr($b, 0, 6), ['GIF87a', 'GIF89a'], true)) {
            return null;
        }

        $pos = 13 + (ord($b[10]) & 0x80 ? 3 * (2 << (ord($b[10]) & 7)) : 0);

        if ($pos > $n) {
            return null;
        }

        $out = substr($b, 0, $pos);
        $frames = 0;

        /* A file that stops after a whole block without its trailer is read
           as finished; the trailer is written either way. */
        while ($pos < $n && $b[$pos] !== ';') {
            $start = $pos;

            if ($b[$pos] === ',') {
                $flags = ord($b[$pos + 9] ?? "\0");
                $pos = self::gifSkipBlocks($b, $pos + 11 + ($flags & 0x80 ? 3 * (2 << ($flags & 7)) : 0));

                if ($pos === null) {
                    return null;
                }

                $out .= substr($b, $start, $pos - $start);
                $frames++;

                continue;
            }

            if ($b[$pos] !== '!') {
                return null;
            }

            $label = ord($b[$pos + 1] ?? "\0");
            $pos = self::gifSkipBlocks($b, $pos + 2);

            if ($pos === null) {
                return null;
            }

            $out .= self::gifExtension($b, $start, $pos, $label);
        }

        return $frames > 0 ? [$out.';', 1] : null;
    }

    /**
     * An extension in its one fixed shape, or nothing.
     *
     * Timing and transparency (a 4-byte block) and the loop count (an 11-byte
     * name and a 3-byte block) are rewritten from their meaningful bytes, so
     * further sub-blocks tacked on after them go. Comments, plain text and
     * every other application block (XMP among them) go whole.
     */
    private static function gifExtension(string $b, int $start, int $end, int $label): string
    {
        if ($label === 0xF9) {
            return ord($b[$start + 2] ?? "\0") === 4 && $start + 8 <= $end
                ? "\x21\xF9\x04".substr($b, $start + 3, 4)."\x00"
                : '';
        }

        $name = substr($b, $start + 3, 11);

        if ($label === 0xFF
            && ord($b[$start + 2] ?? "\0") === 11
            && in_array($name, ['NETSCAPE2.0', 'ANIMEXTS1.0'], true)
            && $start + 19 <= $end
            && ord($b[$start + 14]) === 3
            && ord($b[$start + 15]) === 1) {
            return "\x21\xFF\x0B".$name."\x03".substr($b, $start + 15, 3)."\x00";
        }

        return '';
    }

    /** The position after a run of GIF sub-blocks and their terminator. */
    private static function gifSkipBlocks(string $b, int $pos): ?int
    {
        $n = strlen($b);

        while ($pos < $n) {
            $length = ord($b[$pos]);
            $pos += $length + 1;

            if ($length === 0) {
                return $pos <= $n ? $pos : null;
            }
        }

        return null;
    }

    /**
     * @return array{0: string, 1: int}|null
     */
    private static function webp(string $b): ?array
    {
        $n = strlen($b);

        if ($n < 20 || ! str_starts_with($b, 'RIFF') || substr($b, 8, 4) !== 'WEBP') {
            return null;
        }

        $end = 8 + self::number('V', $b, 4);

        if ($end > $n) {
            return null;
        }

        $chunks = '';
        $seen = [];
        $pos = 12;

        while ($pos + 8 <= $end) {
            $type = substr($b, $pos, 4);
            $size = self::number('V', $b, $pos + 4);
            $next = $pos + 8 + $size + ($size & 1);

            if ($pos + 8 + $size > $end) {
                return null;
            }

            $data = substr($b, $pos + 8, $size);

            $kept = match ($type) {
                /* 0xD3 is every bit but the ICC (0x20), EXIF (0x08) and XMP (0x04)
                   flags: the chunks they announce are gone. */
                'VP8X' => $size === 10 ? chr(ord($data[0]) & 0xD3).substr($data, 1) : false,
                'ANIM' => $size === 6 ? $data : false,
                'ANMF' => self::webpFrame($data),
                'ALPH', 'VP8 ', 'VP8L' => self::webpImageChunk($type, $data),
                default => null,
            };

            if ($kept === false || ($kept !== null && $type !== 'ANMF' && isset($seen[$type]))) {
                return null;
            }

            if ($kept !== null) {
                $seen[$type] = true;
                $chunks .= self::riffChunk($type, $kept);
            }

            $pos = $next;
        }

        $image = isset($seen['VP8 ']) || isset($seen['VP8L']) || isset($seen['ANMF']);

        return $image ? ['RIFF'.pack('V', 4 + strlen($chunks)).'WEBP'.$chunks, 1] : null;
    }

    /**
     * One animation frame: its 16-byte header and the image chunks inside it.
     * Anything else in there, an EXIF chunk for one, goes.
     */
    private static function webpFrame(string $data): string|false
    {
        $n = strlen($data);

        if ($n < 16) {
            return false;
        }

        $out = substr($data, 0, 16);
        $pos = 16;
        $image = false;

        while ($pos + 8 <= $n) {
            $type = substr($data, $pos, 4);
            $size = self::number('V', $data, $pos + 4);

            if ($pos + 8 + $size > $n) {
                return false;
            }

            $kept = in_array($type, ['ALPH', 'VP8 ', 'VP8L'], true)
                ? self::webpImageChunk($type, substr($data, $pos + 8, $size))
                : null;

            if ($kept === false) {
                return false;
            }

            if ($kept !== null) {
                $image = $image || $type !== 'ALPH';
                $out .= self::riffChunk($type, $kept);
            }

            $pos += 8 + $size + ($size & 1);
        }

        return $image ? $out : false;
    }

    /**
     * An image chunk, if its body at least starts the way that kind of body
     * must. How long the body really is cannot be told without decoding it
     * (see the note on the class), so what follows the signature is not
     * bounded.
     */
    private static function webpImageChunk(string $type, string $data): string|false
    {
        $size = strlen($data);

        return match ($type) {
            'ALPH' => $size >= 1 ? $data : false,
            'VP8 ' => $size >= 10 && substr($data, 3, 3) === "\x9D\x01\x2A" ? $data : false,
            default => $size >= 5 && $data[0] === "\x2F" ? $data : false,
        };
    }

    private static function riffChunk(string $type, string $data): string
    {
        return $type.pack('V', strlen($data)).$data.(strlen($data) & 1 ? "\0" : '');
    }
}
