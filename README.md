# decode

Try to match input against URL, base64 and JWT encodings, and attempt decoding it.

To install: `npm i -g mrotaru/decode`

Output of `--help` below.

```
Functional Options

  All of these are boolean and can be negated by prefixing with "no-"; for
  example, to disable piping, use the '--no-pipe' option. Note that some are
  disabled by default - --bail and --first.

    --match        attempt to match input to an encoding before decoding (default: true)
    --decode       attempt to decode input (default: true)
    --pipe         pass the result of each decoding as the input for the following match/decode (default: true)
    --bail         exit on first decode failure, or first match failure if --no-decode (default: false)
    --first        exit on first successful decode, or first successful match if --no-decode (default: false)

Other

    --verbose      verbose output - more details on how input is matched against encodings and decoded
    --version      show version number
    --help         show this message
    --dump-config  dump configuration state

Examples

  $ decode Zm9vIGJhcg==
  foo bar

  $ decode https%3A%2F%2Flocalhost%3A8080%2Ffoo%2Fbar
  https://localhost:8080/foo/bar

  $ decode --verbose Zm9vIGJhcg==
  [ url ] matching "Zm9vIGJhcg=="
  [ url ] did not match
  [ base64 ] matching "Zm9vIGJhcg=="
  [ base64 ] matched
  [ base64 ] decoding "Zm9vIGJhcg=="
  [ base64 ] decoded: "foo bar"
  [ base64 ] passing decoded value to next match/encode (use --no-pipe to avoid this)
  [ jwt ] matching "foo bar"
  [ jwt ] did not match
  foo bar

  $ decode --no-decode Zm9vIGJhcg==
  base64

  $ decode eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
  {
    "header": {
      "alg": "HS256",
      "typ": "JWT"
    },
    "payload": {
      "sub": "1234567890",
      "name": "John Doe",
      "iat": 1516239022
    },
    "signature": "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  }
```
