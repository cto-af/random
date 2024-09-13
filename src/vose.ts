import type {Random} from './index.js';

/**
 * Vose's Alias Method.
 *
 * @see https://www.keithschwarz.com/darts-dice-coins/
 * @see https://en.wikipedia.org/wiki/Alias_method
 */
export class Vose {
  #alias: number[];
  #prob: number[];

  /**
   * Prepare the probability and alias tables.
   *
   * @param weights Relative weights, per pick array item.  If
   *   undefined, `1` is the default.
   */
  public constructor(weights: number[]) {
    // Vose is based on total probability === 1.
    let n = 0;
    const tot = weights.reduce((t, v) => {
      n++;
      v ??= 1;
      if (v < 0) {
        throw new Error(`All probabilities must be non-negative.  Got "${v}".`);
      }
      return t + v;
    }, 0);
    if (n !== weights.length) {
      // Sparse arrays skip their empty members, rather than mapping them
      // from undefined.
      throw new Error('Sparse array not allowed');
    }
    if ((tot === 0) && (n > 0)) {
      throw new Error('Total probability of 0.');
    }

    const scaled = weights.map(p => (p ?? 1) * n / tot);

    this.#alias = new Array(n);
    this.#prob = new Array(n);

    const small: number[] = [];
    const large: number[] = [];

    scaled.forEach((pi, i) => {
      ((pi < 1) ? small : large).push(i);
    });

    while (small.length && large.length) {
      const l = small.shift() as number;
      const g = large.shift() as number;
      this.#prob[l] = scaled[l];
      this.#alias[l] = g;
      scaled[g] = (scaled[g] + scaled[l]) - 1;
      ((scaled[g] < 1) ? small : large).push(g);
    }

    large.forEach(g => {
      this.#prob[g] = 1;
    });

    // This is only possible due to numerical instability.
    small.forEach(l => {
      this.#prob[l] = 1;
    });
  }

  /**
   * Only used for testing.
   *
   * @returns Internal probability tables.
   * @private
   */
  public get _tables(): [prob: number[], alias: number[]] {
    return [this.#prob, this.#alias];
  }

  /**
   * Pick a random position in the weighted array.
   *
   * @param rnd Random instance.
   * @param reason Reason for generation.
   * @returns The *position*, not the item in the array.
   */
  public pick(rnd: Random, reason = 'unspecified'): number {
    const n = this.#prob.length;
    const i = rnd.upto(n, `Vose.pick.die(${n}),${reason}`);
    const flip = rnd.random(`Vose.pick.flip,${reason}`);
    if (flip < this.#prob[i]) {
      return i; // Heads
    }
    return this.#alias[i]; // Tails
  }
}
