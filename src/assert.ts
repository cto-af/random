/**
 * Weak fill-in for node's assert, to keep this module node-free.
 *
 * @param x Assert that this is truthy.
 * @throws If x is falsy.
 */
export function assert(x: unknown): asserts x {
  if (!x) {
    throw new Error('Invalid assertion');
  }
}
