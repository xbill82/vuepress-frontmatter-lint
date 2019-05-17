#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const { trimEnd, assign, truncate, pickBy, startsWith } = require('lodash');
const fs = require('fs');
const YAML = require('yaml');
const emoji = require('node-emoji');

const { diffLines } = require('diff');
const c = require('chalk');
const Confirm = require('prompt-confirm');

const frontmatterRE = /^---$\n(^[a-zA-Z0-9_\-]*:.*$\n)*\n?^---$/m;

program
  .version('1.0.0')
  .description('Applies the fixes from file to the repo')
  .option('-d --dir <directory>', 'The root directory of the files to fix')
  .option(
    '-s --subdir <directory>',
    'The subdirectory to restrict the fixes into'
  )
  .option('-e --errors <file>', 'A file containing the dumped errors')
  .option('-y --yes', 'Answer yes to all prompts')
  .parse(process.argv);

console.log('');
console.log(
  emoji.get(' :sparkles:'),
  c.bold.whiteBright('Frontmatter lint auto-fix tool\n')
);

let dirOption = program.dir;
if (!dirOption) {
  dirOption = '/';
}

const errorOption = program.errors;
if (!errorOption) {
  program.help();
  throw new Error('You must provide the path to an error dump file.');
}

const errorFilePath = path.resolve(process.cwd(), errorOption);
let errorsByUrl;
try {
  errorsByUrl = require(errorFilePath);
} catch (error) {
  console.error(` Unable to open ${errorFilePath}: ${error}`);
}
if (program.subdir) {
  errorsByUrl = pickBy(errorsByUrl, (value, key) => {
    return startsWith(key, program.subdir);
  });
}

function isFixable(e) {
  if (e.error === 'INVALID_KEY') {
    return true;
  }
  return e.fix;
}

const errorCount = Object.keys(errorsByUrl).reduce(
  (count, url) => {
    const errors = errorsByUrl[url];
    return {
      total: count.total + errors.length,
      fixable: count.fixable + errors.filter(isFixable).length
    };
  },
  { total: 0, fixable: 0 }
);

if (errorCount.total === 0) {
  console.log(` ${emoji.get(':cocktail:')} No errors found. Life is easy!`);
  process.exit(0);
}

console.log(
  ` Found ${c.green(errorCount.fixable)} fixable errors (of ${
    errorCount.total
  } total).\n`
);
if (!program.yes) {
  console.log(
    c.cyan(
      ' I will show you the diff and ask you confirmation before applying each fix.\n'
    )
  );
  const proceed = new Confirm(`${emoji.get(':rocket:')} Shall we start?`);
  proceed.run().then(answer => {
    if (!answer) {
      console.log(`\n ${emoji.get(':wave:')} Ok, see you!\n`);
      return 0;
    }
    fixErrors(errorsByUrl).then(() => {
      process.exit();
    });
  });
} else {
  fixErrors(errorsByUrl).then(() => {
    process.exit();
  });
}

async function fixErrors(errorsByPath) {
  console.log('');
  for (const url of Object.keys(errorsByPath)) {
    const errors = errorsByPath[url];
    const filePath = path.resolve(
      process.cwd(),
      dirOption,
      url.replace(/^\//, ''),
      'index.md'
    );
    const fileBlob = fs.readFileSync(filePath);
    console.log(` ${emoji.get(':page_facing_up:')} ${c.whiteBright(url)}...\n`);
    const fileContents = fileBlob.toString();
    const matches = fileContents.match(frontmatterRE);
    let frontmatterText;
    if (matches && matches.length) {
      frontmatterText = matches[0];
    } else {
      console.error(
        `${emoji.get(':scream:')} ` +
          c.red(`OMG, I'm unable to parse the frontmatter for this page!`)
      );
      process.exit(1);
    }
    frontmatterText = frontmatterText.replace(/^---$\n?/gm, '');
    let frontmatter = YAML.parse(frontmatterText);

    errors
      .filter(e => e.fix)
      .forEach(e => {
        frontmatter = fixError(e, frontmatter);
      });

    const fixedFrontmatterText = YAML.stringify(frontmatter);
    const fileContentsFixed = fileContents.replace(
      frontmatterRE,
      `---\n${fixedFrontmatterText}---`
    );

    let answer = program.yes;

    if (!answer) {
      const diff = diffLines(fileContents, fileContentsFixed);
      outputDiff(diff);

      const prompt = new Confirm('Proceed with fix?');
      answer = await prompt.run();
    }

    if (answer) {
      fs.writeFileSync(filePath, fileContentsFixed);
      console.log(c.blue(`\n ${emoji.get(' :sparkles:')} Fixed!\n`));
    } else {
      console.log(`\n ${emoji.get(':see_no_evil:')} Skipped!\n`);
    }
  }
  console.log(
    `\n ${emoji.get(':raised_hands:')} ${c.bold.whiteBright(' All done!')}\n`
  );
}

function fixError(error, frontmatter) {
  switch (error.error) {
    case 'MISSING_KEY':
      return assign(error.fix, frontmatter);
      break;

    case 'INVALID_KEY':
      delete frontmatter[error.key];
      return frontmatter;
      break;

    default:
      return frontmatter;
      break;
  }
}

function outputDiff(diff) {
  if (!diff.length) {
    console.log('Noting to fix');
    return;
  }
  diff.forEach(d => {
    const value = trimEnd(d.value, '\n');
    if (d.added) {
      return console.log(c.green(`${value.replace(/^/gm, '+ ')}`));
    }
    if (d.removed) {
      return console.log(c.red(`${value.replace(/^/gm, '- ')}`));
    }
    return console.log(
      c.grey(
        truncate(value.replace(/^/gm, '  '), {
          length: 200,
          separator: '\n',
          omission: '\n  [...]'
        })
      )
    );
  });
  console.log('');
}
