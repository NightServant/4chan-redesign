import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * jsdom implements neither of these, and the libraries we build overlays on
 * call them during mount: cmdk observes its list box for resize, and both cmdk
 * and Radix scroll the highlighted row into view. Without them the component
 * throws on render, which surfaces as every test in the file failing for a
 * reason unrelated to what it was asserting.
 *
 * They live here rather than in each test file because a second suite needed
 * them, which is the point at which copies start drifting.
 */
if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    };
}

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

/**
 * `input-otp` probes for the element under the caret on a timer, and jsdom has
 * no `elementFromPoint`. Because the probe fires from a timer rather than from
 * render, it throws *after* the test that triggered it has already finished:
 * the failure lands in whichever file happens to be running next, or surfaces
 * as an unhandled rejection with no test attached to it.
 *
 * That made it read as flake. Two separate suites hit it independently before
 * it was traced here, which is exactly the drift the shims above exist to stop.
 */
if (!document.elementFromPoint) {
    document.elementFromPoint = (): null => null;
}

afterEach(() => {
    cleanup();
});
