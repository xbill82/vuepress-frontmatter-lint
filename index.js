const { writeFileSync } = require('fs');
const { pickBy } = require('lodash');
const mm = require('micromatch');
const c = require('chalk');

const pluginName = 'frontmatter-lint';
const dumpFile = './frontmatter-errors.json';

module.exports = (options, ctx) => {
  throw new Error(
    'Sorry, vuepress-validate-frontmatter is deprecated. Use vuepress-frontmatter-lint instead.'
  );
};
