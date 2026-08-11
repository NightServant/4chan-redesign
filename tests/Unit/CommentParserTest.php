<?php

declare(strict_types=1);

use App\Services\FourChan\CommentParser;

/*
|--------------------------------------------------------------------------
| CommentParser
|--------------------------------------------------------------------------
|
| `com` is the only attacker-shaped field in the ingest, so these tests split
| into two halves: the constructs that live data actually contains (every
| fixture below is copied from a real 2026-08-11 response, abridged), and the
| adversarial input that live data does not contain but a compromised or
| spoofed upstream could.
|
| The contract in both halves is the same: `body` is plain text. No tags, no
| entities, ever.
|
*/

function parseComment(?string $com): array
{
    return (new CommentParser)->parse($com);
}

function parseBody(?string $com): string
{
    return parseComment($com)['body'];
}

function parseQuotes(?string $com): array
{
    return parseComment($com)['quotes'];
}

/*
|--------------------------------------------------------------------------
| Absent and empty input
|--------------------------------------------------------------------------
*/

test('an image-only post has no com at all and parses to nothing', function () {
    expect(parseComment(null))->toBe(['body' => '', 'quotes' => []]);
});

test('an empty or whitespace-only com parses to nothing', function (string $com) {
    expect(parseComment($com))->toBe(['body' => '', 'quotes' => []]);
})->with(['', '   ', "\r\n", '<br>']);

/*
|--------------------------------------------------------------------------
| Line breaks
|--------------------------------------------------------------------------
*/

test('a br becomes a newline', function () {
    expect(parseBody('one<br>two<br>three'))->toBe("one\ntwo\nthree");
});

test('the CRLF 4chan writes after a br is source formatting, not a second break', function () {
    // Verbatim shape of the /g/ sticky. Every raw newline in the sampled
    // corpus sat directly after a `<br>`; none appeared anywhere else.
    $com = "This board is for the discussion of technology and related topics.<br>\r\n<br>\r\nReminder that flame wars will result in a ban.";

    expect(parseBody($com))->toBe("This board is for the discussion of technology and related topics.\n\nReminder that flame wars will result in a ban.");
});

test('a self-closing br is still one newline', function () {
    expect(parseBody('one<br/>two<br />three'))->toBe("one\ntwo\nthree");
});

/*
|--------------------------------------------------------------------------
| Soft-wrap hints
|--------------------------------------------------------------------------
*/

test('a wbr inside a URL is removed without leaving a space', function () {
    $com = 'https://github.com/comfyanonymous/C<wbr>omfyUI';

    expect(parseBody($com))->toBe('https://github.com/comfyanonymous/ComfyUI');
});

test('several wbr in one line all rejoin', function () {
    $com = 'https://desuarchive.org/a/thread/28<wbr>9518886/<br>https://desuarchive.org/a/thread/28<wbr>9543551/';

    expect(parseBody($com))->toBe("https://desuarchive.org/a/thread/289518886/\nhttps://desuarchive.org/a/thread/289543551/");
});

/*
|--------------------------------------------------------------------------
| Greentext
|--------------------------------------------------------------------------
*/

test('greentext keeps its leading angle bracket, because that is how the renderer knows', function () {
    $com = '<span class="quote">&gt;UI</span>';

    expect(parseBody($com))->toBe('>UI');
});

test('consecutive greentext lines each keep their marker', function () {
    $com = '<span class="quote">&gt;install CUDA</span><br><span class="quote">&gt;install ROCm</span><br>works fine';

    expect(parseBody($com))->toBe(">install CUDA\n>install ROCm\nworks fine");
});

/*
|--------------------------------------------------------------------------
| Quotelinks
|--------------------------------------------------------------------------
*/

test('a same-thread quotelink yields its number and its visible text', function () {
    $com = '<a href="#p109521369" class="quotelink">&gt;&gt;109521369</a><br>this';

    expect(parseComment($com))->toBe([
        'body' => ">>109521369\nthis",
        'quotes' => [109521369],
    ]);
});

test('a board-relative quotelink yields its number too', function () {
    $com = 'Previous: <a href="/g/thread/109520422#p109520422" class="quotelink">&gt;&gt;109520422</a>';

    expect(parseComment($com))->toBe([
        'body' => 'Previous: >>109520422',
        'quotes' => [109520422],
    ]);
});

test('the rel attribute 4chan adds to some quotelinks changes nothing', function () {
    $com = '<a href="/g/thread/109513893#p109513893" rel="nofollow ugc" class="quotelink">&gt;&gt;109513893</a>';

    expect(parseQuotes($com))->toBe([109513893]);
});

test('a cross-board quotelink keeps its text but is never a quote, because its target is not in this thread', function () {
    $com = 'Crypto belongs on <a href="//boards.4chan.org/biz/" class="quotelink">&gt;&gt;&gt;/biz/</a>';

    expect(parseComment($com))->toBe([
        'body' => 'Crypto belongs on >>>/biz/',
        'quotes' => [],
    ]);
});

test('a cross-board catalog quotelink is not a quote', function () {
    $com = '<a href="//boards.4chan.org/b/catalog#s=degen" class="quotelink">&gt;&gt;&gt;/b/degen</a>';

    expect(parseQuotes($com))->toBe([]);
});

test('a cross-board thread quotelink is not a quote either, even though it names a post', function () {
    // Live: `//boards.4chan.org/vr/thread/12747412#p12747414`. The href ends
    // in `#p…` exactly like a local quote, so only the host tells them apart.
    $com = '<a href="//boards.4chan.org/vr/thread/12747412#p12747414" class="quotelink">&gt;&gt;12747414</a>';

    expect(parseComment($com))->toBe([
        'body' => '>>12747414',
        'quotes' => [],
    ]);
});

test('an absolute quotelink on any scheme is not a quote', function (string $href) {
    $com = '<a href="'.$href.'" class="quotelink">&gt;&gt;1</a>';

    expect(parseQuotes($com))->toBe([]);
})->with([
    'https://boards.4chan.org/g/thread/1#p1',
    'http://boards.4chan.org/g/thread/1#p1',
    'javascript:alert(1)#p1',
    'data:text/html,#p1',
]);

test('a plain link is not a quotelink no matter where it points', function () {
    $com = 'The /g/ Wiki: <a href="https://igwiki.lyci.de/">https://igwiki.lyci.de/</a>';

    expect(parseComment($com))->toBe([
        'body' => 'The /g/ Wiki: https://igwiki.lyci.de/',
        'quotes' => [],
    ]);
});

test('a deadlink keeps its text but is not a quote, because the post it names is gone', function () {
    $com = '<span class="deadlink">&gt;&gt;109518834</span><br>and again.';

    expect(parseComment($com))->toBe([
        'body' => ">>109518834\nand again.",
        'quotes' => [],
    ]);
});

test('quotes are deduplicated but keep first-appearance order', function () {
    $com = '<a href="#p300" class="quotelink">&gt;&gt;300</a> <a href="#p100" class="quotelink">&gt;&gt;100</a> <a href="#p300" class="quotelink">&gt;&gt;300</a>';

    expect(parseQuotes($com))->toBe([300, 100]);
});

test('quotes come back as a list, so json_encode writes an array and not an object', function () {
    $com = '<a href="#p1" class="quotelink">a</a><a href="#p2" class="quotelink">b</a><a href="#p1" class="quotelink">c</a>';

    expect(json_encode(parseQuotes($com)))->toBe('[1,2]');
});

/*
|--------------------------------------------------------------------------
| Entities
|--------------------------------------------------------------------------
*/

test('entities decode to their characters', function () {
    $com = '&gt; &lt; &amp; &quot; &#039; &#x27; &nbsp;';

    expect(parseBody($com))->toBe("> < & \" ' ' \u{00A0}");
});

test('entities decode exactly once, so double-encoded input stays visible as text', function () {
    // `&amp;gt;` is the literal text `&gt;`. Decoding twice would silently
    // turn it into `>` and manufacture a greentext line that nobody wrote.
    expect(parseBody('&amp;gt;not greentext'))->toBe('&gt;not greentext');
});

test('a decoded entity never reopens as markup', function () {
    $com = '&lt;script&gt;alert(1)&lt;/script&gt;';

    expect(parseBody($com))->toBe('<script>alert(1)</script>')
        ->and(parseQuotes($com))->toBe([]);
});

/*
|--------------------------------------------------------------------------
| Code, spoilers and other formatting
|--------------------------------------------------------------------------
*/

test('a code block flattens to its lines with indentation intact', function () {
    // `[code]` arrives as `<pre class="prettyprint">` with `<br>` inside it.
    $com = '<pre class="prettyprint">def f(n):<br>    return n<br></pre>';

    expect(parseBody($com))->toBe("def f(n):\n    return n");
});

test('a spoiler contributes its text', function () {
    $com = '<s>Laios still wearing the gorget.</s>';

    expect(parseBody($com))->toBe('Laios still wearing the gorget.');
});

/*
|--------------------------------------------------------------------------
| Blank lines
|--------------------------------------------------------------------------
*/

test('blank lines between paragraphs survive, since that is how posts are shaped', function () {
    expect(parseBody('one<br><br>two'))->toBe("one\n\ntwo");
});

test('leading and trailing blank lines are trimmed away', function () {
    expect(parseBody('<br><br>  body  <br><br>'))->toBe('body');
});

/*
|--------------------------------------------------------------------------
| Malformed markup — live data contains this
|--------------------------------------------------------------------------
*/

test('nested anchors, which live data really contains, do not swallow the text', function () {
    $com = 'Tech support goes to <a href="https://boards.4chan.org/wsr/"><a href="//boards.4chan.org/wsr/" class="quotelink">&gt;&gt;&gt;/wsr/</a></a>';

    expect(parseComment($com))->toBe([
        'body' => 'Tech support goes to >>>/wsr/',
        'quotes' => [],
    ]);
});

test('an unclosed tag still yields its text', function () {
    expect(parseBody('before <span class="quote">&gt;after'))->toBe('before >after');
});

test('a stray closing tag with no opener is ignored', function () {
    expect(parseBody('text</span></div></b>more'))->toBe('textmore');
});

test('deeply nested tags do not blow the stack or lose the payload', function () {
    $com = str_repeat('<b><i><span>', 200).'deep'.str_repeat('</span></i></b>', 200);

    expect(parseBody($com))->toBe('deep');
});

test('an unterminated tag is not mistaken for content', function () {
    expect(parseBody('visible <span class="quote'))->toBe('visible');
});

/*
|--------------------------------------------------------------------------
| Adversarial input
|--------------------------------------------------------------------------
*/

test('a script element never reaches the body', function () {
    $com = 'Hello<script>alert(1)</script> world';
    $body = parseBody($com);

    expect($body)->toBe('Hello world')
        ->and($body)->not->toContain('alert');
});

test('markup that survived as attributes is never emitted', function (string $com) {
    $body = parseBody($com);

    expect($body)->not->toContain('<')
        ->and($body)->not->toContain('onerror')
        ->and($body)->not->toContain('javascript:');
})->with([
    '<img src=x onerror="alert(1)">caption',
    '<div onclick="alert(1)">click</div>',
    '<a href="javascript:alert(1)" class="quotelink">&gt;&gt;1</a>',
    '<svg/onload=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<style>body{background:url(javascript:alert(1))}</style>',
]);

test('the body of any live or hostile com is free of tags and entities', function (string $com) {
    $body = parseBody($com);

    expect($body)->not->toMatch('/<[a-zA-Z\/!]/')
        ->and($body)->not->toMatch('/&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#[xX][0-9a-fA-F]{1,6});/');
})->with([
    'plain text',
    '<span class="quote">&gt;greentext</span><br><a href="#p1" class="quotelink">&gt;&gt;1</a>',
    '<script>alert("<b>x</b>")</script>',
    '<img src=x onerror=alert(1)>',
    '<b><i>unclosed',
    'C<wbr>omfyUI &amp; friends',
    '<!-- a comment --><![CDATA[cdata]]>text',
]);

test('a quotelink whose number is not a number yields no quote', function (string $href) {
    $com = '<a href="'.$href.'" class="quotelink">&gt;&gt;x</a>';

    expect(parseQuotes($com))->toBe([]);
})->with([
    '#pabc',
    '#p',
    '#p12a3',
    '#p-1',
    '#p 1',
    '#p1.5',
    '#p0',
    '/g/thread/abc#pabc',
    '',
]);

test('an absurdly long quote number is rejected rather than saturating an int', function () {
    $com = '<a href="#p'.str_repeat('9', 40).'" class="quotelink">&gt;&gt;9</a>';

    expect(parseQuotes($com))->toBe([]);
});

test('an anchor without the quotelink class is never a quote, however it is dressed', function (string $class) {
    $com = '<a href="#p123" class="'.$class.'">&gt;&gt;123</a>';

    expect(parseQuotes($com))->toBe([]);
})->with(['', 'quote', 'quotelinkextra', 'deadlink']);

test('an extra class alongside quotelink still counts', function () {
    $com = '<a href="#p123" class="quotelink dead">&gt;&gt;123</a>';

    expect(parseQuotes($com))->toBe([123]);
});

test('an anchor with no attributes at all is handled', function () {
    expect(parseComment('<a>bare</a>'))->toBe(['body' => 'bare', 'quotes' => []]);
});

test('a comment node is not content', function () {
    expect(parseBody('before<!-- <a href="#p9" class="quotelink">hidden</a> -->after'))->toBe('beforeafter');
});

/*
|--------------------------------------------------------------------------
| A whole real post
|--------------------------------------------------------------------------
*/

test('a real post from /g/ round-trips into text plus quotes', function () {
    $com = 'Discussion and Development<br><br>Previous: <a href="/g/thread/109520422#p109520422" class="quotelink">&gt;&gt;109520422</a><br><span class="quote">&gt;UI</span><br>https://github.com/comfyanonymous/C<wbr>omfyUI';

    expect(parseComment($com))->toBe([
        'body' => "Discussion and Development\n\nPrevious: >>109520422\n>UI\nhttps://github.com/comfyanonymous/ComfyUI",
        'quotes' => [109520422],
    ]);
});

test('non-ASCII text survives intact', function () {
    $com = 'ダンジョン飯 — “quoted” — café<br>émoji 🍀';

    expect(parseBody($com))->toBe("ダンジョン飯 — “quoted” — café\némoji 🍀");
});
