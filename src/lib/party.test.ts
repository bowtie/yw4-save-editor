import { describe, expect, it } from "vitest";
import { parseSave } from "./save-format";
import { buildSkeleton } from "./test-skeleton";
import {
  PARTY_SLOTS,
  YOKAI_SLOTS,
  readParty,
  readYoKaiSlots,
  writeSlot,
  clearYoKaiSlot,
  SLOT_STRIDE,
  YOKAI_BASE,
  type PartySlot,
} from "./party";

const skeleton = () => parseSave(buildSkeleton("switch"));

describe("party slots", () => {
  it("exposes all six slots and reports empty ones", () => {
    const slots = readParty(skeleton());
    expect(slots).toHaveLength(PARTY_SLOTS);
    expect(slots.every((s) => !s.exists && s.name === "" && s.level === 0)).toBe(true);
  });

  it("round-trips every editable field at u32 boundary values", () => {
    const parsed = skeleton();
    writeSlot(parsed, "party", 0, {
      name: "Extreme",
      level: 0xffffffff,
      xp: 0xffffffff,
      hp: 0xffffffff,
      yp: 0xffffffff,
      pg: 0xffffffff,
      skills: [0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0],
      hpPlus: 0xffff,
      ypPlus: 0xffff,
      stPlus: 0xffff,
      spPlus: 0xffff,
      paPlus: 0xffff,
      saPlus: 0xffff,
    });
    const slot = readParty(parsed)[0];
    expect(slot.level).toBe(0xffffffff);
    expect(slot.xp).toBe(0xffffffff);
    expect(slot.hp).toBe(0xffffffff);
    expect(slot.yp).toBe(0xffffffff);
    expect(slot.pg).toBe(0xffffffff);
    expect(slot.skills).toEqual([0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0]);
    expect(slot.hpPlus).toBe(0xffff);
    expect(slot.saPlus).toBe(0xffff);
  });

  it("keeps edits inside their slot: writing slot 5 leaves other bytes", () => {
    const parsed = skeleton();
    const before = parsed.data.slice();
    writeSlot(parsed, "party", 5, { level: 99 });
    const after = parsed.data;
    const slot5Start = 166627 + 5 * 469;
    // Everything before slot 5 (and after it) must be untouched.
    expect(after.subarray(0, slot5Start)).toEqual(before.subarray(0, slot5Start));
    expect(after.subarray(slot5Start + 469)).toEqual(before.subarray(slot5Start + 469));
    // And slot 5 itself must hold the new level.
    expect(readParty(parsed)[5].level).toBe(99);
  });

  it("writes into a gap slot without touching neighbors", () => {
    const parsed = skeleton();
    writeSlot(parsed, "party", 2, { name: "ミドル" });
    const slots = readParty(parsed);
    expect(slots[2].name).toBe("ミドル");
    expect(slots[1].name).toBe("");
    expect(slots[3].name).toBe("");
  });

  it("rejects out-of-range slot indices instead of writing past the table", () => {
    const parsed = skeleton();
    expect(() => writeSlot(parsed, "party", PARTY_SLOTS, { level: 1 })).toThrow(/out of range/);
    expect(() => writeSlot(parsed, "party", -1, { level: 1 })).toThrow(/out of range/);
    expect(() => writeSlot(parsed, "yokai", YOKAI_SLOTS, { level: 1 })).toThrow(/out of range/);
  });

  it("truncates names at the 24-byte slot boundary (UTF-8 counted, not chars)", () => {
    const parsed = skeleton();
    // 8 Japanese chars = 24 bytes exactly: fits.
    writeSlot(parsed, "party", 0, { name: "あ".repeat(8) });
    expect(readParty(parsed)[0].name).toBe("あ".repeat(8));
    // 9 chars = 27 bytes: must throw rather than spill into adjacent fields.
    expect(() => writeSlot(parsed, "party", 0, { name: "あ".repeat(9) })).toThrow(/too long/);
    // Emoji are 4 bytes each: 6 fit, 7 do not.
    writeSlot(parsed, "party", 1, { name: "🐱".repeat(6) });
    expect(readParty(parsed)[1].name).toBe("🐱".repeat(6));
    expect(() => writeSlot(parsed, "party", 1, { name: "🐱".repeat(7) })).toThrow(/too long/);
  });

  it("clears stale bytes when a name is shortened", () => {
    const parsed = skeleton();
    writeSlot(parsed, "party", 0, { name: "LongLongLongName" });
    writeSlot(parsed, "party", 0, { name: "Short" });
    const slot: PartySlot = readParty(parsed)[0];
    expect(slot.name).toBe("Short");
    // The tail of the name field must be zeros, not leftover characters.
    const raw = parsed.data;
    const nameOff = 166627 + 28;
    for (let i = nameOff + "Short".length; i < nameOff + 24; i++) {
      expect(raw[i]).toBe(0);
    }
  });
});

describe("yo-kai slots", () => {
  it("claims an empty slot when a species is assigned", () => {
    const parsed = skeleton();
    writeSlot(parsed, "yokai", 100, { speciesId: 0x12345678, level: 30 });
    const slots = readYoKaiSlots(parsed);
    expect(slots[100].exists).toBe(true);
    expect(slots[100].speciesId).toBe(0x12345678);
    expect(slots[100].level).toBe(30);
  });

  it("reads all 400 slots including gaps", () => {
    const parsed = skeleton();
    // speciesId claims an empty slot (ID2 > 0); level alone does not.
    writeSlot(parsed, "yokai", 0, { speciesId: 0x1234, level: 1 });
    writeSlot(parsed, "yokai", 399, { speciesId: 0x5678, level: 2 });
    const slots = readYoKaiSlots(parsed);
    expect(slots).toHaveLength(YOKAI_SLOTS);
    expect(slots[0].exists).toBe(true);
    expect(slots[1].exists).toBe(false);
    expect(slots[399].exists).toBe(true);
  });

  it("keeps yo-kai edits out of the party table", () => {
    const parsed = skeleton();
    const before = parsed.data.slice();
    writeSlot(parsed, "yokai", 0, { speciesId: 0x42, level: 55 });
    const after = parsed.data;
    // Party table: 166627..169449 must be untouched by a yo-kai edit at 169449.
    expect(after.subarray(166627, 169449)).toEqual(before.subarray(166627, 169449));
  });

  it("removes a yo-kai by zeroing exactly its slot", () => {
    const parsed = skeleton();
    writeSlot(parsed, "yokai", 3, { speciesId: 0x42, level: 55, name: "Gone", xp: 7 });
    writeSlot(parsed, "yokai", 4, { speciesId: 0x43, level: 12 });
    const before = parsed.data.slice();
    clearYoKaiSlot(parsed, 3);
    const slots = readYoKaiSlots(parsed);
    expect(slots[3]).toMatchObject({ exists: false, speciesId: 0, level: 0, xp: 0, name: "" });
    expect(slots[4]).toMatchObject({ exists: true, speciesId: 0x43, level: 12 });
    // Only slot 3's 469 bytes changed (compare bytes outside it directly;
    // toEqual on ~1 MB arrays is slow).
    const start = parsed.sections[2].offset + (YOKAI_BASE - 35395) + 3 * SLOT_STRIDE;
    for (let i = 0; i < before.length; i++) {
      if (i >= start && i < start + SLOT_STRIDE) continue;
      if (parsed.data[i] !== before[i]) throw new Error(`byte ${i} changed`);
    }
    expect(() => clearYoKaiSlot(parsed, YOKAI_SLOTS)).toThrow(/out of range/);
  });
});
