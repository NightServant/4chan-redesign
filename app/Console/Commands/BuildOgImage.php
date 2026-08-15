<?php

declare(strict_types=1);

namespace App\Console\Commands;

use GdImage;
use Illuminate\Console\Command;

/**
 * Draws the social preview card at `public/og.png`.
 *
 * A build step rather than a request-time render. The card is the same for
 * every page — see `PageMeta` for why per-page cards were not worth a font
 * stack and an image route — so it is generated once, committed, and served as
 * a static file.
 *
 * ## Why the type is not Space Grotesk
 *
 * Clover ships its faces as `woff2`, which is the right format for a browser
 * and the one format GD's FreeType cannot open. Converting them needs a
 * toolchain this project does not have and should not grow for one image, so
 * the card is set in a system face passed on the command line, defaulting to
 * the closest geometric sans macOS carries.
 *
 * That is a real difference from the site's own type and it is written down
 * here rather than left for someone to notice in a diff. The colours, the
 * matrix and the rules are all the design system's own values.
 */
class BuildOgImage extends Command
{
    protected $signature = 'clover:og-image
        {--font= : Path to a TTF/TTC to set the card in}
        {--out=public/og.png : Where to write the PNG}';

    protected $description = 'Draw the social preview card at public/og.png';

    /** Facebook, X, LinkedIn and Slack all crop to roughly 1.91:1. */
    private const WIDTH = 1200;

    private const HEIGHT = 630;

    /** The same 24px module as `--pattern-size-dense`, at the card's scale. */
    private const DOT_SPACING = 24;

    /** Where the type starts, and how much room it has before the frame. */
    private const MARGIN = 96;

    /**
     * Candidates, in order. The first that exists wins.
     *
     * A list rather than one path because this runs on whichever machine is
     * regenerating the card, and a hard-coded font that is missing fails at
     * the last step of a long command.
     */
    private const FONT_CANDIDATES = [
        '/System/Library/Fonts/Avenir Next.ttc',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ];

    public function handle(): int
    {
        $font = $this->font();

        if ($font === null) {
            $this->error('No usable font. Pass one with --font=/path/to/font.ttf');

            return self::FAILURE;
        }

        $canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT);

        if ($canvas === false) {
            $this->error('GD could not allocate the canvas.');

            return self::FAILURE;
        }

        if (! $this->paint($canvas, $font)) {
            imagedestroy($canvas);

            $this->error('GD refused a colour. The canvas is not truecolor.');

            return self::FAILURE;
        }

        $out = base_path((string) $this->option('out'));

        imagepng($canvas, $out);
        imagedestroy($canvas);

        $this->info("Wrote {$out}");

        return self::SUCCESS;
    }

    /**
     * Draws one line, shrinking it until it fits the column.
     *
     * The first version of this card set every line at a size chosen by eye,
     * and "Without the 2003 interface." ran 130px off the right-hand edge --
     * in a file nothing renders in review and nobody opens after the first
     * time. Measuring is four lines of code and it is the difference between
     * a card that is right and a card that is right today.
     */
    private function write(
        GdImage $canvas,
        string $font,
        string $line,
        int $size,
        int $baseline,
        int $colour,
    ): void {
        $available = self::WIDTH - (self::MARGIN * 2);

        while ($size > 8 && $this->widthOf($font, $size, $line) > $available) {
            $size--;
        }

        imagettftext($canvas, $size, 0, self::MARGIN, $baseline, $colour, $font, $line);
    }

    /**
     * Null when GD refuses, which a truecolor canvas never does.
     *
     * @param  int<0, 255>  $red
     * @param  int<0, 255>  $green
     * @param  int<0, 255>  $blue
     */
    private function colour(GdImage $canvas, int $red, int $green, int $blue): ?int
    {
        $allocated = imagecolorallocate($canvas, $red, $green, $blue);

        return $allocated === false ? null : $allocated;
    }

    private function widthOf(string $font, int $size, string $line): int
    {
        $box = imagettfbbox($size, 0, $font, $line);

        if ($box === false) {
            return 0;
        }

        return (int) abs($box[2] - $box[0]);
    }

    private function font(): ?string
    {
        $given = $this->option('font');

        if (is_string($given) && $given !== '') {
            return is_readable($given) ? $given : null;
        }

        foreach (self::FONT_CANDIDATES as $candidate) {
            if (is_readable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * The card itself: dark field, the dot matrix, a ruled frame, the
     * wordmark, the thesis, and the three things Clover does not do.
     */
    private function paint(GdImage $canvas, string $font): bool
    {
        /* The dark theme's own tokens, converted from OKLCH once. Kept as
           literals because GD has no colour space and re-deriving them per
           render would be three transcendental functions for a fixed value. */
        $bg = $this->colour($canvas, 8, 10, 9);
        $dot = $this->colour($canvas, 40, 46, 42);
        $border = $this->colour($canvas, 27, 36, 30);
        $text = $this->colour($canvas, 242, 245, 242);
        $muted = $this->colour($canvas, 154, 163, 156);
        $faint = $this->colour($canvas, 117, 128, 122);
        $primary = $this->colour($canvas, 52, 199, 111);

        /* Only reachable on a palette image, and this canvas is truecolor.
           Checked rather than assumed, because the alternative is writing a
           card drawn in whatever colour GD substituted. */
        if (
            $bg === null || $dot === null || $border === null || $text === null
            || $muted === null || $faint === null || $primary === null
        ) {
            return false;
        }

        imagefilledrectangle($canvas, 0, 0, self::WIDTH, self::HEIGHT, $bg);

        for ($x = 0; $x < self::WIDTH; $x += self::DOT_SPACING) {
            for ($y = 0; $y < self::HEIGHT; $y += self::DOT_SPACING) {
                imagefilledellipse($canvas, $x, $y, 3, 3, $dot);
            }
        }

        /* The ruled frame every band on the site sits inside. */
        imagerectangle($canvas, 48, 48, self::WIDTH - 49, self::HEIGHT - 49, $border);

        $this->write($canvas, $font, 'CLOVER', 22, 150, $primary);
        $this->write($canvas, $font, 'The same boards.', 74, 290, $text);
        $this->write($canvas, $font, 'Without the 2003 interface.', 74, 380, $text);
        $this->write($canvas, $font, 'Anonymous discussion, organised by board.', 28, 460, $muted);

        imageline($canvas, self::MARGIN, 500, self::WIDTH - self::MARGIN, 500, $border);

        $this->write($canvas, $font, 'No profiles  ·  No algorithm  ·  No ads', 22, 545, $faint);

        return true;
    }
}
