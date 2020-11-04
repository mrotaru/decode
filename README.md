# decode

WIP

Small utility which takes a string as input and processes it by using simple heuristics to determine encoding, and decode it.

By default, it will check if input is encoded as URL, base64 or JWT - in that order. At each step, if encoding is matched and decoding is successful, the result will be matched against the following encoding, and a decoding attempt will be made - with the result passed on. This continues until there are no more encodings to try. If a decoding attempt fails, input is passed on as-is.
