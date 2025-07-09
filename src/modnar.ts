import {type FreqArray, VOSE_SYM, type Vose} from './vose.js';
import {type RandBytes, Random} from './index.js';
import assert from './assert.js';

export type {
  FreqArray,
  Vose,
};

function u8toHex(u8: Uint8Array): string {
  return u8.reduce((t, v) => t + v.toString(16).padStart(2, '0'), '0x');
}

function u8dv(size: number): [Uint8Array, DataView] {
  const a = new ArrayBuffer(size);
  return [
    new Uint8Array(a),
    new DataView(a),
  ];
}

/**
 * Run "Random" backwards to inject data into a faux "random" number generator.
 * This "random" source can then be used to have Random generate known data
 * for testing.
 *
 * @example
 * ```js
 * import {Modnar} from '@cto.af/random/modnar'
 * import {Random} from '@cto.af/random'
 * const m = new Modnar();
 * const r = new Random(m.source);
 * m.uInt32(1);
 * r.uInt32(); // 1
 * ```
 */
export class Modnar {
  #record: [Uint8Array, string][] = [];
  #spareGauss: number | null = null;
  #realRandom: Random | null = null;

  /**
   * Source of "random" bytes suitable for passing in to the Random constructor.
   * @returns Function that returns "random" data.
   */
  public get source(): RandBytes {
    // Separate method so bind can be automatic.
    return this.#playback.bind(this);
  }

  /**
   * Asserts that there is no longer data to read.
   *
   * @returns True if no data left to read.
   * @throws If data left to read.
   */
  public get isDone(): boolean {
    if (this.#record.length !== 0) {
      throw new Error(this.toString());
    }
    return true;
  }

  /**
   * Lazy, only used for gauss.
   *
   * @returns Singleton Random instance.
   */
  get #random(): Random {
    if (!this.#realRandom) {
      this.#realRandom = new Random();
    }
    return this.#realRandom;
  }

  /**
   * Drop the next entry in the queue without processing.
   *
   * @param reason If specified, ensure the reason matches the dropped item.
   * @throws If there is no data left.
   */
  public drop(reason?: string): void {
    const rec = this.#record.shift();
    if (!rec) {
      throw new Error("Can't drop from empty");
    }
    if (reason !== undefined) {
      assert.equal(reason, rec[1]);
    }
  }

  /**
   * Push bytes into the queue with a given reason.
   *
   * @param buf Byte array to push.
   * @param reason Reason for bytes.
   */
  public bytes(buf: Uint8Array, reason = 'unspecified'): void {
    this.#record.push([buf, reason]);
  }

  /**
   * Push the bytes associated with a number.
   *
   * @param i 32-bit unsigned integer.
   * @param reason Reason for generation.
   * @throws If i < 0, >= 2^32 or not an integer.
   */
  public uInt32(i: number, reason = 'unspecified'): void {
    assert(Number.isInteger(i), 'Not integer');
    assert(i >= 0, 'Must be non-negative');
    assert(i <= 0xffffffff, 'Must be valid 32-bit uInt');
    const [u8, dv] = u8dv(4);
    dv.setUint32(0, i, false);
    this.bytes(u8, `uInt32,${reason}`);
  }

  /**
   * Push the bytes for an integer less than size.
   *
   * @param i Number to generate bytes for.
   * @param size Maximum size.
   * @param reason Reason for generation.
   */
  public upto(i: number, size: number, reason = 'unspecified'): void {
    assert(Number.isInteger(i), 'Not integer');
    assert(i >= 0, 'Must be non-negative');
    assert(i <= 0xffffffff, 'Must be valid 32-bit uInt');
    assert(Number.isInteger(size), 'Not integer');
    assert(size >= 0, 'Must be non-negative');
    assert(size <= 0xffffffff, 'Must be valid 32-bit uInt');
    assert((i < size) || ((i === 0) && (size === 0)), 'Must be less than size');
    if (size !== 0) {
      this.uInt32(i, `upto(${size}),${reason}`);
    }
  }

  /**
   * Push bytes for the givein bigint.
   *
   * @param n Non-negative bigint.
   * @param bytes Number of bytes expected.
   * @param reason Reason for generation.
   */
  public uBigInt(n: bigint, bytes?: number, reason = 'unspecified'): void {
    assert.equal(typeof n, 'bigint');
    assert(n >= 0n, 'Must be non-negative');

    const str = n.toString(16);
    const length = Math.ceil(str.length / 2);
    if (bytes !== undefined) {
      assert.equal(bytes, length, 'Expected number of bytes');
    }
    if (bytes !== undefined) {
      assert(Number.isInteger(bytes));
      assert(bytes > 0);
      assert.equal(bytes, length);
    }

    const buf = Uint8Array.from(
      {length},
      (_v, i) => {
        const ret = n >> (BigInt(length - i - 1) * 8n);
        return Number(ret & 0xffn);
      }
    );
    this.bytes(buf, `${length},uBigInt,${reason}`);
  }

  /**
   * Push bytes for a random number (0,1].
   *
   * @param n Number to generate bytes for.
   * @param reason Reason for generation.
   */
  public random(n: number, reason = 'unspecified'): void {
    assert.equal(typeof n, 'number');
    assert(n >= 0, 'Positive');
    assert(n < 1, 'Range (0, 1]');
    const [u8, dv] = u8dv(8);
    dv.setFloat64(0, 1 + n, true);
    this.bytes(u8, `random,${reason}`);
  }

  /**
   * Run this in the forward direction, but keep track of the intermediate
   * values.
   *
   * @param mean Midpoint.
   * @param stdDev Width.
   * @param reason Why generated?
   * @returns Number from the distribution.
   */
  public gauss(mean: number, stdDev: number, reason = 'unspecified'): number {
    if (this.#spareGauss != null) {
      const ret = mean + (stdDev * this.#spareGauss);
      this.#spareGauss = null;
      return ret;
    }
    let v1 = 0;
    let v2 = 0;
    let r1 = 0;
    let r2 = 0;
    let s = 0;
    const r = this.#random;
    do {
      r1 = r.random(reason);
      r2 = r.random(reason);
      v1 = (2 * r1) - 1;
      v2 = (2 * r2) - 1;
      s = (v1 * v1) + (v2 * v2);
    } while (s >= 1);

    // This is a miniscule edge case that is 1 in 2^63 or something
    /* c8 ignore start */
    if (s === 0) {
      return mean;
    }

    /* c8 ignore stop */
    this.random(r1, reason);
    this.random(r2, reason);
    s = Math.sqrt(-2.0 * Math.log(s) / s);
    this.#spareGauss = v2 * s;
    return mean + (stdDev * v1 * s);
  }

  /**
   * Generate the bytes from picking an item from an array.  Does not work
   * well for arrays with duplicate items.
   *
   * @param m Item to select.
   * @param ary Array to select from.
   * @param reason Reason for generation.
   */
  public pick<T>(m: T, ary: FreqArray<T>, reason = 'unspecified'): void {
    const i = ary.indexOf(m);
    assert(i >= 0, 'Item not found');

    const freqs = ary[VOSE_SYM];
    if (freqs) {
      // Reverse the Vose.  If i is in the alias table, coin was tails and
      // that side came up on the die.  If not, we got heads on die roll of i.
      const [_prob, alias] = freqs._tables;
      const a = alias.indexOf(i);
      if (a === -1) {
        this.upto(i, ary.length, `Vose.pick.die(${ary.length}),${reason}`);
        this.random(0, `Vose.pick.flip,${reason}`);
      } else {
        this.upto(a, ary.length, `Vose.pick.die(${ary.length}),${reason}`);
        this.random(1 - Number.EPSILON, `Vose.pick.flip,${reason}`);
      }
    } else {
      this.upto(i, ary.length, `pick(${ary.length}),${reason}`);
    }
  }

  /**
   * Generate bytes for a boolean.
   *
   * @param tf Boolean.
   * @param reason Reason fro generation.
   */
  public bool(tf: boolean, reason = 'unspecified'): void {
    this.upto(Number(tf), 2, `bool,${reason}`);
  }

  /**
   * Generate the bytes for selecting 0+ from an array, or 0+ chars from a
   * string.  Won't work for found array having repeats.
   *
   * @param found The items that were found.
   * @param ary Array to select from.
   * @param reason Reason for generation.
   */
  public some(found: string, ary: string, reason?: string): void;
  public some<T = any>(found: T[], ary: T[], reason?: string): void;
  public some<T = any>(
    found: string | T[],
    ary: string | T[],
    reason = 'unspecified'
  ): void {
    if (typeof ary === 'string') {
      ary = [...ary] as T[];
    }
    if (typeof found === 'string') {
      found = [...found] as T[];
    }
    ary.forEach(c => this.bool(found.includes(c), `some,${reason}`));
  }

  /**
   * Debug string.
   *
   * @returns Debug string.
   */
  public toString(): string {
    return `Modnar pending [${this.#record.map(([b, r]) => `\n  [${u8toHex(b)}, "${r}"],`).join('')}\n]`;
  }

  /**
   * Debug string for node.
   *
   * @returns Debug string for node.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.toString();
  }

  #playback(num: number, reason?: string): Uint8Array {
    const rec = this.#record.shift();
    if (!rec) {
      throw new Error(`Out of playback data (${num}): "${reason}"`);
    }
    const [buf, origReason] = rec;
    if (buf.length !== num) {
      const r = (reason === origReason) ?
        `"${reason}"` :
        `"${reason}" != "${origReason}"`;
      throw new Error(`Expected ${num} bytes, got ${buf.length}.  (${r})`);
    }
    if ((reason !== undefined) && (reason !== origReason)) {
      throw new Error(
        `Invalid reason "${reason}", expected "${origReason}" (${num} bytes).`
      );
    }
    return buf;
  }
}
