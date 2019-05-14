# Frontmatter Validator for VuePress

Validate frontmatters like VueJS props.

## Getting started

```sh
npm i vuepress-validate-frontmatter
```

In `.vuepress/config.js`, add

```javascript
module.exports = {
  // ...
  plugins: [
    [
      require('vuepress-validate-frontmatter'),
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

Pass your frontmatter specifications in the VueJS props fashion, in a POJO where keys are field-names and values are objects containing

#### `type`

The type of the field. Must be a valid Javascript type class.

#### `required`

Whether the field is required or not. Must be a Boolean value.

#### `allowedValues`

A list of valid values for the field. Must be an array. If this field is missing, any value matching the type will be considered valid.

## Error reporting

The plugin will run before your build phase and will throw an error if any of the checked frontmatters doesn't match the specs. Details about the errors will be written to the `frontmatter-errors.json` file at the root of your project.
