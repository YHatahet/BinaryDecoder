"use strict";

const Queue = require("queue-fifo");

/**
 *
 * @param {number[]} array
 */
class BinaryDecoder {
  constructor(array) {
    this.#functionQueue = new Queue();
    this.#init(array);
  }

  // ================= Private Variables =================

  /**@type {Object} */ #result;
  /**@type {String} */ #endian;
  /**@type {Number} */ #bitIndex;
  /**@type {Number} */ #dataArray;
  /**@type {Queue} */ #functionQueue;
  /**@type {Boolean} */ #parseUnfinished;
  /**@type {String} */ #binaryEquivalent;
  /**@type {Number} */ #registerSizeInBits;


  // ================= Private functions =================
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
    this.#parseUnfinished = false;
    this.#binaryEquivalent = this.#arrToBinaryString(
      array,
      this.#registerSizeInBits
    );
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

  #execRegisterSize(registerSizeInBits) {
    if (this.#bitIndex === 0) this.#registerSizeInBits = registerSizeInBits;
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

    // Signedness //TODO check how this is implemented
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
      return new EmptyChainedDecoder(); // return an object whose "next" is valid but does nothing
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

  // ================= Getter functions =================

  /**
   * Fetches the result of the parsing process
   * @returns {Object}
   */
  get result() {
    return this.#result;
  }

  // ================= Instance methods =================

  /**
   * Reinitialize the decoder with new data
   * @param {number[]} array
   * @returns {this}
   */
  reset(array = this.#dataArray) {
    this.#functionQueue.enqueue({ type: "reset", param: array });
    return this;
  }

  /**
   * Skip a given number of bits
   * @param {number} numberOfBits
   * @returns {this}
   */
  skip(numberOfBits) {
    this.#functionQueue.enqueue({ type: "skip", param: numberOfBits });
    return this;
  }

  /**
   * Select the endianness to decode the next values
   * @param {'big' | 'little'} endian
   * @returns {this}
   */
  endianness(endian) {
    this.#functionQueue.enqueue({ type: "endianness", param: endian });
    return this;
  }

  /**
   * Select the register size in bits. Currently required to be set at the start.
   * @param {number} registerSizeInBits
   * @returns {this}
   */
  registerSize(registerSizeInBits) {
    this.#functionQueue.enqueue({
      type: "registerSize",
      param: registerSizeInBits,
    });
    return this;
  }

  /**
   * Choose to parse unfinished data or not.
   * @param {boolean} choice
   * @returns {this}
   */
  parseUnfinished(choice) {
    this.#functionQueue.enqueue({ type: "parseUnfinished", param: choice });
    return this;
  }

  /**
   *
   * @param {*} numberOfBits
   * @returns
   */
  goBack(numberOfBits) {
    this.#functionQueue.enqueue({ type: "goBack", param: numberOfBits });
    return this;
  }

  /**
   * Decode the next amount of bits and give them a name. The decoded values will be stored in ".result"
   * @param {Number} sizeInBits
   * @param {String} name
   * @param {Object} [options]
   * @param {"signed" | "unsigned"} [options.signedness]
   * @param {Function} [options.formatter]
   * @param {Function} [options.saveCondition] Function applied after formatter on value. If true, saved to result
   * @returns {this}
   */
  next(sizeInBits, name, options = {}) {
    this.#functionQueue.enqueue({
      type: "next",
      param: [sizeInBits, name, options],
    });
    return this;
  }


  #mappings = {
    skip: this.#execSkip,
    next: this.#execNext,
    reset: this.#execReset,
    goBack: this.#execGoBack,
    endianness: this.#execEndianness,
    registerSize: this.#execRegisterSize,
    parseUnfinished: this.#execParseUnfinished,
  };

  exec() {
    while (this.#functionQueue.size()) this.execNextStep();

    return this;
  }

  execNextStep() {
    if (this.#functionQueue.size()) {
      const { type, param } = this.#functionQueue.dequeue();
      type === "next"
        ? this.#mappings[type].bind(this)(...param)
        : this.#mappings[type].bind(this)(param);
    }
    return this;
  }
}

module.exports = BinaryDecoder;
