#!/usr/bin/env node

const fs = require('fs');
const { join } = require("path")

const { output, levels } = require("./output");
const { encodings } = require("./lib");
const version = require("./package.json").version;

const encodingsOrder = ["url", "base64", "jwt"];

// Configuration
const config = {
  verbosity: levels.NORMAL,
  dumpConfig: false,

  // Functional options - determine application behaviour; can be changed from the CLI.
  // name: [ current | default | src        | description ]
  match:   [ true,     true,     "default",   "attempt to match input to an encoding before decoding"],
  decode:  [ true,     true,     "default",   "attempt to decode input; when false, only print detected encoding"],
  pipe:    [ true,     true,     "default",   "pass the result of each decoding as the input for the following match/decode"],
  color:   [ true,     true,     "default",   "use colors (ANSI codes) when printing decoded JWT token; negate to get valid JSON"],
  bail:    [ false,    false,    "default",   "exit on first decode failure; if --no-decode, exit on first match failure"],
  first:   [ false,    false,    "default",   "exit on first successful decode, or first successful match if --no-decode"],
};

// Non-functional CLI options - hanve simple, pre-defined associated actions
const options = [
  ["verbose", "verbose output - more details on how input is matched against encodings and decoded", () => { config.verbosity = levels.VERBOSE; } ],
  ["version", "show version number", () => { console.log(`decode v.${version}`); process.exit(0); } ],
  ["help", "show this message", () => { printHelp(); process.exit(0); } ],
  ["dump-config", "dump configuration state", () => { config.dumpConfig = true } ],
];

// Process CLI arguments and update configuration
const freeArgs = [];
let needInput = false;
const args = process.argv.slice(2);
while (args.length) {
  const arg = args.shift();
  if (/^--[a-zA-Z]+/.test(arg)) { // does it look like a CLI arg ?
    const stripped = arg.replace(/^--/, ""); // get the name withouth '--'
    const opt = options.find((o) => o[0] === stripped); // check if it's a non-functional option
    if (opt && opt[2]) { // do we have a function associated with this option ?
      opt[2]()
    } else { // no function - must be a functional option - either normal, or negated
      if (config.hasOwnProperty(stripped)) { // a known functional option
        needInput = true;
        ensureBooleanAndSet(stripped, true, arg);
      } else if (stripped.match(/^no-[a-zA-Z]/)) { // a negated functional option; ex: '--no-match'
        needInput = true;
        ensureBooleanAndSet(stripped.replace(/^no-/, ""), false, arg);
      } else {
        fatal(`Unrecognized argument: ${arg}`, stripped);
      }
    }
  } else { // not a CLI arg - probably the string to be decoded
    freeArgs.push(arg);
  }
}
if (freeArgs.length !== 1 && needInput) {
  fatal('Provide one argument as the input to be matched/decoded; use --help for more information and examples.')
}

const cfg = Object.keys(config).reduce((acc, curr) => {
  acc[curr] = Array.isArray(config[curr]) ? config[curr][0] : config[curr];
  return acc;
}, {})
const out = output(config.verbosity, cfg);

if (config.dumpConfig) {
  console.dir(cfg);
}

let latestSuccess = null;

if (freeArgs.length === 1) {
  matchDecode(freeArgs[0])
  if (latestSuccess) {
    out.finalResult(latestSuccess)
  }
}


function matchDecode(input) {
  let result = input;

  for (let i = 0; i < encodingsOrder.length; i++) {
    const encodingName = encodingsOrder[i];
    const isLast = i === encodingsOrder.length -1;
    const encoding = encodings[encodingName];
    out.scope(encodingName);

    let matched = false;
    if (cfg.match) {
      out.debug(`matching "${result}"`);
      if (encoding.match(result)) {
        matched = true;
        out.debug('matched');
        if (!cfg.decode) {
          if (cfg.first) {
            out.debug(`${result} matched "${encodingName}" encoding; exiting due to --first`)
            out.finalResult(encodingName)
          } else if (!cfg.decode) {
            latestSuccess = encodingName;
          }
        }
      } else {
        out.debug('did not match');
      }
    }

    if (cfg.decode) {
      if (cfg.match && !matched) {
        continue;
      }
      out.debug(`decoding "${result}"`);
      try {
        const decoded = encoding.decode(result);
        latestSuccess = decoded;
        out.debug(`decoded: "${typeof decoded === "object" ? JSON.stringify(decoded, null, 2) : decoded}"`);
        if (cfg.first) {
          out.debug("printing decoded value, then exiting due to --first");
          out.finalResult(decoded)
        }
        isLast && out.finalResult(decoded);
        if (cfg.pipe) {
          !isLast && out.debug(`passing decoded value to next match/encode (use --no-pipe to avoid this)`);
          result = decoded;
        }
      } catch (ex) {
        out.debug(`could not decode "${result}"`);
        console.error(ex)
        if (cfg.bail) {
          out.error('decoding failed; exiting due to --bail')
          out.debug(ex)
          process.exit(1);
        }
      }
    }
  }
  return result;
};

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

function ensureBooleanAndSet(optionName, value, arg) {
  if (!config.hasOwnProperty(optionName) || !Array.isArray(config[optionName])) {
    fatal(`Unrecognized argument: ${arg}`);
  } else if (!typeof config[optionName][0] === "boolean") {
    fatal(`Config option not a boolean: ${optionName} (argument: ${arg})`);
  } else {
    config[optionName][0] = value; // set current value
    config[optionName][2] = "cli"; // set current value source
  }
}

function printHelp() {
  console.log(`\ndecode v.${version}`);
  console.log(`
  Apply simple heuristics to a string, detecting various common encodings and
  printing the decoded result. The attempted decodings are, in order: URL,
  base64 and JWT. When a string seems to match an encoding, it is decoded and
  passed to the next encoding processor.
  `);
  console.log(`Functional Options`);
  console.log(`
  All of these are boolean and can be negated by prefixing with "no-"; for
  example, to disable piping, use the '--no-pipe' option. Note that some are
  disabled by default - --bail and --first.
  `);
  Object.keys(config).forEach(name => {
    if (Array.isArray(config[name])) {
      const [val, defaultValue, _, desc] = config[name];
      console.log(`    --${name.padEnd(12)}`, desc, `(default: ${defaultValue})`);
    }
  })
  console.log(`\nOther\n`);
  options.forEach(option => {
    const [name, desc] = option;
    console.log(`    --${name.padEnd(12)}`, desc);
  });
  console.log(`\nExamples\n`);
  fs.readFileSync(join(__dirname, "EXAMPLES.txt"), { encoding: 'utf8' }).split('\n').forEach(line => {
    console.log(`  ${line}`);
  })

  console.log();
}

