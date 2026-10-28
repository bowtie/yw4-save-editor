import { describe, expect, it } from "vitest";
import { parseSave } from "./save-format";
import { buildSkeleton } from "./test-skeleton";
import { itemsOfCategory } from "./item-data";
import {
  SWITCH_SECTION2_START,
  bulkStart,
  clearSlot,
  giveItem,
  giveKeyItem,
  INVENTORIES,
  readInventory,
  readKeyItemLog,
  readPlayer,
  readYoKaiSouls,
  setEquipped,
  setQuantity,
  setYoKaiSoul,
  writeCrank,
  writeMoney,
  writeName,
  YOKAI_SOULS,
} from "./editor";

const skeleton = () => parseSave(buildSkeleton("switch"));
const ps4Skeleton = () => parseSave(buildSkeleton("ps4"));
const food = () => itemsOfCategory("consumable");

describe("editor layout", () => {
  it("computes the same bulk start the real Switch save has", () => {
    expect(SWITCH_SECTION2_START).toBe(35395);
    expect(bulkStart(skeleton())).toBe(SWITCH_SECTION2_START);
  });

  it("maps bulk offsets for PS4 saves through their section-2 anchor", () => {
    // PS4 section 2 starts 211 bytes earlier than Switch (measured on
    // converted saves).
    expect(bulkStart(ps4Skeleton())).toBe(SWITCH_SECTION2_START - 211);
  });
});

describe("player fields", () => {
  it("round-trips money", () => {
    const parsed = skeleton();
    expect(readPlayer(parsed).money).toBe(0);
    writeMoney(parsed, 4581);
    expect(readPlayer(parsed).money).toBe(4581);
  });

  it("round-trips money at the u32 storage bounds", () => {
    const parsed = skeleton();
    writeMoney(parsed, 0xffffffff);
    expect(readPlayer(parsed).money).toBe(0xffffffff);
    writeMoney(parsed, 0);
    expect(readPlayer(parsed).money).toBe(0);
  });

  it("keeps special characters in names (UTF-8 encoded)", () => {
    const parsed = skeleton();
    writeName(parsed, 0, "Ünïcøde🐱");
    expect(readPlayer(parsed).names[0]).toBe("Ünïcøde🐱");
    // Exactly 36 UTF-8 bytes (12 Japanese chars) fits a slot.
    writeName(parsed, 1, "あ".repeat(12));
    expect(readPlayer(parsed).names[1]).toBe("あ".repeat(12));
  });

  it("accepts empty names and overwrites stale bytes", () => {
    const parsed = skeleton();
    writeName(parsed, 0, "Temporary");
    writeName(parsed, 0, "");
    expect(readPlayer(parsed).names[0]).toBe("");
    // The whole slot must be zeroed, not leave 'Temporary' behind.
    expect(() => writeName(parsed, 6, "x")).toThrow(/out of range/);
  });

  it("rejects crank counters outside 0..3", () => {
    const parsed = skeleton();
    expect(() => writeCrank(parsed, 4, 1)).toThrow(/out of range/);
    expect(() => writeCrank(parsed, -1, 1)).toThrow(/out of range/);
  });

  it("round-trips name slots and pads with zeros", () => {
    const parsed = skeleton();
    writeName(parsed, 0, "Nate");
    writeName(parsed, 3, "Katie-Prime");
    const info = readPlayer(parsed);
    expect(info.names[0]).toBe("Nate");
    expect(info.names[1]).toBe("");
    expect(info.names[3]).toBe("Katie-Prime");
  });

  it("rejects names longer than one slot", () => {
    const parsed = skeleton();
    // 36 bytes is the slot size; 13 Japanese chars = 39 bytes must throw
    expect(() => writeName(parsed, 0, "あ".repeat(13))).toThrow(/too long/);
    expect(() => writeName(parsed, 0, "あ".repeat(12))).not.toThrow();
  });

  it("round-trips crank counters", () => {
    const parsed = skeleton();
    writeCrank(parsed, 0, 9);
    writeCrank(parsed, 3, 2);
    const info = readPlayer(parsed);
    expect(info.crank).toEqual([9, 0, 0, 2]);
  });
});

describe("inventories", () => {
  it("gives an item into an empty slot with the documented layout", () => {
    const parsed = skeleton();
    const [first] = food();
    const slot = giveItem(parsed, INVENTORIES.bag, first.crc, 99);
    expect(slot).toBe(0);
    const owned = readInventory(parsed, INVENTORIES.bag);
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ index: 0, crc: first.crc, quantity: 99, name: first.name });
  });

  it("giving the same item twice does not duplicate it", () => {
    const parsed = skeleton();
    const [first] = food();
    expect(giveItem(parsed, INVENTORIES.bag, first.crc, 99)).toBe(0);
    expect(giveItem(parsed, INVENTORIES.bag, first.crc, 50)).toBe(0);
    expect(readInventory(parsed, INVENTORIES.bag)).toHaveLength(1);
  });

  it("fills until full, then refuses", () => {
    const parsed = skeleton();
    for (let i = 0; i < INVENTORIES.bag.count; i++) {
      const crc = 0x10000 + i; // synthetic unique items, within u32
      expect(giveItem(parsed, INVENTORIES.bag, crc, 1)).not.toBeNull();
    }
    expect(giveItem(parsed, INVENTORIES.bag, 0x200000000, 1)).toBeNull();
  });

  it("edits quantities and clears slots", () => {
    const parsed = skeleton();
    const [first] = food();
    const slot = giveItem(parsed, INVENTORIES.bag, first.crc, 10)!;
    setQuantity(parsed, INVENTORIES.bag, slot, 77);
    expect(readInventory(parsed, INVENTORIES.bag)[0].quantity).toBe(77);
    clearSlot(parsed, INVENTORIES.bag, slot);
    expect(readInventory(parsed, INVENTORIES.bag)).toHaveLength(0);
  });

  it("handles quantity boundary values 0 and 0xffff", () => {
    const parsed = skeleton();
    const [first] = food();
    const slot = giveItem(parsed, INVENTORIES.bag, first.crc, 0xffff)!;
    expect(readInventory(parsed, INVENTORIES.bag)[0].quantity).toBe(0xffff);
    setQuantity(parsed, INVENTORIES.bag, slot, 0);
    expect(readInventory(parsed, INVENTORIES.bag)[0].quantity).toBe(0);
  });

  it("rejects out-of-range slot indices instead of hitting the next array", () => {
    const parsed = skeleton();
    expect(() => setQuantity(parsed, INVENTORIES.bag, INVENTORIES.bag.count, 1)).toThrow(
      /out of range/,
    );
    expect(() => setEquipped(parsed, INVENTORIES.equipment, -1, true)).toThrow(/out of range/);
    expect(() => clearSlot(parsed, INVENTORIES.souls, INVENTORIES.souls.count)).toThrow(
      /out of range/,
    );
    // The failed writes must not have modified anything.
    expect(readInventory(parsed, INVENTORIES.bag)).toHaveLength(0);
  });

  it("works through the PS4 bulk mapping", () => {
    const parsed = ps4Skeleton();
    const [first] = food();
    giveItem(parsed, INVENTORIES.bag, first.crc, 5);
    const owned = readInventory(parsed, INVENTORIES.bag);
    expect(owned).toHaveLength(1);
    expect(owned[0].quantity).toBe(5);
  });

  it("keeps the equipped flag on equipment", () => {
    const parsed = skeleton();
    const [first] = itemsOfCategory("equipment");
    const slot = giveItem(parsed, INVENTORIES.equipment, first.crc, 1)!;
    expect(readInventory(parsed, INVENTORIES.equipment)[0].equipped).toBe(0);
    clearSlot(parsed, INVENTORIES.equipment, slot);
  });
});

describe("yo-kai souls", () => {
  it("round-trips white/red/gold counters", () => {
    const parsed = skeleton();
    expect(readYoKaiSouls(parsed)).toHaveLength(0);
    setYoKaiSoul(parsed, 7, "white", 12);
    setYoKaiSoul(parsed, 7, "red", 3);
    setYoKaiSoul(parsed, 7, "gold", 1);
    const souls = readYoKaiSouls(parsed);
    expect(souls).toHaveLength(1);
    expect(souls[0]).toMatchObject({ index: 7, white: 12, red: 3, gold: 1 });
  });

  it("round-trips counters at the u16 max", () => {
    const parsed = skeleton();
    setYoKaiSoul(parsed, 499, "white", 0xffff);
    expect(readYoKaiSouls(parsed)[0]).toMatchObject({ index: 499, white: 0xffff });
  });

  it("keeps a ledger row when its last soul is taken away", () => {
    const parsed = skeleton();
    // A row the game created: species id at +12, then some souls.
    const off =
      bulkStart(parsed) + (YOKAI_SOULS.base - SWITCH_SECTION2_START) + 3 * YOKAI_SOULS.stride;
    new DataView(parsed.data.buffer, parsed.data.byteOffset).setUint32(off + 12, 0xabc12345, true);
    setYoKaiSoul(parsed, 3, "white", 2);
    setYoKaiSoul(parsed, 3, "gold", 1);
    for (const tier of ["white", "red", "gold"] as const) setYoKaiSoul(parsed, 3, tier, 0);
    expect(readYoKaiSouls(parsed).find((r) => r.paramId === 0xabc12345)).toMatchObject({
      index: 3,
      white: 0,
      red: 0,
      gold: 0,
    });
  });

  it("rejects out-of-range soul slots", () => {
    const parsed = skeleton();
    expect(() => setYoKaiSoul(parsed, 500, "white", 1)).toThrow(/out of range/);
  });
});

describe("key item acquisition log", () => {
  it("adds signatures once (idempotent) and reads them back", () => {
    const parsed = skeleton();
    const [first, second] = itemsOfCategory("key");
    expect(giveKeyItem(parsed, first.crc)).toBe(true);
    expect(giveKeyItem(parsed, first.crc)).toBe(true); // no duplicate
    expect(giveKeyItem(parsed, second.crc)).toBe(true);
    expect(readKeyItemLog(parsed)).toEqual([first.crc, second.crc]);
  });

  it("reports failure instead of overrunning the log", () => {
    const parsed = skeleton();
    // Fill every log slot (3072 u32 signatures).
    for (let i = 0; i < 3072; i++) {
      expect(giveKeyItem(parsed, 1 + i)).toBe(true);
    }
    expect(giveKeyItem(parsed, 0xfffffffe)).toBe(false);
    expect(readKeyItemLog(parsed)).toHaveLength(3072);
  });
});
