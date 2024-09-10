import {Vose} from './vose.js';
import {assert} from './assert.js';

const FREQ_SYM = Symbol('FREQS');

/**
 * Function to generate random bytes.  This is pluggable to allow for testing,
 * but I bet someone else will find a reason to use it.
 */
export type RandBytes = (size: number, reason: string) => Uint8Array;

export type FreqArray<T> = T[] & {
  [FREQ_SYM]?: number[];
};

/**
 * Default RNG that uses crypto.randomBytes.
 * @param size Number of bytes.
 * @param reason Reason the bytes were requested.
 * @returns Random bytes.
 */
export const randBytes: RandBytes = (
  size: number, reason: string
): Uint8Array => {
  assert(reason);
  const array = new Uint8Array(size);

  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  return crypto.getRandomValues(array);
};

/**
 * Random number generation with pluggable source.
 * @private
 */
export class Random {
  public static FREQS = FREQ_SYM;

  // Method `gauss` generates two numbers each time.
  #spareGauss: number | null = null;
  #source: RandBytes;
  #freqs = new WeakMap<any[], Vose>();

  /**
   * Create.
   *
   * @param source Random source.
   */
  public constructor(source: RandBytes = randBytes) {
    this.#source = source;
  }

  static #view(bytes: Uint8Array): DataView {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /**
   * Wrapper around source.randBytes to default the reason.
   *
   * @param num Number of bytes to generate.
   * @param reason Reason for generation.
   * @returns The random bytes.
   */
  public bytes(num: number, reason = 'unspecified'): Uint8Array {
    return this.#source(num, reason);
  }

  /**
   * Random unsigned 32-bit integer.
   *
   * @param {string} [reason='unspecified'] Reason for generation.
   * @returns {number} The random number.
   */
  public uInt32(reason = 'unspecified'): number {
    const bytes = this.bytes(4, `uInt32,${reason}`);
    return Random.#view(bytes).getUint32(0, false);
  }

  /**
   * Generate a random positive integer less than a given number.
   *
   * @param num One more than the maximum number generated.
   * @param reason Reason for generation.
   * @returns The random number.
   */
  public upto(num: number, reason = 'unspecified'): number {
    if (num === 0) {
      return 0;
    }
    return (this.uInt32(`upto(${num}),${reason}`) % num);
  }

  /**
   * Random positive BigInt.
   *
   * @param bytes The number of bytes to generate.
   * @param reason Reason for generation.
   * @returns The random number.
   */
  public uBigInt(bytes: number, reason = 'unspecified'): bigint {
    const buf = this.bytes(bytes, `uBigInt,${reason}`);
    let ret = 0n;
    for (const b of buf) {
      ret = (ret << 8n) + BigInt(b);
    }
    return ret;
  }

  /**
   * Generate a random number (0,1].
   *
   * @param reason Reason for generation.
   * @returns The random number.
   */
  public random(reason = 'unspecified'): number {
    const buf = this.bytes(8, `random,${reason}`);
    // Little-endian float64.  Set sign bit to 0, and exponent to 511
    // (1.0 + mantissa).  This avoids subnormals etc.
    buf[6] |= 0xf0;
    buf[7] = 0x3f;
    return Random.#view(buf).getFloat64(0, true) - 1.0;
  }

  /**
   * Generate a random number with close to gaussian distribution.
   * Uses the polar method for normal deviates, which generates two
   * numbers at a time.  Saves the second number for next time in a way
   * that a different mean and standard deviation can be used on each
   * call.
   *
   * @param mean The mean for the set of numbers generated.
   * @param stdDev The standard deviation for the set of numbers
   *   generated.
   * @param reason Reason for generation.
   * @returns The random number.
   */
  public gauss(mean: number, stdDev: number, reason = 'unspecified'): number {
    // See: https://stackoverflow.com/a/60476586/8388 or
    // Section 3.4.1 of Donald Knuth's book The Art of Computer Programming
    if (this.#spareGauss != null) {
      const ret = mean + (stdDev * this.#spareGauss);
      this.#spareGauss = null;
      return ret;
    }
    let v1 = 0;
    let v2 = 0;
    let s = 0;
    do {
      v1 = (2 * this.random(reason)) - 1;
      v2 = (2 * this.random(reason)) - 1;
      s = (v1 * v1) + (v2 * v2);
    } while (s >= 1);
    if (s === 0) {
      return mean;
    }
    s = Math.sqrt(-2.0 * Math.log(s) / s);
    this.#spareGauss = v2 * s;
    return mean + (stdDev * v1 * s);
  }

  /**
   * Pick an arbitrary element from the specified array.
   *
   * @param ary Array to pick from, MUST NOT be empty.
   * @param reason Reason reason for generation.
   * @returns {T} The selected array element.
   */
  public pick<T>(ary: FreqArray<T>, reason = 'unspecified'): T {
    assert(ary.length > 0);

    const weights = ary[FREQ_SYM];
    if (weights) {
      let freqs = this.#freqs.get(ary);
      if (!freqs) {
        freqs = new Vose(weights, this);
        this.#freqs.set(ary, freqs);
      }
      return ary[freqs.pick(reason)];
    }
    return ary[this.upto(ary.length, `pick(${ary.length}),${reason}`)];
  }

  /**
   * Flip a coin, true or false.
   *
   * @param reason Reason for generation.
   * @returns Generated.
   */
  public bool(reason = 'unspecified'): boolean {
    return Boolean(this.upto(2, `bool,${reason}`));
  }

  /**
   * Pick zero or more of the array elements or string characters.
   *
   * @template T
   * @param ary Pool to select from.
   * @param reason Reason for generation.
   * @returns The selected string characters (concatenated) or the selected
   *   array elements.
   */
  public some(ary: string, reason: string): string;
  public some<T>(ary: T[], reason: string): T[];
  public some<T>(ary: string | T[], reason = 'unspecified'): string | T[] {
    if (typeof ary === 'string') {
      return [...ary].filter(() => this.bool(`some,${reason}`)).join('');
    }
    return ary.filter(() => this.bool(`some,${reason}`));
  }
}
