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

  /**
   * Initialize default private parameters and chained decoder class
   * @param {number[]} array
   */
  #init(array) {
    this.#result = {};
    this.#bitIndex = 0;
    this.#endian = "big";
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
      const binaryEquivalent = this.#padZerosLeft(
        byte.toString(2),
        registerSizeInBits
      );
      outputArray.push(binaryEquivalent);
    }

    return outputArray.join("");
  }

  /**
   * Pad strings with 0s to the left
   * @param {string} str
   * @param {number} requiredLength
   * @returns {string}
   */
  #padZerosLeft(str, requiredLength) {
    if (typeof str !== "string")
      throw new Error("padZeros: input not a string");
    const stringLength = str.length;
    if (stringLength >= requiredLength) return str;
    return "0".repeat(requiredLength - stringLength) + str;
  }

  /**
   * Fetches the result of the parsing process
   * @returns {Object}
   */
  get result() {
    return this.#result;
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
