#!/usr/bin/env node

/**
 * @fileoverview Core streaming engine — poll-and-diff loop with clean teardown
 * @module src/cli/lib/stream-engine
 *
 * Provides a generic async polling loop that:
 *  - Calls a fetcher function at a configurable interval
 *  - Passes results through an optional differ to detect changes
 *  - Calls onData with changed data
 *  - Calls onError with errors (without crashing the loop)
 *  - Exposes a stop() method for clean teardown via signal handlers
 */

/**
 * Create a streaming poll loop.
 *
 * @param {object} options
 * @param {number} options.interval - Poll interval in milliseconds
 * @param {function(): Promise<any>} options.fetcher - Async function called each cycle
 * @param {function(any, any): any} [options.differ] - Diff function
 *        `(currentData, previousSnapshot) => truthy if changed`.
 *        The return value (truthy/falsy) determines whether onData is called.
 * @param {function(any): void} options.onData - Callback when the differ detects a change.
 *        Receives the current data.
 * @param {function(Error): void} [options.onError] - Error callback.
 *        Receives the error. The loop continues after calling this.
 * @returns {{ stop: function, promise: Promise<void> }}
 */
export function createStream({ interval, fetcher, differ, onData, onError }) {
  let snapshot = null;
  let running = true;

  const loop = async () => {
    while (running) {
      try {
        const data = await fetcher();
        const diff = differ ? differ(data, snapshot) : data !== snapshot;
        if (diff) {
          snapshot = data;
          onData(data);
        }
      } catch (err) {
        if (onError) onError(err);
      }

      // Only sleep if still running — avoids extra delay after stop()
      if (running) {
        await sleep(interval);
      }
    }
  };

  const promise = loop();

  return {
    /** Stop the polling loop. The promise will resolve after the current cycle. */
    stop: () => {
      running = false;
    },
    /** Promise that resolves when the loop exits. */
    promise
  };
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
