
import index = require("../src/index");
import * as chai from "chai";

const expect = chai.expect;

describe("index", () => {
  it("should provide Transformer", () => {
    expect(index.Transformer).to.not.be.undefined;
  });
});
