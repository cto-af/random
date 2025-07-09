/**
 * Weak fill-in for node's assert, to keep this module node-free.
 *
 * @param x Assert that this is truthy.
 * @param message Message for exception.
 * @throws If x is falsy.
 */
export function assert(x: unknown, message?: string): asserts x {
  if (!x) {
    const m = message ?? 'Invalid assertion';
    throw new Error(m);
  }
}

export default assert;

/**
 * Throw if x !== y.
 *
 * @template T Same type.
 * @param x Anything.
 * @param y Anything.
 * @param message Message for exception.
 * @throws If x !== y.
 */
export function equal<T>(x: T, y: T, message?: string): void {
  if (x !== y) {
    let m = `${x} !== ${y}`;
    if (message) {
      m += `: ${message}`;
    }
    throw new Error(m);
  }
}

assert.equal = equal;
