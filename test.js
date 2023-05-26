const Utf8 = require('./utf8');
const Base58 = require('./base58');
const Base64 = require('./base64');
const Url = require('./url');

const testUtf8 = () => {
  // https://mothereff.in/utf-8
  // https://www.branah.com/unicode-converter
  // https://www.coderstool.com/unicode-text-converter
  const truth = [
    [
      'Foo © bar 𝌆 baz ☃ qux 😍 你好',
      '0x46 0x6F 0x6F 0x20 0xC2 0xA9 0x20 0x62 0x61 0x72 0x20 0xF0 0x9D 0x8C 0x86 0x20 0x62 0x61 0x7A 0x20 0xE2 0x98 0x83 0x20 0x71 0x75 0x78 0x20 0xF0 0x9F 0x98 0x8D 0x20 0xE4 0xBD 0xA0 0xE5 0xA5 0xBD',
    ],
  ];

  for (const t of truth) {
    const arrEq = (a1, a2) => {
      if (a1.length !== a2.length) return false;

      for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) return false;
      }
      return true;
    };

    const [raw, utf8] = [
      Utf8.jsStrToUnicodeArr(t[0]),
      t[1].split(' ').map((n) => parseInt(n, 16)),
    ];

    const [encode, decode] = [
      Utf8.unicodeArrToUtf8Arr,
      Utf8.utf8ArrToUnicodeArr,
    ];

    console.assert(arrEq(utf8, encode(raw)));
    console.assert(arrEq(raw, decode(utf8)));
    console.assert(Utf8.unicodeArrToJsStr(decode(utf8)) === t[0]);
  }
};

const testBase58 = () => {
  // https://digitalbazaar.github.io/base58-spec/
  // https://github.com/keis/base58
  const truth = [
    ['Hello World!', '2NEpo7TZRRrLZSi2U'],
    [
      'The quick brown fox jumps over the lazy dog.',
      'USm3fpXnKG5EUBx2ndxBDMPVciP5hGey2Jh4NDv6gmeo1LkMeiKrLJUUBk6Z',
    ],
    ['\0\0\0\0', '1111'],
    ['0x0000287fb4cd', '11233QC4'],
    ['0x0000000000000000', '11111111'],
    [
      'utf8\0\0Foo © bar 𝌆 baz ☃ qux 😍 你好',
      '11nzMmRFLZNVUS1TWzUWYfXZVuS7UfXuHffDBW37qWUikSX33xH7RjA',
    ],
  ];

  for (const t of truth) {
    let [raw, b58] = t;
    let [encode, decode] = [Base58.fromAscii, Base58.toAscii];
    if (raw.startsWith('0x')) {
      raw = raw.slice(2);
      [encode, decode] = [Base58.fromHex, Base58.toHex];
    } else if (raw.startsWith('utf8')) {
      raw = raw.slice(4);
      [encode, decode] = [
        (raw) =>
          Base58.fromBinary(
            Utf8.unicodeArrToUtf8Arr(Utf8.jsStrToUnicodeArr(raw))
          ),
        (b58) =>
          Utf8.unicodeArrToJsStr(
            Utf8.utf8ArrToUnicodeArr(Base58.toBinary(b58))
          ),
      ];
    }

    console.assert(encode(raw) === b58);
    console.assert(decode(b58) === raw);
  }
};

const testBase64 = () => {
  // https://www.base64encode.org/
  const truth = [
    ['Hello World!', 'SGVsbG8gV29ybGQh'],
    [
      'Foo © bar 𝌆 baz ☃ qux 😍 你好',
      'Rm9vIMKpIGJhciDwnYyGIGJheiDimIMgcXV4IPCfmI0g5L2g5aW9',
    ],
  ];

  for (const t of truth) {
    const [raw, b64] = t;
    const [encode, decode] = [
      (raw) =>
        Base64.encode(Utf8.unicodeArrToUtf8Arr(Utf8.jsStrToUnicodeArr(raw))),
      (b64) =>
        Utf8.unicodeArrToJsStr(Utf8.utf8ArrToUnicodeArr(Base64.decode(b64))),
    ];

    console.assert(encode(raw) === b64);
    console.assert(decode(b64) === raw);
  }
};

const testUrl = () => {
  // https://www.urlencoder.org/
  const truth = [
    [
      'http://example.com/path/to/file.html?param=value&param2=value2&param3=Foo © bar 𝌆 baz ☃ qux 😍 你好',
      'http%3A%2F%2Fexample.com%2Fpath%2Fto%2Ffile.html%3Fparam%3Dvalue%26param2%3Dvalue2%26param3%3DFoo%20%C2%A9%20bar%20%F0%9D%8C%86%20baz%20%E2%98%83%20qux%20%F0%9F%98%8D%20%E4%BD%A0%E5%A5%BD',
    ],
    [
      'http://www.baeldung.com?key1=value 1&key2=value@!$2&key3=value%3',
      'http%3A%2F%2Fwww.baeldung.com%3Fkey1%3Dvalue%201%26key2%3Dvalue%40%21%242%26key3%3Dvalue%253',
    ],
  ];

  for (const t of truth) {
    const [raw, enc] = t;
    const [encode, decode] = [Url.encode, Url.decode];

    console.assert(encode(raw) === enc);
    console.assert(decode(enc) === raw);
  }
};

testUtf8();
testBase58();
testBase64();
testUrl();
