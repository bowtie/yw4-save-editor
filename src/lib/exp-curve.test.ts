import { describe, expect, test } from "vitest";
import { EXP_RATES, HUMAN_EXP_RATE, LEVEL_CAP, carryLevelStep, expToNext } from "./exp-curve";
import { YOKAI_CURVE_CLASS, yokaiExpRate } from "./yokai-curve";
import { PLAYABLE_YOKAI } from "./yokai-playable";

describe("exp curves", () => {
  test("human rate matches the recovered formula anchors", () => {
    expect(HUMAN_EXP_RATE).toBe(1.18);
    // truncation, not rounding: 1.18 x 1801 vs the native getter's anchors
    expect(expToNext(24)).toBe(2125);
    expect(expToNext(25)).toBe(2302);
  });

  test("per-class rates apply their own multiplier", () => {
    // threshold(25) - threshold(24) per class, all trunc()
    expect(expToNext(24, EXP_RATES[0])).toBe(1801);
    expect(expToNext(24, EXP_RATES[1])).toBe(1315);
    expect(expToNext(24, EXP_RATES[6])).toBe(
      Math.trunc(1.27 * 25 ** 3) - Math.trunc(1.27 * 24 ** 3),
    );
  });

  test("requirement grows and stays an integer below the cap", () => {
    let prev = 0;
    for (const rate of EXP_RATES) {
      prev = 0;
      for (let lv = 1; lv < LEVEL_CAP; lv++) {
        const req = expToNext(lv, rate);
        expect(Number.isInteger(req)).toBe(true);
        expect(req).toBeGreaterThan(prev);
        prev = req;
      }
    }
  });

  test("every playable species has a curve class", () => {
    for (const y of PLAYABLE_YOKAI) {
      if (y.id === 0) continue; // placeholder row
      expect(YOKAI_CURVE_CLASS[y.id]).toBeDefined();
      expect(yokaiExpRate(y.id, EXP_RATES)).toBeGreaterThan(0);
    }
  });

  test("unknown species falls back to the class-0 standard curve", () => {
    expect(yokaiExpRate(0xdeadbeef, EXP_RATES)).toBe(EXP_RATES[0]);
  });

  test("carries EXP steps across level boundaries", () => {
    expect(carryLevelStep(50, 1)).toEqual({ level: 51, xp: 0 });
    expect(carryLevelStep(50, -1)).toEqual({ level: 49, xp: expToNext(49) });
    expect(carryLevelStep(50, -1, EXP_RATES[0])).toEqual({
      level: 49,
      xp: expToNext(49, EXP_RATES[0]),
    });
    // The two directions invert each other at the boundary.
    const down = carryLevelStep(50, -1)!;
    expect(down.xp).toBe(expToNext(down.level));
  });

  test("cannot carry past the level cap or below level 1", () => {
    expect(carryLevelStep(LEVEL_CAP, 1)).toBeNull();
    expect(carryLevelStep(1, -1)).toBeNull();
  });
});
