const { arrToBinaryString } = require("./BinaryDecoderFunctions");

test("Converting Array to Binary String ", () => {
  expect(arrToBinaryString([255, 0, 0, 255])).toBe(
    "11111111000000000000000011111111"
  );
});
