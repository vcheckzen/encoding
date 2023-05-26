# Common Message Encoding Implementation

This article will introduce several common message encoding standards and implement them in JavaScript, including UTF-8, Base58, Base64, and URL Encode.

## UTF-8

In the Unicode system, each character corresponds to a code point (an unsigned integer). All characters in a text correspond to a sequence of code points, which can be mapped into bytes for storage and inter-network transmission through some kind of transformation. The UTF-8 is a variable-length Unicode encoding method that stores different Unicode code points as units ranging from 1 to 4 bytes, and uses 1-byte encoding for ASCII code point ranges to be ASCII-compatible and space-saving. The following table gives the conversion rules from Unicode code point to UTF-8 encoding.

| First code point | Last code point | Byte 1   | Byte 2   | Byte 3   | Byte 4   |
| ---------------- | --------------- | -------- | -------- | -------- | -------- |
| U+0000           | U+007F          | 0xxxxxxx |          |
| U+0080           | U+07FF          | 110xxxxx | 10xxxxxx |          |
| U+0800           | U+FFFF          | 1110xxxx | 10xxxxxx | 10xxxxxx |          |
| U+10000          | U+10FFFF        | 11110xxx | 10xxxxxx | 10xxxxxx | 10xxxxxx |

For example, the Unicode code point of the Chinese character "中" is `\u4e2d`, which is located in the third row of the above table, so it needs 3 bytes to be stored, and its binary `0100 1110 0010 1101` is taken out from the highest to the lowest, and placed at `xxxx` in the third row of the above table, which completes the encoding. The encoded binary is `1110 0100 1011 1000 1010 1101` and the hexadecimal is `\xe4\xb8\xad`.

It is also relatively simple to implement in code, just translate the above table.

```js
function unicodeArrToUtf8Arr(unicodeArr) {
  const buf = [];
  for (const code of unicodeArr) {
    let rest = 0;

    // encode the first byte
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
    } else {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      buf.push((0b11110 << 3) | (code >> 18));
      rest = 3;
    }

    // encode the rest bytes
    while (rest-- > 0) {
      buf.push((0b10 << 6) | ((code >> (rest * 6)) & 0x3f));
    }
  }
  return buf;
}
```

The following is the decoding rule, which is the inverse operation of encoding.

```js
function utf8ArrToUnicodeArr(utf8Arr) {
  const buf = [];
  for (let i = 0; i < utf8Arr.length;) {
    let _1 = utf8Arr[i++];
    let rest = 0;

    // decode the first byte
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
    } else {
      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      rest = 3;
      _1 &= 0b00000111;
    }

    // combine the rest bytes
    _1 <<= rest * 6;
    while (rest-- > 0) {
      _1 |= (utf8Arr[i++] & 0x3f) << (rest * 6);
    }
    buf.push(_1);
  }
  return buf;
}
```

## BaseN

BaseN is a class of binary-to-text encoding methods that use N characters to represent binary data, including Base64, Base58, and so on. The essence is to treat the encoded string as an N-integer, with each character corresponding to one bit of the integer. For example, the decimal number `255` is encoded in Base10, its Base2 encoding is its binary `1111 1111`, Base8 encoding is its octal `377`, Base16 encoding is its hexadecimal `FF`, and so on.

### Base58

As the name implies, Base58 uses 58 character-encoded data, and its well-known use is as a wallet address encoding for Bitcoin, and Satoshi Nakamoto gives his intent for its use in the code comments.

```cpp
//
// Why base-58 instead of standard base-64 encoding?
// - Don't want 0OIl characters that look the same in some fonts and
//      could be used to create visually identical looking account numbers.
// - A string with non-alphanumeric characters is not as easily accepted as an account number.
// - E-mail usually won't line-break if there's no punctuation to break at.
// - Doubleclicking selects the whole number as one word if it's all alphanumeric.
//
```

The following is the Base58 code table.

| Value | Character | Value | Character | Value | Character | Value | Character |
| ----- | --------- | ----- | --------- | ----- | --------- | ----- | --------- |
| 0     | 1         | 1     | 2         | 2     | 3         | 3     | 4         |
| 4     | 5         | 5     | 6         | 6     | 7         | 7     | 8         |
| 8     | 9         | 9     | A         | 10    | B         | 11    | C         |
| 12    | D         | 13    | E         | 14    | F         | 15    | G         |
| 16    | H         | 17    | J         | 18    | K         | 19    | L         |
| 20    | M         | 21    | N         | 22    | P         | 23    | Q         |
| 24    | R         | 25    | S         | 26    | T         | 27    | U         |
| 28    | V         | 29    | W         | 30    | X         | 31    | Y         |
| 32    | Z         | 33    | a         | 34    | b         | 35    | c         |
| 36    | d         | 37    | e         | 38    | f         | 39    | g         |
| 40    | h         | 41    | i         | 42    | j         | 43    | k         |
| 44    | m         | 45    | n         | 46    | o         | 47    | p         |
| 48    | q         | 49    | r         | 50    | s         | 51    | t         |
| 52    | u         | 53    | v         | 54    | w         | 55    | x         |
| 56    | y         | 57    | z         |

As mentioned above, the essence of BaseN encoding is to treat the data as an integer and convert it to the N format. There are 256 extended ASCII characters, so a string encoded in ASCII can be treated as a 256-entry integer. For example, the string `js` can be treated as a 256-entry integer with the decimal size `ascii(j) * 10 + ascii(s) = 106 * 10 + 115 = 1175 = 20 * 58`, so it has only one bit in the 58-entry system, the bit value 20, which is represented by the letter `M` by looking up the Base58 table.

One problem with the above approach is that if the ASCII encoded string has a number of `\0` prefixes, since `ascii(\0) = 0`, these `\0`s do not affect the size of the value if the string is treated as a 256-entry integer, e.g., decimal `00012345 = 12345`. That is, if the encoding is exactly according to the binary conversion method, the leading zero value will be lost, although the leading zero does not affect the size of the integer, but in the original binary data must have its existence, the loss is what we do not want to see. For this reason, the number of leading zeros can be counted before conversion, and the same number of leading zeros can be added after conversion, so that the information can be encoded without loss.

Understanding the above process, we can write Base58 codec class.

```js
class BxxConverter {
  static countLeadingElem(iter, obj) {
    let i = 0;
    for (; i < iter.length && iter[i] === obj; i++);
    return i;
  }

  static convert(fromBuf, fromBase, toBase) {
    const zeros = BxxConverter.countLeadingElem(fromBuf, 0);

    // convert a base xx buf to a base 10 big integer x
    let x = BigInt.fromBxxBuf(fromBuf.slice(zeros), fromBase);
    let r = 0;

    let buf = [];
    // calculate every position of x when converted to the object base number
    while (!x.isZero()) {
      // r = x % toBase, that's the current position
      [x, r] = x.div(toBase);
      buf.push(r);
    }

    if (zeros > 0) buf = buf.concat(new Array(zeros).fill(0));

    return buf.reverse();
  }
}
```

The above code uses the large number class to convert the original data to decimal, and then iteratively divides by toBase to obtain each bit of the target decimal. In fact, you can skip the decimal conversion process and do the fromBase division directly, which is equivalent to simulating the bit-pressing operation in high-precision calculations, readers can search for it by themselves.

### Base64

In theory, Base64 can also be converted using the above generic methods, but there is an easier way to avoid the use of the BigInt class for encoding interleavings based on nth power of 2. This is made possible by the following observation:

For binary to octal, just look at every 3 bits as a group, whose decimal value is an octal bit. For binary to hexadecimal, just look at every 4 bits as a group, and the decimal value will be a hexadecimal bit. And so on, for binary to 64, just look at every 6 bits as a group, and the decimal value will be a 64-bit.

Therefore, to convert any binary data (expressed as an array of bytes) to Base64, you only need to use every 6 bits as a group to get the code point in 64-entry system, and get the corresponding character by looking up the table. Conversely, to decode a Base64 string into binary data, simply group the binary strings of the code point sequence in groups of 8 bits to get the corresponding bytes.

It should be noted that n-byte binary data has 8n bits, and if it is not divisible by 6, the last group needs to be supplemented by `6 - 8n % 6` zeros in groups of 6. In the Base64 standard, since `8n % 6 = 4n % 3`, the remainder `r` may be `0, 1, 2`, and at least `3 - r` full zero bytes (eight bits) need to be filled for the binary data to ensure that the data can be divided into integer 6-bit groups. Since the least common multiple of 8 and 6 is 24, each `3 = 24 / 8` bytes can be treated as a minimum batch unit and encoded as `4 = 24 / 6` Base64 code points. The standard specifies that the final all-zero 6-bit group, which is formed entirely by padding, should be encoded as `=`.

As an example, the text `A` has an ASCII code of 65, binary `0100 0001`, and occupies 1 byte. When encoded as Base64, it is filled with `3 - 4 % 3 = 2` full zero bytes, which becomes `0100 0001 0000 0000 0000 0000`. Encoded as Base64 in a group of 6 bits, there are exactly 4 code points, which are

- (010000)<sub>2</sub> = (16)<sub>10</sub>
- (010000)<sub>2</sub> = (16)<sub>10</sub>
- (000000)<sub>2</sub> = (0)<sub>10</sub>
- (000000)<sub>2</sub> = (0)<sub>10</sub>

By checking the table, 16 corresponds to Q, and the last two groups are formed entirely by padding, so the final code is QQ==. Here is the Base64 code table

```tb
                      Table 1: The Base 64 Alphabet

     Value Encoding  Value Encoding  Value Encoding  Value Encoding
         0 A            17 R            34 i            51 z
         1 B            18 S            35 j            52 0
         2 C            19 T            36 k            53 1
         3 D            20 U            37 l            54 2
         4 E            21 V            38 m            55 3
         5 F            22 W            39 n            56 4
         6 G            23 X            40 o            57 5
         7 H            24 Y            41 p            58 6
         8 I            25 Z            42 q            59 7
         9 J            26 a            43 r            60 8
        10 K            27 b            44 s            61 9
        11 L            28 c            45 t            62 +
        12 M            29 d            46 u            63 /
        13 N            30 e            47 v
        14 O            31 f            48 w         (pad) =
        15 P            32 g            49 x
        16 Q            33 h            50 y
```

The following is the codec implementation. When decoding, first remove several `=` signs from the suffix, because they are completed by padding and must not belong to the original data. At this point, the Base64 string contains at most less than one byte of padding bits, and since the number of bytes of the original data is an integer, there must be `rawLen = floor(len(b64Str) * 6 / 8)`, so long as the 8-bit unit is taken continuously, and the decoding is completed after taking `rawLen` bytes.

```js
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
      u24 |= u8Arr[i] << ((16 >> mod) & 24) /* 8 * (2 - mod) */ ;
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
```

## URL Encoding

URL encoding is used to place arbitrary data in a URL that, if not encoded, would conflict with the reserved characters of the URL. A URL format can be represented as

```fmt
URI = scheme ":" ["//" authority] path ["?" query] ["#" fragment]
authority = [userinfo "@"] host [":" port]
```

As you can see characters such as `:/?#@` have special meaning and the encoded data should not contain these characters to avoid ambiguity. If these characters are present in the data, they should be converted to ASCII two-bit hexadecimal form and preceded by a percent sign. For non-ASCII data, the standard recommends encoding it first using UTF-8. URL encoding is also used to send `application/x-www-form-urlencoded` data. Here is the corresponding implementation

```js
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
```

## Conclusion

This article briefly describes the uses, methods, and key code implementations of UTF-8, Base58, Base64, and URL Encode encodings. Specifically, UTF-8 encoding, which is used to map Unicode to byte sequences, allows text from most countries around the world to be stored in a uniform way on a computer. BaseN encoding is used to encode binary data into text, which is essentially a binary conversion between integers, and when N is a power of 2, the conversion between them can be done by bit mapping. URL encoding is used to encode data securely into a URL or to transmit it via HTTP.

The runnable code in this article can be found in the [Github](https://github.com/vcheckzen/encoding) repository. The presentation and code in this article may contain errors, so please leave your comments in the comments section if you find any.

## References

- <https://en.wikipedia.org/wiki/Unicode>
- <https://en.wikipedia.org/wiki/UTF-8>
- <https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_2_%E2%80%93_rewriting_atob_and_btoa_using_typedarrays_and_utf-8>
- <https://sf-zhou.github.io/programming/chinese_encoding.html>
- <https://learnmeabitcoin.com/technical/base58>
- <https://mp.weixin.qq.com/s/RYv1taUGhngyBX6M_W7ZiQ>
- <https://en.wikipedia.org/wiki/Base64>
- <https://en.wikipedia.org/wiki/Binary-to-text_encoding>
- <https://kevin.burke.dev/kevin/node-js-string-encoding/>
- <https://en.wikipedia.org/wiki/URL_encoding>
- <https://en.wikipedia.org/wiki/MIME>
- <https://www.freecodecamp.org/news/javascript-url-encode-example-how-to-use-encodeuricomponent-and-encodeuri/>
- <https://www.baeldung.com/java-url-encoding-decoding>
