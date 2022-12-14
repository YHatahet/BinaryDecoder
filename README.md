# Chained Parser

This parser is meant to handle data in the form of an `Array` or a `Buffer` object.
This parser was built in order to reduce the repetitiveness of creating parsers, and to make modifications simple.

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
  const parserResult = chainedParser
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
    .next(31, "engineState")
    .result; // fetching the result immediately

  /**
   * Expected Output:
   *
   * latitude: 90,
   * longitude: 180,
   * altitude: 20000,
   * speed: 828,
   * heading: 52.7,
   * fixTime: 0,
   * smokeSensor: 1,
   * panicButton: 1,
   * doorSensor: 1,
   * alarmSensor: 1,
   * immobilizer: 1,
   * engineState: 6,
   */

```

# API

## .reset(newArray)

Reinitialize the decoder with new data

## .skip(numOfBits)

The parser will skip a given number of bits in the binary equivalent representation of the data.
numOfBits: Number of bits to skip

## .endianness(endian)

Select the endianness to decode the next values
big | little

## .registerSize(registerSizeInBits)

Select the register size in bits. Currently only able to be set at the start. The register size is the size of every entry in the array. For example if we have a register size of 8, then the numeric value of every entry in the array must not exceed 2^8 - 1. This means that the leftmost bit in the binary representation of the value must be at most (8 - 1) spots to the left.


## .parseUnfinished(choice)

Choose to parse unfinished data or not.
choice: boolean

## .goBack(numOfBits)
Go back a select number of bits.
## .next(sizeInBits, name, {options})
options: formatter, signedness, saveCondition

## .choice(key, {paths})

