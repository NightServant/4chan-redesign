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

afterEach(() => {
    cleanup();
});
