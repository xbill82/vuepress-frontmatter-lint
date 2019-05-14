const { writeFileSync } = require('fs');
const { pickBy } = require('lodash');

const errors = {};
const pluginName = 'validate-frontmatter';

module.exports = options => {
  const { specs } = options;

  if (!specs) {
    console.log(`plugin-${pluginName}: No frontmatter specs found.`);
    return { name: pluginName };
  }

  if (typeof specs !== 'object') {
    console.log(
      `plugin-${pluginName}: Invalid frontmatter specs type: expected object, got ${typeof specs}`
    );
    return { name: pluginName };
  }

  return {
    name: pluginName,
    extendPageData($page) {
      const {
        _filePath, // file's absolute path
        frontmatter // page's frontmatter object
      } = $page;

      const requiredFields = pickBy(specs, s => s.required === true);
      Object.keys(requiredFields).forEach(fieldName => {
        if (Object.keys(frontmatter).indexOf(fieldName) === -1) {
          addError(errors, _filePath, {
            error: 'MISSING_PROP',
            expected: fieldName
          });
        }
      });

      Object.keys(frontmatter).forEach(key => {
        if (!key) {
          addError(errors, _filePath, {
            error: 'EMPTY_KEY'
          });
          return;
        }
        if (!hasOwn(specs, key)) {
          addError(errors, _filePath, {
            error: 'INVALID_KEY',
            got: key
          });
          return;
        }
        const value = frontmatter[key];
        if (value === null || typeof value === 'undefined') {
          addError(errors, _filePath, {
            error: 'EMPTY_VALUE',
            key
          });
          return;
        }
        const spec = specs[key];
        const assertResult = assertType(value, spec.type);
        if (!assertResult.valid) {
          addError(errors, _filePath, {
            error: 'INVALID_TYPE',
            key,
            expected: getType(spec.type),
            got: typeof value
          });
          return;
        }
        if (hasOwn(spec, 'allowedValues')) {
          if (!assertAllowedValue(value, spec.allowedValues)) {
            addError(errors, _filePath, {
              error: 'INVALID_VALUE',
              key,
              expected: spec.allowedValues,
              got: value
            });
          }
        }
      });
    },
    ready() {
      if (Object.keys(errors).length) {
        writeFileSync(
          './frontmatter-errors.json',
          JSON.stringify(errors, null, 4)
        );
        throw new Error(
          'Some pages do not have a valid frontmatter. Please refer to frontmatter-errors.json'
        );
      }
    }
  };
};

function addError(errors, path, error) {
  if (!errors[path]) {
    errors[path] = [];
  }
  errors[path].push(error);
}

function assertAllowedValue(value, allowedValues) {
  return allowedValues.indexOf(value) > -1;
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;

function assertType(value, type) {
  let valid;
  const expectedType = getType(type);
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type;
    }
  } else {
    valid = value instanceof type;
  }
  return {
    valid,
    expectedType
  };
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType(fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : '';
}

/**
 * Check whether an object has the property.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}
