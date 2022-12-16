# Chained Parser

- [Installation](#installation)
- [Introduction](#introduction)
  - [Summary](#summary)
  - [How it works](#how-it-works)
  - [Example](#example)
- [API](#api)
  - [**.next(sizeInBits, name\[, options\]})\`**](#nextsizeinbits-name-options)
  - [**.choice(key, paths, defaultPath)**](#choicekey-paths-defaultpath)
  - [**.reset(newArray)**](#resetnewarray)
  - [**.skip(numOfBits)**](#skipnumofbits)
  - [**.endianness(endian)**](#endiannessendian)
  - [**.registerSize(registerSizeInBits)**](#registersizeregistersizeinbits)
  - [**.parseUnfinished(toParse)**](#parseunfinishedtoparse)
  - [**.goBack(numOfBits)**](#gobacknumofbits)

<br>

# Installation

`npm install BinaryDecoder`

# Introduction

## Summary
This parser is meant to handle data in the form of an `Array` or a `Buffer` object.
This parser was built in order to reduce the repetitiveness of creating parsers, and to make modifications simple.

## How it works

On instantiation, the data is converted into its binary equivalent as a string. This binary result depends on the `registerSizeInBits` private variable, which can be set via the `.registerSize` instance method. If the registerSize is 8-bits (which is the default), each entry in the array/buffer object is converted into its 8-bit binary equivalent (by padding 0's to the left) and then concatenated to form the `binaryEquivalent` private variable. <br>
After forming the `binaryEquivalent` string, the instance method `next` is used to parse and traverse the string.

## Example

```
  // Import library
  const ChainedParser = require('chained-parser');

  // Declare/fetch the data that needs to be parsed
  const data = [
    128, 1, 82, 101, 192, 82, 101, 192, 0, 3, 13, 64, 207, 32, 240, 0, 0, 0, 0,
    0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 1,
    128,
  ];

  // Create the parser instance
  // The data can be either an array or a Buffer Object
  const chainedParser = new ChainedParser(data);


  // Creating some custom formatters to be used inside the parser
  const latLongFormatter = (value) => value / 60000;
  const altitudeFormatter = (value) => value / 10;
  const speedFormatter = (value) => value * 5/18; // km/h to m/s
  const headingFormatter = (value) => value / 10;

  // Set up the parser
  const parser = chainedParser
    .skip(16) // skip the first two bytes (constants)
    .next(24, "latitude", { formatter: latLongFormatter, signedness: "signed" })
    .next(25, "longitude", { formatter: latLongFormatter, signedness: "signed" })
    .next(31, "altitude", { formatter: altitudeFormatter })
    .next(10, "speed", { formatter: speedFormatter })
    .next(10, "heading", { formatter: headingFormatter })
    .next(31, "fixTime")
    .skip(31).next(1, "smokeSensor")
    .skip(31).next(1, "panicButton")
    .skip(31).next(1, "doorSensor")
    .skip(31).next(1, "alarmSensor")
    .skip(31).next(1, "immobilizer")
    .next(31, "engineState");

  const parserResult = parser.result;
  // Note: the .result can chained to the declaration to fetch results immediately

  /**
   * Expected Output:
   * {
   *   latitude: 90,
   *   longitude: 180,
   *   altitude: 20000,
   *   speed: 828,
   *   heading: 52.7,
   *   fixTime: 0,
   *   smokeSensor: 1,
   *   panicButton: 1,
   *   doorSensor: 1,
   *   alarmSensor: 1,
   *   immobilizer: 1,
   *   engineState: 6
   * }
   */

```

# API

## **.next(sizeInBits, name[, options]})`**

Parse the next select number of bits and store them

- `sizeInBits` : (required) The number of bits to parse from the binary equivalent representation of the data. Must be an integer.
- `name` : (required) The key of the JSON object where the result of the parser will be stored.
- `options` : (optional) An object containing options which may alter the output of the parser. These options are:
  - `formatter`: A function that takes in the parsed value and returns a formatted version to be saved. The formatter function can return any type.
  - `signedness`: Controls the sign of the parsed result. The value must be either `signed` or `unsigned`.
  - `saveCondition`: A function that takes in the parsed value and must return a `boolean` type. The returned value determines whether the parsed value will be saved in the result or not.
  - `continueCondition`: A function that takes in the parsed value and must return a `boolean` type. The returned value determines whether the parser will continue parsing or not. If `false` is returned, even the current parsed value is not saved.

```
  const data = [255, 0, 0, 255];

  const parser = new ChainedParser(data);

  const output1 = parser
    .next(8, "firstByte")
    .next(8, "secondByte")
    .next(8, "thirdByte")
    .next(8, "fourthByte").result;

  /**
   * Expected Output 1:
   * {
   *   firstByte: 255,
   *   secondByte: 0,
   *   thirdByte: 0,
   *   fourthByte: 255,
   * }
   */

  const output2 = parser
    .reset() //parse the same array
    .next(16, "firstHalf")
    .next(16, "secondHalf").result;

  /**
   * Expected Output 1:
   * {
   *   firstHalf: 65280,
   *   secondHalf: 255,
   * }
   */
```

## **.choice(key, paths, defaultPath)**

Checks a previously parsed key, and selects a parser path based on the key's value.

- `key` : (required) The key whose value will be checked from the currently parsed data.
- `paths` : (required) An object whose keys are compared against, and whose values are chained parser paths.
- `defaultPath` : (optional) A default path which is used if all that `paths` keys do not match with the value of the selected key.

```
  const data = [1, 2, 3, 4];

  const parser = new ChainedParser(data);

  const parser1 = new ChainedParser().next(16, "thirdAndFourthBytes");

  const parser2 = new ChainedParser()
    .next(8, "secondByte")
    .choice("firstByte", {
      1: parser1,
    });

  const parser3 = new ChainedParser()
    .next(8, "secondByte", { formatter: (val) => val + 10 })
    .next(16, "thirdAndFourthBytes");

  const output = parser.next(8, "firstByte").choice(
    "firstByte", // value is 1
    {
      10: parser3, // not used
    },
    parser2 // default path, used.
  ).result;

  /**
 * Expected output:
 * {
 *   firstByte: 1,
 *   secondByte: 2,
 *   thirdAndFourthBytes: 772
 * }
 */
```

## **.reset(newArray)**

Reinitialize the decoder with new data. <br>

- `newArray` : (optional) An `Array` or `Buffer` object containing data to be parsed. If left empty, the same array which the parser instance is initiated with is re-parsed.

```
const data1 = Buffer.from([1,2,3]);
const data2 = Buffer.from([4,5,6]);

const chainedParser = new ChainedParser(data1);
const parser = chainedParser.next(24, "threeBytesOfData");

const parserResult1 = parser.result()
const parserResult2 = chainedParser
  .reset(data2)
  .next(24,"threeBytesOfData")
  .result();

```

## **.skip(numOfBits)**

Skip a given number of bits in the binary equivalent representation of the data.

- `numOfBits` : (required) Number of bits to skip. Must be an integer.

```
const data = [1,2];

const parser = new ChainedParser(data)
  .skip(8)
  .next(8, "secondByte");

/**
 * Expected output:
 * {
 *   secondByte: 2
 * }
 */
```

## **.endianness(endian)**

Select the endianness to decode the next values.

- `endian` : (required) defines the endianness of the values from that point onwards. The endianness can be changed at any point during the parsing process. The value must be selected as `big` or `little`.

```
  const data = [0x12, 0x34, 0x12, 0x34];

  const parser = new ChainedParser(data);

  const output = parser
    .endianness("big")
    .next(8, "big8BitsA")
    .next(8, "big8BitsB")
    .goBack(16)
    .next(16, "big16Bits")
    .endianness("little")
    .next(16, "small16Bits").result;


  /**
   * Expected output:
   * {
   *    big8BitsA: 18,
   *    big8BitsB: 52,
   *    bi16Bits: 4660,
   *    small16Bits: 11336,
   * }
   */
```

## **.registerSize(registerSizeInBits)**

Select the register size in bits. Currently is only set once (the most recent usage of the method in the parser chain).
The register size is the size of every entry in the array. For example if we have a register size of 8, then the numeric value of every entry in the array must not exceed 2^8 - 1.
This means that the leftmost bit in the binary representation of the value must be at most (8 - 1) spots to the left.

- `registerSizeInBits` : (required) the size of the register in bits. Must be an integer.

```
  const data = [1, 1, 1, 1];

  const parser = new ChainedParser(data);

  const output1 = parser
    .registerSize(8) // 8 bits by default.
    .next(8, "firstByte")
    .next(8, "secondByte")
    .next(8, "thirdByte")
    .next(8, "fourthByte").result;

  /**
   * expected output:
   * {
   *  firstByte: 1,
   *  secondByte: 1,
   *  thirdByte: 1,
   *  fourthByte: 1,
   * }
   */

  const output2 = parser
    .reset() // re-parse the same array
    .registerSize(4)
    .next(8, "firstByte")
    .next(8, "secondByte").result;

  /**
   * expected output:
   * {
   *  firstByte: 17, // 0b00010001
   *  secondByte: 17, // 0b00010001
   * }
   */

```

## **.parseUnfinished(toParse)**

Choose to parse unfinished data or not.

- `toParse` : (required) The flag that tells the program whether to parse the data or not. Must be a boolean; `true` or `false`.

```
  const data = [0xf0, 0x0f, 0xff, 0xaa];

  const parser = new ChainedParser(data);

  const output1 = parser
    .skip(3 * 8) // skip 3 bytes
    .next(6, "bits_24_to_30")
    .next(3, "shouldntExist").result;

  /**
   * Expected Output
   * {
   *  bits_24_to_30: 0b101010
   * }
   */

  const output2 = parser
    .reset() // re-parse the same array
    .parseUnfinished(true) // false by default, set as true
    .skip(3 * 8) // skip 3 bytes
    .next(6, "bits_24_to_30")
    .next(3, "unfinishedData").result;

  // Should not parse unfinished data
  /**
   * Expected Output
   * {
   *  bits_24_to_30: 0b101010,
   *  unfinishedData: 0b10 // parsed as 2 bits
   * }
   */

```

## **.goBack(numOfBits)**

Go back a select number of bits in the binary equivalent representation of the data.

- `numOfBits` : (required) Number of bits to go back. Must be an integer.

```
const data = [0x55]; // binary 01010101

const countOnesAlternatingBits = (val) =>{
  let result = 0;
  while (val) {
    result += val & 1;
    val >>= 2;
  }
  return result;
}

const parser = new ChainedParser(data)
  // should count 4 bits
  .next(8, "evenBitsCount", { formatter: countOnesAlternatingBits })
  // go back 8 bits
  .goBack(8)
  // should count 2 bits
  .next(8, "oddBitsCount", { formatter: (val) => countOnesAlternatingBits(val >> 1) })

```
