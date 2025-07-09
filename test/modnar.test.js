import {Modnar} from '../lib/modnar.js';
import assert from 'node:assert';
import {test} from 'node:test';

test('modnar', () => {
  const m = new Modnar();
  assert(m.isDone);
  m.bool(true);
  assert.throws(() => m.isDone);
  assert.throws(() => m.drop(''));
  m.uBigInt(1n);
  m.drop('uBigInt,unspecified');
  assert(m.isDone);
  assert.throws(() => m.drop(''));
  assert.throws(() => m.pick(1, [2, 3]));
  assert.throws(() => m.source(4));
  m.uInt32(1);
  const i = m.source(4, 'uInt32,unspecified');
  assert(i);
  m.uInt32(2);
  assert.throws(() => m.source(4));
  m.uInt32(3);
  assert.throws(() => m.source(40, 'uInt32,unspecified'));
  m.uInt32(4);
  assert.throws(() => m.source(40, ''));
});
