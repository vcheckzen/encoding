class BigInt {
  static fromBxxBuf(buf, base) {
    if (base > 256) {
      throw new Error('The base can not be larger than 256.');
    }
    const n = new BigInt();
    n.base = base;
    n.pos = buf.length > 0 ? buf : [0];
    return n;
  }

  isZero() {
    return this.pos.length === 1 && this.pos[0] === 0;
  }

  div(smInt) {
    const q = [];

    let r = 0;
    for (let i = 0; i < this.pos.length; i++) {
      r = r * this.base + this.pos[i];
      q.push(Math.floor(r / smInt));
      r %= smInt;
    }

    let i = 0;
    while (i < q.length && q[i] === 0) i++;
    return [BigInt.fromBxxBuf(q.slice(i), this.base), r];
  }
}

class BxxConverter {
  static countLeadingElem(iter, elem) {
    let i = 0;
    for (; i < iter.length && iter[i] === elem; i++);
    return i;
  }

  static convert(fromBuf, fromBase, toBase) {
    const z = BxxConverter.countLeadingElem(fromBuf, 0);

    let [x, r] = [BigInt.fromBxxBuf(fromBuf.slice(z), fromBase), 0];
    let buf = [];
    while (!x.isZero()) {
      [x, r] = x.div(toBase);
      buf.push(r);
    }
    buf = buf.reverse();

    return z === 0 ? buf : new Array(z).fill(0).concat(buf);
  }
}
