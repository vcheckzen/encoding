module.exports = class Utf8 {
  // JS string is UTF-16 encoded
  static jsStrToUnicodeArr(jsStr) {
    return [...jsStr].map((c) => c.codePointAt(0));
  }

  // Unicode array to JS string
  static unicodeArrToJsStr(unicodeArr) {
    return String.fromCodePoint(...unicodeArr);
  }

  // encode
  static unicodeArrToUtf8Arr(unicodeArr) {
    const buf = [];
    for (const code of unicodeArr) {
      let rest = 0;
      if (code < 0x80) {
        // 0xxxxxxx
        buf.push(code);
      } else if (code < 0x800) {
        // 110xxxxx 10xxxxxx
        buf.push((0b110 << 5) | (code >> 6));
        rest = 1;
      } else if (code < 0x10000) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        buf.push((0b1110 << 4) | (code >> 12));
        rest = 2;
      } else if (code < 0x200000) {
        // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        buf.push((0b11110 << 3) | (code >> 18));
        rest = 3;
      } else if (code < 0x4000000) {
        // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        buf.push((0b111110 << 2) | (code >> 24));
        rest = 4;
      } else {
        // 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        buf.push((0b11110 << 1) | (code >> 30));
        rest = 5;
      }

      while (rest-- > 0) {
        buf.push((0b10 << 6) | ((code >> (rest * 6)) & 0x3f));
      }
    }
    return buf;
  }

  // decode
  static utf8ArrToUnicodeArr(utf8Arr) {
    const buf = [];
    for (let i = 0; i < utf8Arr.length; ) {
      let _1 = utf8Arr[i++];
      let rest = 0;
      if (_1 >> 7 === 0) {
        // 0xxxxxxx
        _1 &= 0b01111111;
      } else if (_1 >> 5 === 0b110) {
        // 110xxxxx 10xxxxxx
        rest = 1;
        _1 &= 0b00011111;
      } else if (_1 >> 4 === 0b1110) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        rest = 2;
        _1 &= 0b00001111;
      } else if (_1 >> 3 === 0b11110) {
        // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        rest = 3;
        _1 &= 0b00000111;
      } else if (_1 >> 2 === 0b111110) {
        // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        rest = 4;
        _1 &= 0b00000011;
      } else if (_1 >> 1 === 0b1111110) {
        // 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
        rest = 5;
        _1 &= 1;
      }

      _1 <<= rest * 6;
      while (rest-- > 0) {
        _1 |= (utf8Arr[i++] & 0x3f) << (rest * 6);
      }
      buf.push(_1);
    }
    return buf;
  }
};
