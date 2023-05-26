class Base64 {
  static b64CodeToAsciiCode(u6) {
    if (u6 < 26) {
      return u6 + 'A'.codePointAt(0);
    } else if (u6 < 52) {
      return u6 - 26 + 'a'.codePointAt(0);
    } else if (u6 < 62) {
      return u6 - 52 + '0'.codePointAt(0);
    } else if (u6 < 64) {
      return '+/'.codePointAt(u6 - 62);
    } else {
      throw new Error(`Invalid base64 code point: ${u6}.`);
    }
  }

  static asciiCharToB64Code(chr) {
    const diff = (c) => chr.codePointAt(0) - c.codePointAt(0);

    if (chr >= 'A' && chr <= 'Z') {
      return diff('A');
    } else if (chr >= 'a' && chr <= 'z') {
      return diff('a') + 26;
    } else if (chr >= '0' && chr <= '9') {
      return diff('0') + 52;
    } else if (chr === '+') {
      return 62;
    } else if (chr === '/') {
      return 63;
    } else {
      throw new Error(`Can't convert to base64 code from ASCII char: ${chr}.`);
    }
  }

  static encode(u8Arr) {
    let out = '';

    let mod = 2;
    for (let i = 0, u24 = 0; i < u8Arr.length; i++) {
      mod = i % 3;
      u24 |= u8Arr[i] << ((16 >> mod) & 24) /* 8 * (2 - mod) */;
      if (mod === 2 || i === u8Arr.length - 1) {
        out += String.fromCodePoint(
          Base64.b64CodeToAsciiCode((u24 >> 18) & 0x3f),
          Base64.b64CodeToAsciiCode((u24 >> 12) & 0x3f),
          Base64.b64CodeToAsciiCode((u24 >> 6) & 0x3f),
          Base64.b64CodeToAsciiCode(u24 & 0x3f)
        );
        u24 = 0;
      }
    }
    return out.substring(0, out.length - 2 + mod) + '='.repeat(2 - mod);
  }

  static decode(b64Str) {
    let pad = 0;
    for (let i = b64Str.length - 1; i > 0; i--) {
      if (b64Str[i] !== '=') break;
      pad++;
    }
    b64Str = b64Str.slice(0, b64Str.length - pad);

    const bLen = (b64Str.length * 3) >> 2; // Math.floor(len * 6 / 8)
    const buf = new Array(bLen);
    for (let i = 0, u24 = 0, bIdx = 0; i < b64Str.length; i++) {
      const mod = i & 3; // i % 4
      u24 |= Base64.asciiCharToB64Code(b64Str[i]) << (6 * (3 - mod));
      if ((mod === 3) | (i === b64Str.length - 1)) {
        for (let j = 0; j < 3 && bIdx < bLen; j++) {
          buf[bIdx++] = (u24 >> ((16 >> j) & 24)) & 0xff;
        }
        u24 = 0;
      }
    }

    return buf;
  }
}

module.exports = Base64;
