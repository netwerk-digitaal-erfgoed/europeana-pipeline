import Ratt from "@triply/ratt";
import mw from "@triply/ratt/lib/middlewares";
import { expect } from "chai";

/**
 * Just a dummy test file for demonstration purposes, so setting to skipped
 */
describe.skip("Middlewares", () => {
  it("Head", async () => {
    let count = 0;
    const app = new Ratt({
      defaultGraph: 'https://example.org/'
    });
    mw.fromJson([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }]);
    app.use(async () => {
      count++;
    });
    await app.run();
    expect(count).to.equal(5);
  });
});
