<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        @php($meta = \App\Support\PageMetadata::for($page))

        {{--
            The social card, and a description, rendered by the server.

            Inertia's <Head> writes these from the page component, which means
            they exist only once JavaScript has run. Every social crawler there
            is -- Slack, Facebook, X, LinkedIn -- fetches the HTML and reads it
            without executing anything, so a link to Clover previewed as a bare
            URL with no image and no text. `PageMeta` still refines these per
            page for browsers and for SSR; what is here is the floor, and it is
            the part a crawler actually sees.

            `head-key` matches the names `PageMeta` uses, so Inertia replaces
            these rather than appending a second copy of each.

            These were one string for the whole site until `PageMetadata`
            landed: every URL served the same title and the same description,
            so the twenty-six distinct titles written in the page components
            reached browsers and nothing else. They are resolved per page now,
            from the same props the component renders.
        --}}
        <meta head-key="description" name="description" content="{{ $meta['description'] }}">
        <meta head-key="og:site_name" property="og:site_name" content="{{ config('app.name') }}">
        <meta head-key="og:type" property="og:type" content="{{ $meta['type'] }}">
        <meta head-key="og:title" property="og:title" content="{{ $meta['socialTitle'] }}">
        <meta head-key="og:description" property="og:description" content="{{ $meta['description'] }}">
        <meta head-key="og:url" property="og:url" content="{{ url()->current() }}">
        <meta head-key="og:image" property="og:image" content="{{ url('/og.png') }}">
        <meta head-key="twitter:card" name="twitter:card" content="summary_large_image">
        <meta head-key="twitter:title" name="twitter:title" content="{{ $meta['socialTitle'] }}">
        <meta head-key="twitter:description" name="twitter:description" content="{{ $meta['description'] }}">
        <meta head-key="twitter:image" name="twitter:image" content="{{ url('/og.png') }}">

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $meta['title'] }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
