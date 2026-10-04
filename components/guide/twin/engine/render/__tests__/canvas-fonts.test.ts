/**
 * three is ESM; this Jest setup runs CommonJS. Node 24 can require() ES modules natively, so the
 * mock hands over the real module through Node's own loader (process.getBuiltinModule bypasses
 * Jest's module registry).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));

import { canvasFont, fontReady } from "../canvas";

type FontsLike = { load: (font: string) => Promise<unknown>; check: (font: string) => boolean };

function withFonts(fonts: FontsLike | undefined, run: () => Promise<void>) {
  const doc = document as unknown as { fonts?: FontsLike };
  const before = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
  return run().finally(() => {
    if (before) Object.defineProperty(document, "fonts", before);
    else delete doc.fonts;
  });
}

describe("canvas lettering fonts", () => {
  it("builds CSS font strings for the site faces", () => {
    expect(canvasFont(32, "mono", 700)).toMatch(/^700 32px .*monospace/);
    expect(canvasFont(20, "sans", 500)).toMatch(/^500 20px .*sans-serif/);
  });

  it("waits for the web font before lettering (and caches the wait per face)", async () => {
    const load = jest.fn((font: string) => Promise.resolve([font]));
    await withFonts({ load, check: () => false }, async () => {
      await fontReady("mono", 700);
      await fontReady("mono", 700);
      expect(load).toHaveBeenCalledTimes(1);
      expect(load.mock.calls[0][0]).toMatch(/^700 32px /);
    });
  });

  it("never blocks a texture: a failing or hanging font load still resolves", async () => {
    await withFonts({ load: () => Promise.reject(new Error("offline")), check: () => false }, () => fontReady("sans", 401));
    jest.useFakeTimers();
    try {
      await withFonts({ load: () => new Promise(() => undefined), check: () => false }, async () => {
        const done = jest.fn();
        const p = fontReady("sans", 402, 3000).then(done);
        await Promise.resolve();
        expect(done).not.toHaveBeenCalled();
        jest.advanceTimersByTime(3000);
        await p;
        expect(done).toHaveBeenCalled();
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
