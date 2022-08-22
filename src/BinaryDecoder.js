class BinaryDecoder {
  /**
   *
   * @param {number[]} array
   */
  constructor(array) {
    this.#init(array);
  }

  // Private Variables
  #result;
  #registerSizeInBits;
  #endian;
  #bitIndex;
  #dataArray;

  /**
   * Initialize default private parameters and chained decoder class
   * @param {number[]} array
   */
  #init(array) {
    this.#result = {};
    this.#bitIndex = 0;
    this.#endian = "big";
    this.#dataArray = array;
    this.#registerSizeInBits = 8;
    this.binaryEquivalent = this.#arrToBinaryString(array);
  }

  /**
   * Convert array to a binary string
   * @param {Number[]} array
   * @param {Number} registerSizeInBits size in bits of every register/entry in array
   * @returns {String}
   */
  #arrToBinaryString(array, registerSizeInBits = 8) {
    const outputArray = [];
    for (const byte of array) {
      let binaryEquivalent = byte.toString(2);

      const zerosToPad =
        registerSizeInBits - binaryEquivalent.length > 0
          ? registerSizeInBits - binaryEquivalent.length
          : 0;

      binaryEquivalent = "0".repeat(zerosToPad) + binaryEquivalent;

      outputArray.push(binaryEquivalent);
    }

    return outputArray.join("");
  }

  /**
   * Fetches the result of the parsing process
   * @returns {Object}
   */
  get result() {
    return this.#result;
  }

  /**
   * Reinitialize the decoder with new data
   * @param {number[]} array
   * @returns {this}
   */
  reset(array = this.#dataArray) {
    this.#init(array);
    return this;
  }

  /**
   * Skip a given number of bits
   * @param {number} numberOfBits
   * @returns {this}
   */
  skip(numberOfBits) {
    this.#bitIndex += numberOfBits;
    return this;
  }

  /**
   * Select the endianness to decode the next values
   * @param {'big' | 'little'} endian
   * @returns {this}
   */
  endianness(endian) {
    this.#endian = endian;
    return this;
  }

  /**
   * Select the register size in bits. Currently required to be set at the start.
   * @param {number} registerSizeInBits
   * @returns {this}
   */
  registerSize(registerSizeInBits) {
    if (this.#bitIndex === 0) this.#registerSizeInBits = registerSizeInBits;
    return this;
  }

  /**
   * Decode the next amount of bits and give them a name. The decoded values will be stored in ".result"
   * @param {Number} sizeInBits
   * @param {String} name
   * @param {Object} [options]
   * @returns {this}
   */
  next(sizeInBits, name, options = {}) {
    // Stop if there's no more data to parse
    if (this.#bitIndex >= this.binaryEquivalent.length) return this;

    const end = this.#bitIndex + sizeInBits;

    const slice =
      this.#endian === "little"
        ? [...this.binaryEquivalent.slice(this.#bitIndex, end)]
            .reverse()
            .join("")
        : this.binaryEquivalent.slice(this.#bitIndex, end);

    let val = parseInt(slice, 2);

    if (val !== undefined) this.#result[name] = val;

    this.#bitIndex = end;
    return this;
  }
}

module.exports = BinaryDecoder;
