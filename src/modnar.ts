import type {FreqArray, Vose} from './vose.js';
import {type RandBytes, Random} from './index.js';
import assert from './assert.js';

export type {
  FreqArray,
  Vose,
};

/**
 * Run "Random" backwards to inject data into a faux "random" number generator.
 * This "random" source can then be used to have Random generate known data
 * for testing.
 */
export class Modnar {
  #record: [Uint8Array, string][] = [];
  #spareGauss: number | null = null;
  #realRandom: Random | null = null;

  public get source(): RandBytes {
    return this.#playback.bind(this);
  }

  public get isDone(): boolean {
    if (this.#record.length !== 0) {
      throw new Error(this.toString());
    }
    return true;
  }

  get #random(): Random {
    if (!this.#realRandom) {
      // Lazy, only used for gauss.
      this.#realRandom = new Random();
    }
    return this.#realRandom;
  }

  public drop(reason: string): void {
    const rec = this.#record.shift();
    if (!rec) {
      throw new Error("Can't drop from empty");
    }
    assert.equal(reason, rec[1]);
  }

  public bytes(buf: Uint8Array, reason = 'unspecified'): void {
    this.#record.push([buf, reason]);
  }

  public uInt32(i: number, reason = 'unspecified'): void {
    const b = new Uint8Array(4);
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    dv.setUint32(0, i, false);
    this.bytes(b, `uInt32,${reason}`);
  }

  public upto(i: number, size: number, reason = 'unspecified'): void {
    if (size !== 0) {
      this.uInt32(i, `upto(${size}),${reason}`);
    }
  }

  public uBigInt(n: number, _bytes: Uint8Array, reason = 'unspecified'): void {
    assert(n >= 0n);

    let str = n.toString(16);
    if (str.length % 2 !== 0) {
      str = `0${str}`;
    }

    function x(o: number): number {
      const c = str.charCodeAt(o);
      return (c & 0xf) + (9 * (c >> 6));
    }

    const buf = Uint8Array.from(
      {length: str.length / 2},
      (_v, i) => (x(i * 2) << 4) | x((i * 2) + 1)
    );
    this.bytes(buf, `uBigInt,${reason}`);
  }

  public random(n: number, reason = 'unspecified'): void {
    if (n < 0 || n >= 1) {
      throw new Error(`Invalid range: ${n}`);
    }
    const buf = new Uint8Array(8);
    new DataView(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength
    ).setFloat64(0, 1 + n, true);
    this.bytes(buf, `random,${reason}`);
  }

  // Run this in the forward direction, but keep track of the intermediate
  // values.
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

  public pick<T>(m: T, ary: FreqArray<T>, reason = 'unspecified'): void {
    const i = ary.indexOf(m);
    if (i === -1) {
      throw new Error(`not found: ${m} in ${ary}`);
    }
    const freqs = ary[Random._VOSE_SYM];
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
      return;
    }
    this.upto(i, ary.length, `pick(${ary.length}),${reason}`);
  }

  public bool(tf: boolean, reason = 'unspecified'): void {
    this.upto(Number(tf), 2, `bool,${reason}`);
  }

  public some(found: string, ary: string, reason?: string): void;
  public some<T = any>(found: T, ary: T[], reason?: string): void;
  public some<T = any>(
    found: string | T[],
    ary: string | T[],
    reason = 'unspecified'
  ): void {
    // Won't work for arrays/strings with repeated items
    if (typeof ary === 'string') {
      ary = [...ary] as T[];
    }
    if (typeof found === 'string') {
      found = [...found] as T[];
    }
    ary.forEach(c => this.bool(found.includes(c), `some,${reason}`));
  }

  public toString(): string {
    return `Modnar pending ${this.#record}`;
  }

  #playback(num: number, reason = 'unspecified'): Uint8Array {
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
    if (reason !== origReason) {
      throw new Error(
        `Invalid reason "${reason}", expected "${origReason}" (${num} bytes).`
      );
    }
    return buf;
  }
}
