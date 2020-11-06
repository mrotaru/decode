#!/usr/bin/env node

const { output, levels } = require("./output");
const { encodings, decode } = require("./lib")
const version = require("./package.json").version;

const encodingsOrder = ["url", "base64", "jwt"];

const config = {
  verbosity: levels.NORMAL,
  dumpConfig: false,
  // name: [ current value, current value source (def/cli/user), default value, description ]
  match:   [true,  true,  "default", "attempt to match input to an encoding before decoding"],
  decode:  [true,  true,  "default", "attempt to decode input"],
  pipe:    [true,  true,  "default", "pass the output of an encoding as the input for the following match/decode"],
  bail:    [false, false, "default", "exit on first decode failure, or first match failure if --no-decode"],
  first:   [false, false, "default", "exit on first successful decode, or first successful match if --no-decode"],
};

const options = [
  ["verbose", "verbose output", () => { config.verbosity = levels.VERBOSE; } ],
  ["version", "show version number", () => { console.log(`decode v.${version}`); process.exit(0); } ],
  ["help", "show this message", () => { printHelp(); process.exit(0); } ],
  ["dump-config", "show configuration state before input", () => { config.dumpConfig = true } ],
];

const freeArgs = [];
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
        ensureBooleanAndSet(stripped, true, arg);
      } else if (stripped.match(/^no-[a-zA-Z]/)) {
        ensureBooleanAndSet(stripped.replace(/^no-/, ""), false, arg);
      } else {
        fatal(`Unrecognized argument: ${arg}`, stripped);
      }
    }
  } else {
    freeArgs.push(arg);
  }
}

if (freeArgs.length !== 1) {
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
  console.log(`\ndecode v.${version}\n`)
  Object.keys(config).forEach(name => {
    if (Array.isArray(config[name])) {
      const [val, defaultValue, _, desc] = config[name];
      console.log(`    --${name.padEnd(15)}`, desc, `(default: ${defaultValue})`);
    }
  })
  console.log(`
    --help - show this message
    --version - show version number
    --verbose - verbose output
  `);
}

const out = output(config.verbosity);

if (config.dumpConfig) {
  console.log(JSON.stringify(config, null, 4))
}
const cfg = Object.keys(config).reduce((acc, curr) => {
  acc[curr] = Array.isArray(config[curr]) ? config[curr][0] : config[curr];
  return acc;
}, {})

const matchDecode = (input) => {
  let result = input;
  for (const encodingName of encodingsOrder) {
    out.scope(encodingName);
    let matched = false;
    const encoding = encodings[encodingName];
    if (cfg.match) {
      out.debug(`matching "${result}"...`);
      if (encoding.match(result)) {
        matched = true;
        out.debug(encoding.match(result) ? 'matched' : 'did not match');
        if (!cfg.decode && cfg.first) {
          out.finalResult(`${result} matched "${encodingName}" encoding; exiting due to --first`)
        }
      } else {
        out.debug(`input "${result}" does not seem to be encoded with "${encodingName}"`);
      }
    }
    if (cfg.decode) {
      if (cfg.match && !matched) {
        continue;
      }
      out.debug(`decoding "${result}"...`);
      try {
        const decoded = encoding.decode(result);
        out.debug(`decoded: "${decoded}"`);
        if (cfg.first) {
          out.debug("printing decoded value, then exiting due to --first...");
          out.finalResult(decoded)
        }
        if (cfg.pipe) {
          out.debug(`passing decoded value to next match/encode...`);
          result = decoded
        }
      } catch (ex) {
        out.debug(`could not decode "${result}"...`);
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

matchDecode(freeArgs[0])

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}
