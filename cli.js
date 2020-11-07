#!/usr/bin/env node

const { output, levels } = require("./output");
const { encodings } = require("./lib");
const fs = require('fs');
const version = require("./package.json").version;

const encodingsOrder = ["url", "base64", "jwt"];

const config = {
  verbosity: levels.NORMAL,
  dumpConfig: false,
  // name: [ current value, current value source (def/cli/user), default value, description ]
  match:   [true,  true,  "default", "attempt to match input to an encoding before decoding"],
  decode:  [true,  true,  "default", "attempt to decode input"],
  pipe:    [true,  true,  "default", "pass the result of each decoding as the input for the following match/decode"],
  bail:    [false, false, "default", "exit on first decode failure, or first match failure if --no-decode"],
  first:   [false, false, "default", "exit on first successful decode, or first successful match if --no-decode"],
};

const options = [
  ["verbose", "verbose output - more details on how input is matched against encodings and decoded", () => { config.verbosity = levels.VERBOSE; } ],
  ["version", "show version number", () => { console.log(`decode v.${version}`); process.exit(0); } ],
  ["help", "show this message", () => { printHelp(); process.exit(0); } ],
  ["dump-config", "dump configuration state", () => { config.dumpConfig = true } ],
];

const freeArgs = [];
let needInput = false;
const args = process.argv.slice(2);
while (args.length) {
  const arg = args.shift();
  if (/^--[a-zA-Z]+/.test(arg)) {
    const stripped = arg.replace(/^--/, "");
    const opt = options.find((o) => o[0] === stripped);
    if (opt && opt[2]) {
      opt[2]()
    } else {
      if (config.hasOwnProperty(stripped)) {
        needInput = true;
        ensureBooleanAndSet(stripped, true, arg);
      } else if (stripped.match(/^no-[a-zA-Z]/)) {
        needInput = true;
        ensureBooleanAndSet(stripped.replace(/^no-/, ""), false, arg);
      } else {
        fatal(`Unrecognized argument: ${arg}`, stripped);
      }
    }
  } else {
    freeArgs.push(arg);
  }
}

if (freeArgs.length !== 1 && needInput) {
  fatal('Provide one argument as the input to be matched/decoded; use --help for more information.')
}

function ensureBooleanAndSet(optionName, value, arg) {
  if (!config.hasOwnProperty(optionName) || !Array.isArray(config[optionName])) {
    fatal(`Unrecognized argument: ${arg}`);
  } else if (!typeof config[optionName][0] === "boolean") {
    fatal(`Config option not a boolean: ${optionName} (argument: ${arg})`);
  } else {
    config[optionName][0] = value;
    config[optionName][2] = "cli";
  }
}

function printHelp() {
  console.log(`\ndecode v.${version}\n`);
  console.log(`Try to match input against URL, base64 and JWT encodings, and attempt decoding it.\n`);
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
  fs.readFileSync("./EXAMPLES.txt", { encoding: 'utf8' }).split('\n').forEach(line => {
    console.log(`  ${line}`);
  })

  console.log();
}

const out = output(config.verbosity);

const cfg = Object.keys(config).reduce((acc, curr) => {
  acc[curr] = Array.isArray(config[curr]) ? config[curr][0] : config[curr];
  return acc;
}, {})

if (config.dumpConfig) {
  console.dir(cfg);
}

let latestSuccess = null;

const matchDecode = (input) => {
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
        out.debug(`decoded: "${decoded}"`);
        if (cfg.first) {
          out.debug("printing decoded value, then exiting due to --first");
          out.finalResult(decoded)
        }
        isLast && finalResult(decoded);
        if (cfg.pipe) {
          !isLast && out.debug(`passing decoded value to next match/encode (use --no-pipe to avoid this)`);
          result = decoded;
        }
      } catch (ex) {
        out.debug(`could not decode "${result}"`);
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

if (freeArgs.length === 1) {
  matchDecode(freeArgs[0])
  if (latestSuccess) {
    console.log(latestSuccess);
  }
}

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}
