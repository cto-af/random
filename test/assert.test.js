import {assert} from '../lib/assert.js';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import {test} from 'node:test';
import {throws} from 'node:assert/strict';

test('assert', () => {
  throws(() => assert(false));
});
