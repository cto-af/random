'use strict';

/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['src/index.ts'],
  out: 'docs',
  cleanOutputDir: true,
  sidebarLinks: {
    GitHub: 'https://github.com/cto-af/random',
    Documentation: 'https://cto-af.github.io/random/',
  },
  navigation: {
    includeCategories: false,
    includeGroups: false,
  },
  categorizeByGroup: false,
  includeVersion: true,
  sort: ['static-first', 'alphabetical'],
  exclude: ['**/*.spec.ts'],
};
