"use strict";

const DQ = require("dequeue");

/**
 * A Class providing "empty" functions which can
 * be called endlessly, or in a chained manner, without errors
 */
class EmptyChainedParser {
  emptyReturn = () => this;
  next = this.emptyReturn;
  skip = this.emptyReturn;
  reset = this.emptyReturn;
  endianness = this.emptyReturn;
  registerSize = this.emptyReturn;
  parseUnfinished = this.emptyReturn;
  defaultFormatter = this.emptyReturn;
}

/**
 *
 * @param {number[]} array Numeric array of registers,
 * the properties of which can be set via the instance methods.
 */
class ChainedParser {
  constructor(array = []) {
    this.#functionQueue = new DQ();
    this.#init(array);
  }

  // ================= Private Variables =================

  /**@type {Object} */ #result;
  /**@type {String} */ #endian;
  /**@type {Number} */ #bitIndex;
  /**@type {Array} */ #dataArray;
  /**@type {Queue} */ #functionQueue;
  /**@type {Boolean} */ #parseUnfinished;
  /**@type {String} */ #binaryEquivalent;
  /**@type {Number} */ #registerSizeInBits;
  /**@type {Object} */ #mappings = {
    next: this.#execNext,
    skip: this.#execSkip,
    reset: this.#execReset,
    goBack: this.#execGoBack,
    choice: this.#execChoice,
    endianness: this.#execEndianness,
    parseUnfinished: this.#execParseUnfinished,
  };

  // ================= Private Functions =================

  /**
   * Initialize default private parameters and chained decoder instance.
   * @param {number[]} array
   */
  #init(array) {
    this.#result = {};
    this.#bitIndex = 0;
    this.#endian = "big";
    this.#dataArray = array;
    this.#registerSizeInBits = this.#registerSizeInBits || 8; // needed for reset
    this.#parseUnfinished = false;
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
   * Convert unsigned numbers of any size to signed.
   * This function works under the condition that (2^sizeInBits -1) >= unsigned number,
   * meaning that the position of the leftmost 1 bit in the unsigned number should be
   * no greater than "sizeInBits".
   * @param {number} unsignedNumber
   * @param {number} [sizeInBits]
   * @returns {number}
   */
  #unsignedToSignedBits(unsignedNumber, sizeInBits = 8) {
    const mask = 1 << (sizeInBits - 1);
    if (mask & unsignedNumber) {
      unsignedNumber ^= mask; // remove leftmost bit
      unsignedNumber -= mask;
    }
    return unsignedNumber;
  }

  #execReset(array) {
    this.#init(array);
  }

  #execSkip(numberOfBits) {
    this.#bitIndex += numberOfBits;
  }

  #execEndianness(endian) {
    this.#endian = endian;
  }

  #execGoBack(numberOfBits) {
    this.#bitIndex -= numberOfBits;
    if (this.#bitIndex < 0) this.#bitIndex = 0;
  }

  #execParseUnfinished(choice) {
    this.#parseUnfinished = choice;
  }

  #execNext(sizeInBits, name, options) {
    // Stop if there's no more data to parse
    if (this.#bitIndex >= this.#binaryEquivalent.length) return this;

    const end = this.#bitIndex + sizeInBits;

    // If we have more data but it's smaller than anticipated,
    // check if we need to parse unfinished data
    if (!this.#parseUnfinished && end > this.#binaryEquivalent.length) {
      this.#bitIndex = end;
      return this;
    }

    const slice =
      this.#endian === "little"
        ? [...this.#binaryEquivalent.slice(this.#bitIndex, end)]
            .reverse()
            .join("")
        : this.#binaryEquivalent.slice(this.#bitIndex, end);

    let val = parseInt(slice, 2);

    // Signedness
    if (options.signedness === "signed") {
      val = this.#unsignedToSignedBits(val, sizeInBits);
    }
    // Formatter
    if (typeof options.formatter === "function") {
      val = options.formatter(val);
    }
    // Continue Condition : if condition is false, stops parsing what's left
    if (
      typeof options.continueCondition === "function" &&
      !options.continueCondition(val)
    ) {
      return new EmptyChainedParser(); // return an object whose "next" is valid but does nothing
    }
    // Save Condition
    if (
      typeof options.saveCondition === "function" &&
      !options.saveCondition(val)
    ) {
      val = undefined;
    }
    if (val !== undefined) this.#result[name] = val;

    this.#bitIndex = end;
  }

  #execChoice(key, paths) {
    /**
     * dequeue the options from the paths and place them in this current function queue (until we reach choice)
     */
    const newParser =
      paths[this.#result[key]] || paths.default || new EmptyChainedParser();
    let res;
    do {
      res = newParser.#functionQueue.pop();
      if (res) this.#functionQueue.unshift(res);
    } while (res);
  }

  // ================= Getter functions =================

  /**
   * Executes and fetches the result of the parsing process
   * @returns {Object}
   */
  get result() {
    this.exec();
    return this.#result;
  }

  // ================= Instance methods =================

  /**
   * Reinitialize the decoder with new data
   * @param {number[]} array
   * @returns {this}
   */
  reset(array = this.#dataArray) {
    this.#functionQueue.push({ type: "reset", param: array });
    return this;
  }

  /**
   * Skip a given number of bits
   * @param {number} numberOfBits
   * @returns {this}
   */
  skip(numberOfBits) {
    this.#functionQueue.push({ type: "skip", param: numberOfBits });
    return this;
  }

  /**
   * Select the endianness to decode the next values
   * @param {'big' | 'little'} endian
   * @returns {this}
   */
  endianness(endian) {
    this.#functionQueue.push({ type: "endianness", param: endian });
    return this;
  }

  /**
   * Choose to parse unfinished data or not.
   * @param {boolean} choice
   * @returns {this}
   */
  parseUnfinished(choice) {
    this.#functionQueue.push({ type: "parseUnfinished", param: choice });
    return this;
  }

  /**
   *
   * @param {Number} numberOfBits
   * @returns
   */
  goBack(numberOfBits) {
    this.#functionQueue.push({ type: "goBack", param: numberOfBits });
    return this;
  }

  /**
   * Decode the next amount of bits and give them a name. The decoded values will be stored in ".result"
   * @param {Number} sizeInBits
   * @param {String} name
   * @param {Object} [options]
   * @param {"signed" | "unsigned"} [options.signedness]
   * @param {Function} [options.formatter]
   * @param {Function} [options.continueCondition] After the formatter, this function checks on the resulting value. If true, continues parsing, otherwise stops safely.
   * @param {Function} [options.saveCondition] After the formatter, this function checks on the resulting value. If true, saves it to result.  * @returns {this}
   */
  next(sizeInBits, name, options = {}) {
    this.#functionQueue.push({
      type: "next",
      param: [sizeInBits, name, options],
    });
    return this;
  }

  /**
   *
   * @param {String} key
   * @param {{<String | Number>: <ChainedParser | EmptyChainedParser>}} paths keys whose values are parsers
   */
  choice(key, paths = {}) {
    this.#functionQueue.push({
      type: "choice",
      param: [key, paths],
    });
    return this;
  }

  /**
   * Select the register size in bits. Currently required to be set at the start.
   * @param {number} registerSizeInBits
   * @returns {this}
   */
  registerSize(registerSizeInBits) {
    this.#registerSizeInBits = registerSizeInBits;
    return this;
  }

  /**
   *
   * @returns {this}
   */
  exec() {
    this.#binaryEquivalent = this.#arrToBinaryString(
      this.#dataArray,
      this.#registerSizeInBits
    );
    while (this.#functionQueue.length) this.#execOne();
    return this;
  }

  /**
   *
   * @returns {this}
   */
  #execOne() {
    if (this.#functionQueue.length) {
      const { type, param } = this.#functionQueue.shift();
      type === "next" || type === "choice"
        ? this.#mappings[type].bind(this)(...param)
        : this.#mappings[type].bind(this)(param);
    }
    return this;
  }
}

module.exports = ChainedParser;
