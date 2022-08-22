const BinaryDecoder = require("../BinaryDecoder");

test("Testing basic 'next' method", () => {
  const data = [255, 0, 0, 255];

  const BD = new BinaryDecoder(data);

  const output1 = BD.next(8, "firstByte")
    .next(8, "secondByte")
    .next(8, "thirdByte")
    .next(8, "fourthByte").result;

  const expected1 = {
    firstByte: 255,
    secondByte: 0,
    thirdByte: 0,
    fourthByte: 255,
  };

  expect(output1).toStrictEqual(expected1);

  const output2 = BD.reset()
    .next(16, "firstHalf")
    .next(16, "secondHalf").result;

  const expected2 = {
    firstHalf: 65280,
    secondHalf: 255,
  };

  expect(output2).toStrictEqual(expected2);
});
