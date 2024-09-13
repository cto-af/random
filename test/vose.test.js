import {equal, ok, throws} from 'node:assert/strict';
import {Random} from '../lib/index.js';
import {Vose} from '../lib/vose.js';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test from 'node:test';

test('vose', () => {
  const r = new Random();

  throws(() => new Vose([], r), {
    message: 'Total probability of 0.',
  });
  throws(() => new Vose([0, 0, 0], r), {
    message: 'Total probability of 0.',
  });
  throws(() => new Vose([-1], r), {
    message: 'All probabilities must be non-negative.  Got "-1".',
  });

  const w = [0.1, 1, 10];
  const v = new Vose(w, r);
  ok(v);

  const freq = w.map(() => 0);
  const times = 1000;
  for (let i = 0; i < times; i++) {
    freq[v.pick(r)]++;
  }
  equal(freq.reduce((p, x) => p + x), times);

  // 0 probability never picked.
  const v2 = new Vose([1, 0, 0], r);
  for (let i = 0; i < times; i++) {
    equal(v2.pick(r), 0);
  }

  const empty = new Array(1);
  empty.push(2);
  throws(() => new Vose(empty, r), {message: 'Sparse array not allowed'});
  empty[0] = null;
  const v4 = new Vose(empty, r);
  ok(v4);
});
