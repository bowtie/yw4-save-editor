import { describe, expect, it } from "vitest";
import { modelParamId, tribeInfo } from "./tribes";
import { yokaiTribe } from "./yokai-base";
import { PLAYABLE_YOKAI } from "./yokai-playable";

describe("tribes", () => {
  it("hashes model names the way the tribe table keys them (crc32)", () => {
    expect(modelParamId("y02010000")).toBe(3051097043);
  });

  it("finds a tribe for nearly every addable yo-kai", () => {
    const roster = PLAYABLE_YOKAI.filter((y) => y.section === "yokai");
    const missing = roster.filter((y) => !tribeInfo(yokaiTribe(modelParamId(y.icon))));
    // Soulmian and the Mikakunin placeholder have no chara_base battle row.
    expect(missing.length).toBeLessThanOrEqual(2);
  });
});
