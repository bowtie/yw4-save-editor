import { describe, expect, it } from "vitest";
import { PLAYABLE_YOKAI } from "./yokai-playable";
import {
  FRIEND_SUMMONS,
  PLAYER_SCALE_PARAM_IDS,
  STAT_KEYS,
  YOKAI_SPECIES_COUNT,
  isFriendSummon,
  playerStatScaleAtLevel,
  statAtLevel,
  statsAtLevel,
  yokaiStatsAtLevel,
  yokaiStatsFor,
} from "./yokai-stats";

describe("base stats", () => {
  it("keeps all 367 canonical species", () => {
    expect(YOKAI_SPECIES_COUNT).toBe(367);
  });

  it("covers every addable yo-kai, including boss and special entries", () => {
    const missing = PLAYABLE_YOKAI.filter((y) => !yokaiStatsFor(y.id));
    expect(missing.map((y) => y.name)).toEqual([]);
  });

  it("resolves alternate ParamIDs to the canonical playable row", () => {
    // Juno's first row is boss-scaled; the later row is the playable one.
    expect(yokaiStatsFor(3512799532)).toEqual(yokaiStatsFor(3239906695));
    expect(yokaiStatsAtLevel(3512799532, 1)?.hp).toBe(126);
  });

  it("returns undefined for a species without a param row", () => {
    expect(yokaiStatsFor(0xdeadbeef)).toBeUndefined();
    expect(yokaiStatsAtLevel(0xdeadbeef, 99)).toBeUndefined();
  });

  it("interpolates between the level anchors with half-up rounding", () => {
    expect(statAtLevel(130, 718, 844, 1)).toBe(130);
    expect(statAtLevel(130, 718, 844, 50)).toBe(424);
    expect(statAtLevel(130, 718, 844, 99)).toBe(718);
    expect(statAtLevel(130, 718, 844, 100)).toBe(724);
    expect(statAtLevel(130, 718, 844, 110)).toBe(784);
    expect(statAtLevel(130, 718, 844, 120)).toBe(844);
    // 49/98 is exactly one half, which rounds up.
    expect(statAtLevel(0, 1, 1, 50)).toBe(1);
  });

  it("clamps levels outside the anchor range", () => {
    expect(statAtLevel(130, 718, 844, 0)).toBe(130);
    expect(statAtLevel(130, 718, 844, -5)).toBe(130);
    expect(statAtLevel(130, 718, 844, 200)).toBe(844);
  });

  it("builds all six stats at once", () => {
    const anchors = yokaiStatsFor(203904710)!;
    expect(statsAtLevel(anchors, 99)).toEqual({
      hp: 718,
      str: 453,
      spr: 430,
      def: 308,
      res: 328,
      yp: 163,
    });
    expect(Object.keys(statsAtLevel(anchors, 1))).toEqual([...STAT_KEYS]);
  });

  it("uses the three _friend rows for the variable ally summons", () => {
    const expected = [
      [203904710, "Shien", 130],
      [1994851750, "Yamamba", 121],
      [3301431734, "Tamamo no Mae", 119],
    ] as const;
    expect(FRIEND_SUMMONS).toHaveLength(3);
    for (const [paramId, name, hp] of expected) {
      expect(FRIEND_SUMMONS.find((summon) => summon.paramId === paramId)?.name).toBe(name);
      expect(yokaiStatsAtLevel(paramId, 1)?.hp).toBe(hp);
      expect(isFriendSummon(paramId)).toBe(true);
    }
    // The boss forms are separate BaseIDs and must not inherit friend stats.
    expect(isFriendSummon(2125108336)).toBe(false);
    expect(isFriendSummon(2625015561)).toBe(false);
  });

  it("sizes the stat bars against the 225 player-scale species", () => {
    expect(PLAYER_SCALE_PARAM_IDS).toHaveLength(225);
    expect(PLAYER_SCALE_PARAM_IDS.every((paramId) => yokaiStatsFor(paramId))).toBe(true);

    // Anchors for the best playable species at each level.
    expect(playerStatScaleAtLevel(1).hp).toBe(155);
    expect(playerStatScaleAtLevel(99).hp).toBe(832);
    expect(playerStatScaleAtLevel(120).hp).toBe(980);
  });

  it("matches the best player-scale value for every stat and level", () => {
    for (const level of [1, 37, 50, 99, 100, 110, 120]) {
      const scale = playerStatScaleAtLevel(level);
      for (const key of STAT_KEYS) {
        let best = 0;
        for (const paramId of PLAYER_SCALE_PARAM_IDS) {
          best = Math.max(best, yokaiStatsAtLevel(paramId, level)![key]);
        }
        expect(scale[key]).toBe(best);
      }
    }
  });

  it("never shrinks the bar scale as the level rises", () => {
    const levels = [1, 25, 50, 75, 99, 100, 110, 120];
    let previous = playerStatScaleAtLevel(levels[0]);
    for (const level of levels.slice(1)) {
      const current = playerStatScaleAtLevel(level);
      for (const key of STAT_KEYS) {
        expect(current[key]).toBeGreaterThanOrEqual(previous[key]);
      }
      previous = current;
    }
  });

  it("caches the bar scale per level", () => {
    expect(playerStatScaleAtLevel(99)).toBe(playerStatScaleAtLevel(99));
  });
});
