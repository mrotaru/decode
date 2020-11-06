const encodings = {
  url: {
    match: (str) => {
      // nr of url-encoded chars encountered so far
      let n = 0;

      // current position in string
      let i = 0;

      // number of url-encoded characters required for string to be
      // considered url-encoded
      const required = Math.floor(str.length / 20 + 1);

      // first and second char for most common url-encoded chars
      const urlChar1 = Array.from("234567");
      const urlChar2 = Array.from("0123456789ABCDEF");

      // iterate over chars in the string, until we run out of chars
      // or we have enough url-encoded chars
      while (n < required && i <= str.length - 3) {
        if (str[i] === "%") {
          if (urlChar1.includes(str[i + 1]) && urlChar2.includes(str[i + 2])) {
            i += 3;
            n += 1;
          }
        }
        i += 1;
      }

      // if we have the required number of url-encoded chars, the string
      // is considered to be url-encoded
      return n >= required ? true : false;
    },
    decode: (str) => decodeURIComponent(str),
  },
  base64: {
    match: (str) => {
      // based on packages by https://git.coolaj86.com/coolaj86
      const atob = str => Buffer.from(str, 'base64').toString('binary');
      const btoa = bin => Buffer.prototype.isPrototypeOf(bin)
          ? bin.toString('base64')
          : Buffer.from(bin.toString(), 'binary').toString('base64')

      // based on: https://stackoverflow.com/a/34068497/447661
      if (str.trim() === "") {
        return false;
      } else {
        try {
          return btoa(atob(str)) === str;
        } catch (err) {
          return false;
        }
      }
    },
    decode: (str) => {
      return Buffer.from(str, "base64").toString("utf-8");
    },
  },
  jwt: {
    match: (str) => {
      return str.match(
        /^([A-Za-z0-9-_=]+)\.([A-Za-z0-9-_=]+)\.?([A-Za-z0-9-_.+\/=]*)$/g
      );
    },
    decode: (str) => {
      let match = /^(?<header>[A-Za-z0-9-_=]+)\.(?<payload>[A-Za-z0-9-_=]+)\.?(?<signature>[A-Za-z0-9-_.+\/=]*)$/g.exec(
        str
      );
      let result = {};
      for (const key of Object.keys(match.groups)) {
        const value = match.groups[key];
        try {
          result[key] = JSON.parse(encodings.base64.decode(value));
        } catch (ex) {
          // out.scope("[jwt]").debug(`could not base64 decode and parse as JSON: ${value}`)
          result[key] = value;
        }
      }
      return JSON.stringify(result, null, 2);
    },
  },
};

module.exports = {
  encodings,
};
