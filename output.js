const levels = {
  QUIET: 0,
  NORMAL: 1,
  VERBOSE: 2,
};

function output(level, cfg) {
  let scope = "";
  const returnObject = {
    results(...args) {
      level > levels.QUIET && console.log(scope, ...args);
    },
    finalResult(result) {
      if (level > levels.QUIET) {
        if (typeof result === 'object') {
          if (cfg.color) {
            console.log(require('util').inspect(result, {depth:null, colors: true, compact: false}))
          } else {
            console.log(JSON.stringify(result, null, 2))
          }
        } else {
          console.log(result);
        }
      }
      process.exit(0);
    },
    error(...err) {
      level >= levels.NORMAL && console.error(scope, ...err);
    },
    debug(...args) {
      level >= levels.VERBOSE && console.info(scope, ...args);
    },
    scope(newScope) {
      scope = `[ ${newScope} ]`;
      return returnObject;
    },
  };
  return returnObject;
}

module.exports = {
  levels,
  output,
};
