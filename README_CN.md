# 常见信息编码实现

本文将介绍几种常见信息编码标准，并用 JavaScript 对其实现，包括 UTF-8，Base58, Base64, URL Encode。

## UTF-8

在 Unicode（统一码）系统中，每个字符对应一个码点（一个无符号整数）。一段文本中所有字符对应一段码点序列，通过某种转换，可将序列映射为若干字节，以便进行存储和网络间传输。UTF（the Unicode Transformation Format）统一码转换格式，即是一类映射方法，包括 UTF-8，UTF-16, UTF-32, UTF-EBCDIC。其中的 UTF-8 是一种变长 Unicode 编码方法，其将不同 Unicode 码点存储为 1 到 4 字节不等的单元，对于 ASCII 码点范围，使用 1 字节编码，以兼容 ASCII，变长有利于节省空间。下表给出了从 Unicode 码点到 UTF-8 编码的转换规则。

| First code point | Last code point | Byte 1   | Byte 2   | Byte 3   | Byte 4   |
| ---------------- | --------------- | -------- | -------- | -------- | -------- |
| U+0000           | U+007F          | 0xxxxxxx |          |
| U+0080           | U+07FF          | 110xxxxx | 10xxxxxx |          |
| U+0800           | U+FFFF          | 1110xxxx | 10xxxxxx | 10xxxxxx |          |
| U+10000          | U+10FFFF        | 11110xxx | 10xxxxxx | 10xxxxxx | 10xxxxxx |

例如，汉字 “中” 的 Unicode 码点为 `\u4e2d`，位于上表第三行范围，因此需要 3 字节存储，将其二进制 `0100 1110 0010 1101` 各位从高到低依次取出，置于上表第三行的 `xxxx` 处，即完成编码。编码后的二进制为 `1110 0100 1011 1000 1010 1101`，十六进制为 `\xe4\xb8\xad`。

用代码实现也比较简单，翻译上表即可。

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

以下是解码规则，是编码的逆操作。

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

BaseN 是一类 binary-to-text（二进制转文本）编码方法，其用 N 种字符表示二进制数据，包括 Base64, Base58 等。其实质是将编码后的字符串看成一个 N 进制整数，每个字符对应整数的一位。例如，十进制数 `255` 是 Base10 编码，其 Base2 编码即为其二进制 `1111 1111`，Base8 编码即为其八进制 `377`，Base16 编码即为其十六进制 `FF`，以此类推。

### Base58

顾名思义，Base58 使用 58 种字符编码数据，其知名用途是比特币的钱包地址编码，中本聪在代码注释中给出了他的使用意图。

1. 避免混淆。在某些字体下，数字 0 和字母大写 O，以及字母大写 I 和字母小写 l 会非常相似。
2. 不使用 "+" 和 "/" 的原因是非字母或数字的字符串作为帐号较难被接受。
3. 没有标点符号，通常不会被从中间分行。
4. 大部分的软件支持双击选择整个字符串。

以下是 Base58 码表。

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

上文提到 BaseN 编码的实质是将数据当成一个整数后转为 N 进制形式。扩展 ASCII 字符共 256 个，因此使用 ASCII 编码的字符串可看成一个 256 进制整数。例如，字符串 `js` 可当成一个 256 进制整数，其十进制大小为 `ascii(j) * 10 + ascii(s) = 106 * 10 + 115 = 1175 = 20 * 58`，因此其 58 进制只有一位，位值 20，通过查 Base58 表，用字母 `M` 表示。

以上做法存在一个问题，如果 ASCII 编码字符串有若干 `\0` 前缀，由于 `ascii(\0) = 0`，如果把该字符串看成 256 进制整数，这些 `\0` 并不影响数值大小，例如，十进制 `00012345 = 12345`。即若完全按照进制转换方法编码，前导零值将丢失，虽然前导零不影响整数大小，但在原始二进制数据中一定有其存在意义，丢失是我们不愿看到的。为此，可在转换前数出前导零值个数，转换后补上相同个数的前导零值，这样就能将信息无损编码。

理解以上过程即可编写 Base58 编解码类。

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

上述代码使用了大数类将原始数据转为十进制，再通过反复除 toBase 取余获得目标进制的每一位。实际上可以省去转十进制过程，直接做 fromBase 进制除法，相当于模拟高精度计算时的压位操作，读者可自行搜索。

### Base64

理论上 Base64 也可使用以上通用方法转换，但对于以 2 的 n 次幂为基底的编码互转，有更简便的方法，可避免 BigInt 类的使用。这得益于以下观察：

二进制转八进制，只需将每 3 位看成一组，其十进制值即为一个八进制位。二进制转十六进制，只需将每 4 位看成一组，其十进制值即为一个十六进制位。依此类推，二进制转 64 进制，只需将每 6 位看成一组，其十进制值即为一个 64 进制位。

因此，要将任意二进制数据（以字节数组形式表示）转为 Base64，只需以每 6 位为一组，得到 64 进制下的码点，通过查表得到相应字符。反过来，要解码 Base64 字符串为二进制数据，只需将码点序列的二进制串以每 8 位为一组，得到相应字节。

需要注意的是，n 字节二进制数据共 8n 位，如果不能被 6 整除，以 6 位为一组，最后一组需要补充 `6 - 8n % 6` 个 0。在 Base64 标准中，由于 `8n % 6 = 4n % 3`，余数 `r` 可能是 `0, 1, 2`，最少需要为二进制数据填充 `3 - r` 个全零字节（八位），就能保证数据可被分成整数个 6 位组。由于 8 和 6 的最小公倍数是 24，因此，可以把每 `3 = 24 / 8` 个字节当成一个最小批处理单元，编码为 `4 = 24 / 6` 个 Base64 码点。标准规定，对于最后完全由填充形成的全零 6 位组，应编码为 `=`。

举个例子，文本 `A` 的 ASCII 码为 65，二进制 `0100 0001`，占 1 字节。编码为 Base64 时，要填充 `3 - 4 % 3 = 2` 个全零字节，变为 `0100 0001 0000 0000 0000 0000`。以 6 位为一组编码为 Base64 刚好 4 个码点，分别是

- (010000)<sub>2</sub> = (16)<sub>10</sub>
- (010000)<sub>2</sub> = (16)<sub>10</sub>
- (000000)<sub>2</sub> = (0)<sub>10</sub>
- (000000)<sub>2</sub> = (0)<sub>10</sub>

通过查表，16 对应 Q，而最后两组完全是由填充形成的，因此最终编码为 QQ==。以下是 Base64 码表

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

以下是编解码实现。解码时，首先把后缀的若干 `=` 号去掉，因为它们完成是填充形成的，肯定不属于原始数据。此时 Base64 字符串最多只包含不足一字节的填充位，由于原始数据的字节数是整数，因此一定有 `rawLen = floor(len(b64Str) * 6 / 8)`，只要不断取 8 位单元，取完 `rawLen` 个字节即完成解码。

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

URL 编码用于将任意数据置于 URL 中，如果不编码，这些数据将与 URL 的保留字符冲突。一个 URL 格式可表示为

```fmt
URI = scheme ":" ["//" authority] path ["?" query] ["#" fragment]
authority = [userinfo "@"] host [":" port]
```

可见 `:/?#@` 等字符具有特殊含义，编码后的数据应不包含这些字符以避免歧义。如果数据中存在这些字符，应将其转为 ASCII 码的二位十六进制形式，并在前面加上百分号。对于非 ASCII 码数据，标准建议先使用 UTF-8 对其编码。URL 编码也用于发送 `application/x-www-form-urlencoded` 数据。以下是相应实现

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

本文简要介绍了 UTF-8，Base58, Base64, URL Encode 编码的用途，方法，和关键代码实现。具体来说，用于将 Unicode 映射为字节序列的 UTF-8 编码，使全世界大多数国家的文字能以统一方法存储到计算机。BaseN 编码用于将二进制数据编码为文本，其实质是整数间的进制转换，当 N 为 2 的幂次方时，它们之间的转换可以通过位映射完成。URL 编码用于将数据安全地编码到网址中，或通过 HTTP 传送。

本文涉及的可运行代码见 [Github](https://github.com/vcheckzen/encoding) 仓库，文中的表述和代码可能存在错误，如有发现请在评论区留言，感谢阅读。

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
