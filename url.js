const Utf8 = require('./utf8');

module.exports = class Url {
  static specialChr = '!*();:@&=+$,/?#[]% ';
  static hex = (b) => `%${b < 16 ? '0' : ''}${b.toString(16).toUpperCase()}`;

  static encode(raw) {
    let out = '';
    for (const c of raw) {
      const p = c.codePointAt(0);

      if (p >= 0x80 || Url.specialChr.includes(c)) {
        out += Utf8.unicodeArrToUtf8Arr([p]).map(Url.hex).join('');
        continue;
      }

      out += c;
    }

    return out;
  }

  static decode(encoded) {
    let out = '';

    for (let i = 0; i < encoded.length; ) {
      if (encoded[i] === '%') {
        const utfBuf = [];
        while (encoded[i] === '%') {
          utfBuf.push(parseInt(encoded.slice(i + 1, i + 3), 16));
          i += 3;
        }
        out += Utf8.unicodeArrToJsStr(Utf8.utf8ArrToUnicodeArr(utfBuf));
        continue;
      }

      out += encoded[i++];
    }

    return out;
  }
};
