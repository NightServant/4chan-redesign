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

/**
 * Timers that outlive the test that scheduled them.
 *
 * `input-otp` schedules its caret probe with `setTimeout` and does not cancel
 * it on unmount, so `cleanup()` is not enough: the callback survives the test,
 * survives the file, and eventually fires against an environment vitest has
 * already torn down. What it reports is `ReferenceError: window is not
 * defined`, attributed to whichever file was running at the time, with no test
 * attached to it — a whole test run failing on one unhandled error while all
 * 835 tests pass.
 *
 * It is the same defect as the `elementFromPoint` shim above, one step later:
 * a timer-driven failure that cannot be traced to the test that caused it.
 * Tracking every timer and clearing what is still pending after each test is
 * the general fix, rather than special-casing the one suite that happens to
 * render an OTP field today.
 */
/* Node types `setTimeout` as returning `Timeout` and `clearTimeout` as taking
   one, while the DOM lib types both as `number`. The set holds whichever this
   environment actually produces. */
const pendingTimers = new Set<Parameters<typeof clearTimeout>[0]>();
const scheduleTimeout = globalThis.setTimeout;

globalThis.setTimeout = ((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
) => {
    const id = scheduleTimeout(handler, timeout, ...args);

    pendingTimers.add(id);

    return id;
}) as typeof globalThis.setTimeout;

afterEach(() => {
    cleanup();

    for (const id of pendingTimers) {
        clearTimeout(id);
    }

    pendingTimers.clear();
});
