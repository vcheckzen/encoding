class BigInt {
  /**
   * BigInt('1234567890') is equal to BigInt([0, 9, 8, 7, 6, 5, 4, 3, 2, 1])
   * @param {string|[number]} b10
   */
  constructor(b10) {
    this.pos = Array.isArray(b10)
      ? b10
      : [...b10].map((c) => c.codePointAt(0) - '0'.codePointAt(0)).reverse();
  }

  static fromBxxBuf(buf, base) {
    let s = new BigInt('0');
    for (const b of buf) {
      const t = new BigInt(b.toString());
      s = s.mul(base).add(t);
    }
    return s;
  }

  static rmLeadingZero(pos) {
    while (pos.length > 1 && pos.slice(-1).pop() === 0) pos.pop();
    return pos;
  }

  toString() {
    return this.pos.reverse().join('');
  }

  isZero() {
    return this.pos.length === 1 && this.pos[0] === 0;
  }

  add(bgInt) {
    if (this.pos.length < bgInt.pos.length) return bgInt.add(this);

    const s = [];
    let c = 0;
    for (let i = 0; i < this.pos.length; i++) {
      c += this.pos[i];
      if (i < bgInt.pos.length) c += bgInt.pos[i];
      s.push(c % 10);
      c = Math.floor(c / 10);
    }
    if (c !== 0) s.push(c);
    return new BigInt(s);
  }

  mul(smInt) {
    const p = [];
    for (let i = 0, c = 0; i < this.pos.length || c !== 0; i++) {
      if (i < this.pos.length) c += this.pos[i] * smInt;
      p.push(c % 10);
      c = Math.floor(c / 10);
    }

    return new BigInt(BigInt.rmLeadingZero(p));
  }

  div(smInt) {
    const q = [];

    let r = 0;
    for (let i = this.pos.length - 1; i >= 0; i--) {
      r = r * 10 + this.pos[i];
      q.push(Math.floor(r / smInt));
      r %= smInt;
    }

    q.reverse();
    BigInt.rmLeadingZero(q);

    return [new BigInt(q), r];
  }
}

class BxxConverter {
  static countLeadingElem(iter, obj) {
    let i = 0;
    for (; i < iter.length && iter[i] === obj; i++);
    return i;
  }

  static convert(fromBuf, fromBase, toBase) {
    const zeros = BxxConverter.countLeadingElem(fromBuf, 0);

    let x = BigInt.fromBxxBuf(fromBuf.slice(zeros), fromBase);
    let r = 0;

    let buf = [];
    while (!x.isZero()) {
      [x, r] = x.div(toBase);
      buf.push(r);
    }

    if (zeros > 0) buf = buf.concat(new Array(zeros).fill(0));

    return buf.reverse();
  }
}

class Txt {
  static chrs = {
    hex: '0123456789abcdef',
    b58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  };

  static codePointMap = {
    hex: String.prototype.indexOf.bind(Txt.chrs.hex),
    b58: String.prototype.indexOf.bind(Txt.chrs.b58),
    ascii: (chr) => chr.codePointAt(0),
  };

  static charsetMap = {
    hex: String.prototype.charAt.bind(Txt.chrs.hex),
    b58: String.prototype.charAt.bind(Txt.chrs.b58),
    ascii: (chr) => String.fromCodePoint(chr),
  };

  static toBuf(txt, codePointMap) {
    return [...txt].map((c) => codePointMap(c));
  }

  static fromBuf(buf, charsetMap) {
    return buf.map((c) => charsetMap(c)).join('');
  }
}

class Base58 {
  static encode(buf, fromBase) {
    return BxxConverter.convert(buf, fromBase, 58);
  }

  static decode(buf, toBase) {
    return BxxConverter.convert(buf, 58, toBase);
  }

  static bufToTxt(b58Buf) {
    return Txt.fromBuf(b58Buf, Txt.charsetMap.b58);
  }

  static txtToBuf(b58Txt) {
    return Txt.toBuf(b58Txt, Txt.codePointMap.b58);
  }

  static fromBinary(buf) {
    return Base58.bufToTxt(Base58.encode(buf, 256));
  }

  static toBinary(b58Txt) {
    return Base58.decode(Base58.txtToBuf(b58Txt), 256);
  }

  static fromAscii(asciiTxt) {
    return Base58.fromBinary(Txt.toBuf(asciiTxt, Txt.codePointMap.ascii));
  }

  static toAscii(b58Txt) {
    return Txt.fromBuf(Base58.toBinary(b58Txt), Txt.charsetMap.ascii);
  }

  static fromHex(hexTxt) {
    // hex: 00 -> b58: 1
    let zeros = BxxConverter.countLeadingElem(hexTxt, '0');
    zeros = (zeros >> 1) << 1; // erase the trailing 1

    return Base58.bufToTxt(
      new Array(zeros >> 1)
        .fill(0)
        .concat(
          Base58.encode(
            Txt.toBuf(hexTxt.slice(zeros), Txt.codePointMap.hex),
            16
          )
        )
    );
  }

  static toHex(b58Txt) {
    return Txt.fromBuf(
      Base58.decode(
        new Array(BxxConverter.countLeadingElem(b58Txt, '1'))
          .fill(0)
          .concat(Base58.txtToBuf(b58Txt)),
        16
      ),
      Txt.charsetMap.hex
    );
  }
}

module.exports = Base58;
