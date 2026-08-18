import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Resolved on demand, not at module load.
 *
 * This was a module-level `window.matchMedia(...)` call, which meant simply
 * *importing* anything that transitively reached this hook threw
 * `window.matchMedia is not a function` in jsdom — an environment that has a
 * `window` but no `matchMedia`. One component adopting this hook took three
 * unrelated suites down with it, none of which had anything to say about
 * viewports.
 */
function mediaQueryList(): MediaQueryList | undefined {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return undefined;
    }

    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

function mediaQueryListener(callback: (event: MediaQueryListEvent) => void) {
    const mql = mediaQueryList();

    if (!mql) {
        return () => {};
    }

    mql.addEventListener('change', callback);

    return () => {
        mql.removeEventListener('change', callback);
    };
}

function isSmallerThanBreakpoint(): boolean {
    return mediaQueryList()?.matches ?? false;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useIsMobile(): boolean {
    return useSyncExternalStore(
        mediaQueryListener,
        isSmallerThanBreakpoint,
        getServerSnapshot,
    );
}
