const {
  arrToBinaryString,
  unsignedToSignedBits,
} = require("./BinaryDecoderFunctions");
const { test } = require("zora");

// Testing unsigned to signed transformations
test("8x 1's, follows by 16x 0's, and then 8x 1's", (t) => {
  t.equal(
    arrToBinaryString([255, 0, 0, 255]),
    "11111111000000000000000011111111"
  );
});

// Testing unsigned to signed transformations
test("Only sign should change", (t) => {
  t.equal(unsignedToSignedBits(0b10000000, 8), -1 * 0b10000000);
});

test("No changes should occur", (t) => {
  t.equal(unsignedToSignedBits(0b00000111, 8), 0b00000111);
});

test("7 should give -1 when having a size of 3 bits", (t) => {
  t.equal(unsignedToSignedBits(0b00000111, 3), -1);
});
