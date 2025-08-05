import {Modnar} from '../lib/modnar.js';
import assert from 'node:assert';
import {test} from 'node:test';

test('modnar', async () => {
  const m = new Modnar();
  assert(m.isDone);
  m.bool(true);
  assert.throws(() => m.isDone);
  assert.throws(() => m.drop(''));
  m.uBigInt(1n, 1);
  m.drop('1,uBigInt,unspecified');
  assert(m.isDone);
  assert.throws(() => m.drop(''));
  assert.throws(() => m.pick(1, [2, 3]));
  assert.throws(() => m.source(4));
  m.uInt32(1);
  const i = m.source(4, 'uInt32,unspecified');
  assert(i);
  m.uInt32(2);
  assert.throws(() => m.source(4, ''));
  m.uInt32(3);
  assert.throws(() => m.source(40, 'uInt32,unspecified'));
  m.uInt32(4);
  assert.throws(() => m.source(40, ''));
  assert(m.isDone);

  await test('uInt32', () => {
    assert.throws(() => m.uInt32(0.1));
    assert.throws(() => m.uInt32(-1));
    assert.throws(() => m.uInt32(0x1ffffffff));
  });

  await test('upto', () => {
    assert.throws(() => m.upto(0.1, 1));
    assert.throws(() => m.upto(-1, 1));
    assert.throws(() => m.upto(0x1ffffffff, 1));
    assert.throws(() => m.upto(0, 1.1));
    assert.throws(() => m.upto(0, -1));
    assert.throws(() => m.upto(0, 0x1ffffffff));
    assert.throws(() => m.upto(2, 1));
  });

  test('uBigInt', () => {
    assert.throws(() => m.uBigInt(-1n));
    assert.throws(() => m.uBigInt(1));
    assert.throws(() => m.uBigInt(1n, 0));
    assert.throws(() => m.uBigInt(1n, 1.1));
    assert.throws(() => m.uBigInt(1n, -1));
    m.uBigInt(0n);
    const z = m.source(1, '1,uBigInt,unspecified');
    assert.equal(z.length, 1);
    m.uBigInt(0x123n, 2);
    assert.equal(
      m[Symbol.for('nodejs.util.inspect.custom')](),
      'Modnar pending [\n  [0x0123, "2,uBigInt,unspecified"],\n]'
    );
    const b = m.source(2);
    assert.equal(b.length, 2);
  });
});
