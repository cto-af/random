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

export default assert;

/**
 * Throw if x !== y.
 *
 * @template T Same type.
 * @param x Anything.
 * @param y Anything.
 * @throws If x !== y.
 */
export function equal<T>(x: T, y: T): void {
  if (x !== y) {
    throw new Error(`${x} !== ${y}`);
  }
}

assert.equal = equal;
