const a = require('assert')

const { encodings } = require("./lib");

test("URL encoding - match", () => {
  a(encodings.url.match("foo%20bar"))
  a(!encodings.url.match("foobar"))
  a(!encodings.url.match("foo%bar"))
  a(!encodings.url.match("foo%%bar"))
})
test("URL encoding - decode", () => {
  a(encodings.url.decode("foo%20bar") === "foo bar")
})

test("base64 encoding - match", () => {
  a(encodings.base64.match("Zm9vIGJhcg=="))
  a(!encodings.base64.match("Zm9vIGJhcg="))
})

test("base64 encoding - decode", () => {
  a(encodings.base64.decode("Zm9vIGJhcg==") === "foo bar")
})

const jwt1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1MTYyMzkwMjJ9.tbDepxpstvGdW8TC3G8zg4B6rUYAOvfzdceoH48wgRQ"
test("JWT encoding - match", () => {
  a(encodings.jwt.match(jwt1))
})

test("JWT encoding - decode", () => {
  const decoded = encodings.jwt.decode(jwt1)
  a(decoded === `{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "iat": 1516239022
  },
  "signature": "tbDepxpstvGdW8TC3G8zg4B6rUYAOvfzdceoH48wgRQ"
}`)
})

function test(name, fn) {
  try {
    fn()
    console.log(`OK: ${name}`)
  } catch (ex) {
    console.error(`failed: ${name}`, ex)
    process.exit(1)
  }
}
