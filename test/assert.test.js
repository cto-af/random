import {assert} from '../lib/assert.js';
import {test} from 'node:test';
import {throws} from 'node:assert/strict';

test('assert', () => {
  throws(() => assert(false));
});
