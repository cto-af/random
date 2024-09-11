import {deepEqual, equal, ok, throws} from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {Modnar} from './fixtures/modnar.js';
import {Random} from '../lib/index.js';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import {test} from 'node:test';

// eslint-disable-next-line n/no-unsupported-features/node-builtins
test.beforeEach(t => {
  const m = new Modnar();
  const r = new Random(m.source);
  t.context = {m, r};
});

// eslint-disable-next-line n/no-unsupported-features/node-builtins
test.afterEach(t => {
  ok(t.context.m.isDone);
});

test('bytes', t => {
  const {m, r} = t.context;

  m.bytes(Buffer.from('foo'), 'test');
  const buf = r.bytes(3, 'test');
  ok(Buffer.isBuffer(buf));
  equal(buf.length, 3);
  equal(buf.toString(), 'foo');
});

test('uInt32', t => {
  const {m, r} = t.context;

  m.uInt32(12, 'test');
  const n = r.uInt32('test');
  equal(typeof n, 'number');
  equal(n, 12);
});

test('upto', t => {
  const {m, r} = t.context;

  m.upto(0, 0); // NoOp
  equal(r.upto(0, 'test'), 0);

  m.upto(7, 10, 'test');
  equal(r.upto(10, 'test'), 7);
});

test('uBigInt', t => {
  const {m, r} = t.context;

  m.uBigInt(23n, 1, 'test');
  const n = r.uBigInt(1, 'test');
  equal(typeof n, 'bigint');
  equal(n, 23n);
});

test('random', t => {
  const {m, r} = t.context;

  m.random(0, 'test');
  m.random(0.9, 'test');
  m.random(1 - Number.EPSILON, 'test');
  throws(() => m.random(1, 'test'));
  ok(r.random('test') < Number.EPSILON);
  ok(r.random('test') - 0.9 < Number.EPSILON);
  ok(1 - r.random('test') < 2 * Number.EPSILON);
});

test('gauss', t => {
  const {m, r} = t.context;

  // S == 0
  m.random(0.5, 'test');
  m.random(0.5, 'test');
  equal(r.gauss(1, 2, 'test'), 1);

  const g1 = m.gauss(10, 3, 'test');
  const g2 = m.gauss(7, 9, 'test');

  equal(r.gauss(10, 3, 'test'), g1);
  equal(r.gauss(7, 9, 'test'), g2);
});

test('pick', t => {
  const {m, r} = t.context;

  const ary = [2, 1, 3, 8];
  m.pick(1, ary, 'test');
  equal(r.pick(ary, 'test'), 1);

  ary[Random.FREQS] = [10, 1, 0.1, 7];
  m.pick(2, ary, 'test');
  m.pick(1, ary, 'test');
  m.pick(3, ary, 'test');
  m.pick(8, ary, 'test');

  equal(r.pick(ary, 'test'), 2);
  equal(r.pick(ary, 'test'), 1);
  equal(r.pick(ary, 'test'), 3);
  equal(r.pick(ary, 'test'), 8);
});

test('bool', t => {
  const {m, r} = t.context;

  m.bool(true);
  m.bool(false);

  equal(r.bool(), true);
  equal(r.bool(), false);
});

test('some', t => {
  const {m, r} = t.context;

  m.some('ab', 'abc', 'test');
  equal(r.some('abc', 'test'), 'ab');

  m.some([1, 2], [3, 2, 1, 4], 'test');
  deepEqual(r.some([3, 2, 1, 4], 'test'), [2, 1]); // In order of orig
});
