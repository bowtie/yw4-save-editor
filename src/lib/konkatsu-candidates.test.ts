import { describe, expect, it } from "vitest";
import { parseSave, type ParsedSave } from "./save-format";
import { modelParamId } from "./tribes";
import {
  KONKATSU_BOARD,
  konkatsuCandidatesBySpecies,
  readKonkatsuCandidates,
} from "./konkatsu-candidates";
import {
  KONKATSU_LIST,
  KONKATSU_SPECIES_PARAM_ID,
  konkatsuSpeciesParamId,
  konkatsuTradeMoney,
} from "./konkatsu-list";
import { yokaiStatsAtLevel, yokaiStatsFor } from "./yokai-stats";
import { nameForParam } from "./characters";

const CELL = KONKATSU_BOARD.cellSize;
const FIRST = KONKATSU_BOARD.firstCell;

const TAG = {
  paramId: modelParamId("param_id_crc"),
  prmRandom: modelParamId("prm_random"),
  personality: modelParamId("personality"),
  nowLv: modelParamId("nowLv"),
  isRare: modelParamId("isRare"),
};

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function u8(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff);
}

interface Seed {
  paramId: number;
  level?: number;
  personality?: number;
  growth?: number[];
  isRare?: boolean;
}

/** One-section save with a 0x1005 candidate pool; cells before the pool are
 *  left empty, exactly like the game's [party][roster] prefix. */
function boardSave(seeds: Seed[]): ParsedSave {
  const body = (FIRST + seeds.length + 1) * CELL;
  const data = new Uint8Array(16 + body + 12);
  const v = new DataView(data.buffer);
  data[0] = 0xee;
  data[1] = 0xff;
  v.setUint16(2, 0x1005, true);
  v.setUint32(4, 16 + body, true);
  v.setUint32(8, 0x00bda133, true);
  v.setUint32(12, 0x01000000, true);

  const writeTag = (offset: number, key: number, value: Uint8Array): number => {
    v.setUint32(offset, key, true);
    v.setUint32(offset + 4, value.length, true);
    data.set(value, offset + 8);
    return offset + 8 + value.length;
  };

  seeds.forEach((seed, i) => {
    let o = 16 + (FIRST + i) * CELL + 16;
    o = writeTag(o, TAG.paramId, u32(seed.paramId));
    if (seed.level !== undefined) o = writeTag(o, TAG.nowLv, u32(seed.level));
    if (seed.growth) o = writeTag(o, TAG.prmRandom, Uint8Array.from(seed.growth));
    if (seed.personality !== undefined) o = writeTag(o, TAG.personality, u8(seed.personality));
    if (seed.isRare !== undefined) o = writeTag(o, TAG.isRare, u8(seed.isRare ? 1 : 0));
  });

  const marker = 16 + body;
  v.setUint32(marker, 0x00bda133, true);
  v.setUint16(marker + 4, 0, true);
  v.setUint16(marker + 6, 0x0200, true);
  data[marker + 8] = 0xff;
  data[marker + 9] = 0xef;
  return parseSave(data);
}

describe("match-board candidates", () => {
  it("reads level, personality, growth and rare flag per cell", () => {
    const parsed = boardSave([
      { paramId: 2850816423, level: 2, personality: 7, growth: [14, 5, 12, 4, 10, 10] },
      { paramId: 2850816423, level: 5, personality: 1, growth: [14, 8, 7, 8, 10, 8] },
      {
        paramId: 4278806890,
        level: 7,
        personality: 7,
        growth: [14, 7, 12, 10, 4, 8],
        isRare: true,
      },
    ]);
    const candidates = readKonkatsuCandidates(parsed);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      slot: 0,
      paramId: 2850816423,
      speciesParamId: 2850816423,
      level: 2,
      personality: 7,
      growth: [14, 5, 12, 4, 10, 10],
      isRare: false,
    });
    expect(candidates[2]).toMatchObject({
      paramId: 4278806890,
      // Alternate row resolves to the canonical Blazion ParamID.
      speciesParamId: 2850816423,
      level: 7,
      isRare: true,
    });
  });

  it("skips empty cells and cells without a usable level", () => {
    const parsed = boardSave([
      { paramId: 2850816423, level: 2 },
      { paramId: 0, level: 5 },
      { paramId: 2850816423 },
      { paramId: 2850816423, level: 200 },
    ]);
    expect(readKonkatsuCandidates(parsed)).toHaveLength(1);
  });

  it("groups the three rolled candidates under one species row", () => {
    const parsed = boardSave([
      { paramId: 2850816423, level: 2 },
      { paramId: 4278806890, level: 5 },
      { paramId: 2850816423, level: 7 },
    ]);
    const groups = konkatsuCandidatesBySpecies(parsed);
    expect(groups.size).toBe(1);
    expect(groups.get(2850816423)?.map((c) => c.level)).toEqual([2, 5, 7]);
  });

  it("returns no candidates when the save has no 0x1005 section", () => {
    const empty = new Uint8Array(28);
    const v = new DataView(empty.buffer);
    empty[0] = 0xee;
    empty[1] = 0xff;
    v.setUint16(2, 0x1001, true);
    v.setUint32(4, 16, true);
    v.setUint32(8, 0x00bda133, true);
    v.setUint32(12, 0x01000000, true);
    v.setUint32(16, 0x00bda133, true);
    v.setUint16(20, 0, true);
    v.setUint16(22, 0x0200, true);
    empty[24] = 0xff;
    empty[25] = 0xef;
    expect(readKonkatsuCandidates(parseSave(empty))).toEqual([]);
  });
});

describe("soul-summon prices", () => {
  const blazion = KONKATSU_LIST.find((entry) => entry.paramId === 3059767046)!;

  it("bridges every ledger BaseID to a stat row", () => {
    expect(Object.keys(KONKATSU_SPECIES_PARAM_ID)).toHaveLength(KONKATSU_LIST.length);
    for (const entry of KONKATSU_LIST) {
      const paramId = konkatsuSpeciesParamId(entry.paramId);
      expect(paramId, entry.name).toBeDefined();
      expect(yokaiStatsFor(paramId!), entry.name).toBeDefined();
    }
    expect(konkatsuSpeciesParamId(3059767046)).toBe(2850816423);
  });

  it("distinguishes timeline forms by their ParamID name", () => {
    const lightsider = KONKATSU_LIST.find((entry) => entry.paramId === 1289002558)!;
    expect(nameForParam(konkatsuSpeciesParamId(blazion.paramId)!)).toBe("Blazion (Present)");
    expect(nameForParam(konkatsuSpeciesParamId(lightsider.paramId)!)).toBe("Blazion (Lightside)");
  });

  it("scales money by level above 1, with a x10 rare surcharge", () => {
    expect(blazion.money).toBe(1000);
    expect(blazion.moneyAdd).toBe(60);
    expect(konkatsuTradeMoney(blazion, 2, false)).toBe(1060);
    expect(konkatsuTradeMoney(blazion, 5, false)).toBe(1240);
    expect(konkatsuTradeMoney(blazion, 7, false)).toBe(1360);
    expect(konkatsuTradeMoney(blazion, 2, true)).toBe(1600);
    expect(konkatsuTradeMoney(blazion, 1, true)).toBe(1000);
  });

  it("uses species base stats at each candidate level", () => {
    expect(yokaiStatsAtLevel(2850816423, 2)).toMatchObject({ hp: 96, str: 29, yp: 66 });
    expect(yokaiStatsAtLevel(2850816423, 5)).toMatchObject({ hp: 112, str: 37, yp: 68 });
    expect(yokaiStatsAtLevel(2850816423, 7)).toMatchObject({ hp: 123, str: 42, yp: 70 });
  });
});
