import { describe, expect, it } from "vitest";
import { isSummonable } from "./yokai-summon";
import { KONKATSU_LIST } from "./konkatsu-list";
import { PLAYABLE_YOKAI } from "./yokai-playable";

describe("summonable yo-kai", () => {
  it("treats konkatsu yo-kai as summonable and story yo-kai as unique", () => {
    const byName = (n: string) => PLAYABLE_YOKAI.find((y) => y.name === n)!;
    expect(isSummonable(byName("Hungramps").icon)).toBe(true);
    expect(isSummonable(byName("Jibanyan").icon)).toBe(false);
    expect(isSummonable(byName("Komasan").icon)).toBe(false);
  });

  it("maps every konkatsu entry onto the roster", () => {
    const icons = new Set(PLAYABLE_YOKAI.map((y) => y.icon));
    for (const k of KONKATSU_LIST) expect(icons.has(k.model.replace(/_.*$/, ""))).toBe(true);
  });
});
