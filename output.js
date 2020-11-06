const levels = {
  QUIET: 0,
  NORMAL: 1,
  VERBOSE: 2,
};

function output(level) {
  let scope = "";
  const returnObject = {
    results(...args) {
      level > levels.QUIET && console.log(scope, ...args);
    },
    finalResult(...args) {
      level > levels.QUIET && console.log(...args);
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
