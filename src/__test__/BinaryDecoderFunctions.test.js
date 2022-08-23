const {
  arrToBinaryString,
  unsignedToSignedBits,
} = require("./BinaryDecoderFunctions");

// Testing unsigned to signed transformations
test("8x 1's, follows by 16x 0's, and then 8x 1's", () => {
  expect(arrToBinaryString([255, 0, 0, 255])).toBe(
    "11111111000000000000000011111111"
  );
});

// Testing unsigned to signed transformations
test("Only sign should change", () => {
  expect(unsignedToSignedBits(0b10000000, 8)).toBe(-1 * 0b10000000);
});

test("No changes should occur", () => {
  expect(unsignedToSignedBits(0b00000111, 8)).toBe(0b00000111);
});

test("7 should give -1 when having a size of 3 bits", () => {
  expect(unsignedToSignedBits(0b00000111, 3)).toBe(-1);
});
