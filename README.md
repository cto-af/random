# @cto.af/random

Description

## Installation

```sh
npm install @cto.af/random
```

## API

Full [API documentation](http://cto_af.github.io/random/) is available.

Example:

```js
import {Random} from '@cto.af/random';

const r = new Random();
r.upTo(10); // 0-9
r.pick(['a', 'b', 'c']); // One of those strings.
r.some(['a', 'b', 'c']); // 0-3 of those strings.
r.gauss(1.0, 0.2); // Normal distribution around 1.0 with a stdDev of 0.2.
```

There is also a test harness available, that allows you to pre-load a random
instance so that it generates predictable results:

```js
import {Modnar} from '@cto.af/random/test';
import {Random} from '@cto.af/random';

const m = new Modnar();
const r = new Random(m.source);
m.uInt32(1);
m.uBigInt(1234567890n);
r.uInt32(); // 1
r.uBigInt(); // 1234567890n
```

---
[![Tests](https://github.com/cto-af/random/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/cto-af/random/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/cto-af/random/graph/badge.svg?token=jwhPKIpxcv)](https://codecov.io/gh/cto-af/random)
