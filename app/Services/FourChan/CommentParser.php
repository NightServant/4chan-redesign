<?php

declare(strict_types=1);

namespace App\Services\FourChan;

use Dom\Element;
use Dom\HTMLDocument;
use Dom\Node;
use Dom\Text;
use Throwable;

/**
 * Turns 4chan's `com` field into plain text and a list of quoted post numbers.
 *
 * `com` is HTML written by anonymous strangers. It is the only attacker-shaped
 * field in the whole ingest, so it is converted to text *here*, once, on the
 * way into the database — never on the way out to a template. Nothing this
 * class returns is ever markup: `body` carries no tags and no entities, which
 * is what lets `PostBody` render it as a plain string with no
 * `dangerouslySetInnerHTML` anywhere in the app.
 *
 * Parsing is done with PHP 8.4's `Dom\HTMLDocument`, a real HTML5 parser,
 * rather than regular expressions. 4chan's output is not well-formed — live
 * data contains nested `<a>` elements, which no regex untangles correctly and
 * which the HTML5 parser recovers from by specification. There is no error
 * path to suppress either, because the HTML5 spec has no parse errors: every
 * byte sequence produces a tree.
 *
 * What live data actually contains, verified against /g/ and /a/ (2,170 posts,
 * 2026-08-11):
 *
 * - `<br>`, sometimes followed by a literal CRLF that is source formatting
 *   rather than content — every raw newline in the corpus sat directly after
 *   a `<br>`, and none anywhere else.
 * - `<wbr>`, 479 of them, injected mid-token including inside URLs
 *   (`https://github.com/comfyanonymous/C<wbr>omfyUI`). Removed with no
 *   substitute, or every long link in the corpus is corrupted.
 * - `<span class="quote">&gt;text</span>` — greentext. The `>` is content, not
 *   decoration, and survives into `body` because that is how the renderer
 *   recognises a greentext line.
 * - `<span class="deadlink">&gt;&gt;123</span>` — a quote whose target is
 *   gone. Text survives; the number does not become a quote, see below.
 * - `<a class="quotelink">` in three href forms.
 * - `<pre class="prettyprint">` for `[code]`, `<s>` for spoilers.
 * - Entities `&gt;` `&lt;` `&amp;` `&quot;` `&#039;`. No double-encoding was
 *   found; the parser decodes exactly once regardless, so a double-encoded
 *   `&amp;gt;` correctly yields the literal text `&gt;` rather than `>`.
 *
 * @see https://a.4cdn.org
 */
final class CommentParser
{
    /**
     * Elements whose subtree is dropped rather than flattened to text.
     *
     * 4chan escapes `<` in user input, so a real `<script>` cannot reach us
     * from a poster — it could only arrive from a compromised or spoofed API
     * response. Either way its contents are program source, not something a
     * reader should see printed inside a post, so the subtree goes.
     */
    private const DISCARDED_ELEMENTS = ['script', 'style', 'template', 'noscript', 'iframe'];

    /**
     * Post numbers are 64-bit at most; anything longer is not a post number.
     *
     * Bounded deliberately. An unbounded `\d+` on attacker-controlled input
     * casts to a saturated or wrapped integer instead of being rejected.
     */
    private const QUOTE_NUMBER = '\d{1,18}';

    /**
     * @return array{body: string, quotes: list<int>}
     */
    public function parse(?string $com): array
    {
        // Image-only posts have no `com` key at all. That is ordinary, not an
        // error, and must not throw.
        if ($com === null || trim($com) === '') {
            return ['body' => '', 'quotes' => []];
        }

        $document = $this->load($com);

        if ($document === null) {
            return ['body' => '', 'quotes' => []];
        }

        $body = '';

        /** @var list<int> $quotes */
        $quotes = [];

        $this->collect($document->body ?? $document, $body, $quotes);

        return [
            'body' => $this->tidy($body),
            'quotes' => array_values(array_unique($quotes)),
        ];
    }

    /**
     * Parses the fragment, normalising the two whitespace quirks first.
     *
     * A newline directly after `<br>` is 4chan's own source formatting and
     * would otherwise double every line break. Stray carriage returns are
     * dropped outright. Text-node whitespace is left alone beyond that, so
     * indentation inside a `[code]` block survives.
     */
    private function load(string $com): ?HTMLDocument
    {
        $normalised = preg_replace('/(<br\s*\/?>)[\r\n]+/i', '$1', $com) ?? $com;
        $normalised = str_replace("\r\n", "\n", $normalised);
        $normalised = str_replace("\r", "\n", $normalised);

        try {
            return HTMLDocument::createFromString(
                '<!DOCTYPE html><html><body>'.$normalised.'</body></html>',
                LIBXML_NOERROR,
                'UTF-8',
            );
        } catch (Throwable) {
            // The HTML5 parser has no parse errors, so reaching this means
            // something structural — an encoding the document declares and
            // cannot be read in. An unrenderable post is better than a failed
            // sync of the thousands around it.
            return null;
        }
    }

    /**
     * Walks the tree, appending text and harvesting quote numbers as it goes.
     *
     * @param  list<int>  $quotes
     */
    private function collect(Node $node, string &$body, array &$quotes): void
    {
        foreach ($node->childNodes as $child) {
            if ($child instanceof Text) {
                $body .= $child->data;

                continue;
            }

            if (! $child instanceof Element) {
                // Comments, processing instructions, doctypes: not content.
                continue;
            }

            $name = strtolower($child->localName);

            if (in_array($name, self::DISCARDED_ELEMENTS, true)) {
                continue;
            }

            if ($name === 'br') {
                $body .= "\n";

                continue;
            }

            if ($name === 'wbr') {
                // A soft-wrap hint. Contributes nothing, not even a space —
                // it sits mid-token, so a space here splits URLs in half.
                continue;
            }

            if ($name === 'a') {
                $number = $this->quotedNumber($child);

                if ($number !== null) {
                    $quotes[] = $number;
                }
            }

            $this->collect($child, $body, $quotes);
        }
    }

    /**
     * The post number an anchor quotes, or null if it quotes nothing local.
     *
     * Two href forms point inside this thread's board and count:
     * `#p109520422` and `/g/thread/109520422#p109520422`. Every relative
     * `/{slug}/thread/…` href in the corpus named its own board, so the slug
     * is not re-checked here — the parser is handed a `com`, not a board.
     *
     * A host-absolute href is a cross-board quote
     * (`//boards.4chan.org/b/catalog#s=degen`, rendered `>>>/b/degen`). Its
     * target is not in this thread, so recording it would produce a reference
     * that resolves to nothing. Its visible text still reaches `body`.
     *
     * `<span class="deadlink">` is excluded for the same reason by never
     * being an anchor at all: the post it names has been deleted.
     */
    private function quotedNumber(Element $anchor): ?int
    {
        if (! $anchor->hasAttribute('class')) {
            return null;
        }

        $classes = preg_split('/\s+/', trim((string) $anchor->getAttribute('class'))) ?: [];

        if (! in_array('quotelink', $classes, true)) {
            return null;
        }

        $href = trim((string) $anchor->getAttribute('href'));

        // Two independent guards, deliberately overlapping. Either one alone
        // rejects every cross-board href in the corpus, which means a single
        // mistake in either cannot open the gate — mutating one and re-running
        // this file's tests leaves them green precisely because the other
        // still holds.
        //
        // First: scheme-relative (`//host/…`) or absolute (`https://host/…`)
        // is another board, or another site entirely.
        if (str_starts_with($href, '//') || preg_match('#^[a-z][a-z0-9+.-]*:#i', $href) === 1) {
            return null;
        }

        // Second: the href must be *entirely* a local quote. `\z` rather than
        // `$`, because `$` also matches before a trailing newline.
        if (preg_match('/^(?:\/[a-z0-9]+\/thread\/'.self::QUOTE_NUMBER.')?#p('.self::QUOTE_NUMBER.')\z/', $href, $matches) !== 1) {
            return null;
        }

        $number = (int) $matches[1];

        return $number > 0 ? $number : null;
    }

    /**
     * Trims the text without destroying the shape of the post.
     *
     * Trailing spaces on a line are always noise. Blank lines in the middle
     * are not — they are how imageboard posts separate paragraphs — so they
     * are kept, and left for the renderer to bound.
     */
    private function tidy(string $body): string
    {
        $lines = array_map(
            static fn (string $line): string => rtrim($line, " \t"),
            explode("\n", $body),
        );

        return trim(implode("\n", $lines));
    }
}
