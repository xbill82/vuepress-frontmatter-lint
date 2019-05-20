# Frontmatter linter for VuePress

Validate frontmatters like VueJS props.

## Getting started

```sh
npm i vuepress-frontmatter-lint
```

In `.vuepress/config.js`, add

```javascript
module.exports = {
  // ...
  plugins: [
    [
      require('vuepress-frontmatter-lint'),
      {
        specs: {
          fieldName: {
            type: String,
            required: true,
            allowedValues: ['foo', 'bar', 'baz']
          },
          anotherField: {
            type: Number
          }
        }
      }
    ]
  ]
};
```

## Config

### `specs`

Contains the frontmatter linting specifications in the form of a POJO, where keys are field-names and values are objects containing the following attributes.

#### `type`

The type of the field. Must be a valid Javascript type class.

#### `required`

Whether the field is required or not. Must be a Boolean value.

#### `allowedValues`

A list of valid values for the field. Must be an array. If this field is missing, any value matching the type will be considered valid.

### `dumpToFile` (`[Boolean]`, optional, default: `false`)

Whether errors should be dumped to a file (see `dumpFile` option) at the end of the linting process. Dumpfile is required by the automatic fix tool (see below).

### `dumpFile` (`[String]`, optional, default: `frontmatter-errors.json`)

The name of the file where the errors should be dumped to. Ignored if `dumpToFile` is set to `false`.

### `abortBuild` (`[Boolean]`, optional, default: `false`)

Abort the build if there are linting errors.

### `postProcessErrors` (`[Function]`, optional)

An optional function that allows you to post-process the list of errors. This is useful to add `fix` fields to individual errors (`fix` fields are used by the automatic fix tool).

The function signature is

```typescript
(errorsByUrl: Array, ctx: Object) => Array;
```

The arguments are

- `errorsByUrl` - the object containing the errors. Keys are file URLs and values are lists of errors in the following form

```
{
  error: ['MISSING_KEY'|'EMPTY_KEY'|'INVALID_KEY'|'EMPTY_VALUE'|'INVALID_TYPE'|'INVALID_VALUE'],
  key: <key name>,
  expected: <expected value or type (applicable to 'INVALID_TYPE' and 'INVALID_VALUE')>,
  got: <received value or type (applicable to 'INVALID_TYPE' and 'INVALID_VALUE')>
}
```

- `ctx` the Vuepress context object.

The return value must be an object in the same form of `errorsByUrl`, as it willsubstitute the previous one.

#### example

```javascript
const { mapValues, assign } = require('lodash');

module.exports = (errorsByUrl, ctx) => {
  return mapValues(errorsByUrl, (errors, url) => {
    return errors.map(e => {
      if (e.error !== 'MISSING_KEY') {
        return e;
      }
      const fix = computeFix(url, e, ctx);
      if (fix) {
        return assign({ fix }, e);
      } else {
        return e;
      }
    });
  });
};

function computeFix(url, e, context) {
  return {
    wrongKey: 'correct value'
  };
}
```

## Automatic fixing

The plugin also provides an automatic fixing tool that reads the dumped errors file. You can run it with the following command

```sh
$(npm bin)/frontmatter-fix -e <errorDumpFile>
```

By default, the fixer prompts for a confirmation before applying any fix.

### Options

#### `-e --errors <file>` (required)

The path of the file containing the dumped errors.

#### `-d --dir <directory>` (defaults to `cwd`)

The root path of the files to lint.

#### `-s --subdir <directory>` (optional)

The path to a subset of files to restrict the linting to.

#### `-y --yes` (optional, default=`false`)

Prevents the fixer to ask prompts.

#### `-h, --help`

Guess what.
