# Chained Parser

Decodes data sequentially.
It takes in an Array or Buffer 

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

