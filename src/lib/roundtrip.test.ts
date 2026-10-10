/**
 * Byte-for-byte data-integrity gate.
 *
 * The editor mutates its parsed copy in place and downloads the raw bytes, so
 * integrity means two things, and both are tested here:
 *
 *  1. Identity round-trip — parse a save, edit nothing, and the output bytes
 *     equal the input exactly (zero byte drift).
 *  2. Edit isolation — every write function touches only the byte region it
 *     claims to, never a neighboring record or array.
 *
 * Real save dumps (git-ignored, under tools/lua/saves/) run when present and
 * the suite skips cleanly on clones without them. The synthetic skeletons
 * keep the same guarantees covered everywhere else.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSave, type ParsedSave } from "./save-format";
import { buildSkeleton } from "./test-skeleton";
import { assertEditableLayout } from "./validate";
import { diffByteRanges, type ByteRange } from "./byte-diff";
import { describeChanges } from "./change-report";
import {
  bulkOffset,
  clearSlot,
  giveItem,
  giveKeyItem,
  INVENTORIES,
  KEY_MONEY,
  KEY_PLAYER_NAMES,
  KEY_POS,
  readPlayer,
  setEquipped,
  setQuantity,
  setYoKaiSoul,
  writeCrank,
  writeMapId,
  writeMoney,
  writeMoneySpent,
  writeName,
  writePosition,
  type InventoryDef,
} from "./editor";
import { PARTY_SLOTS, YOKAI_SLOTS, writeSlot } from "./party";
import { findRecord } from "./save-format";
import { itemsOfCategory } from "./item-data";

/** Real dumps, git-ignored; used as fixtures whenever they exist locally. */
const REAL_SAVES = [
  "tools/lua/saves/baseline/USERDATA00_data.bin",
  "tools/lua/saves/baseline/AUTOSAVE_data.bin",
  "tools/lua/saves/user/USERDATA00_data.bin",
].filter((p) => existsSync(p));

const loadReal = (path: string): ParsedSave => parseSave(new Uint8Array(readFileSync(path)));

const skeleton = () => parseSave(buildSkeleton("switch"));

/** Every byte region the editor is allowed to change. */
function writableRegions(parsed: ParsedSave): ByteRange[] {
  const regions: ByteRange[] = [];
  const addRecord = (section: number, key: number) => {
    const rec = findRecord(parsed, section, key);
    if (rec) regions.push({ start: rec.offset, end: rec.offset + 8 + rec.len });
  };
  addRecord(0, KEY_MONEY);
  addRecord(0, 0x8127b2c2); // money spent
  addRecord(0, KEY_PLAYER_NAMES);
  addRecord(0, 0x19560d9a); // map
  addRecord(0, 0xd149530b); // safe map
  addRecord(0, KEY_POS);
  addRecord(0, 0x3a40c52c); // play time
  addRecord(1, 0x2e5f582c); // global flags (crank counters)
  addRecord(1, 0xcf6dfcc9); // item acquisition log
  addBulk(regions, parsed, INVENTORIES.bag);
  addBulk(regions, parsed, INVENTORIES.equipment);
  addBulk(regions, parsed, INVENTORIES.souls);
  const souls = { base: 963635, count: 500, stride: 80 };
  regions.push({
    start: bulkOffset(parsed, souls.base),
    end: bulkOffset(parsed, souls.base + souls.count * souls.stride),
  });
  regions.push({
    start: bulkOffset(parsed, 166627),
    end: bulkOffset(parsed, 166627 + PARTY_SLOTS * 469),
  });
  regions.push({
    start: bulkOffset(parsed, 169449),
    end: bulkOffset(parsed, 169449 + YOKAI_SLOTS * 469),
  });
  return regions;
}

function addBulk(regions: ByteRange[], parsed: ParsedSave, def: InventoryDef) {
  regions.push({
    start: bulkOffset(parsed, def.base),
    end: bulkOffset(parsed, def.base + def.count * def.stride),
  });
}

describe("identity round-trip (zero edits → zero byte drift)", () => {
  it("reproduces the switch skeleton byte-for-byte", () => {
    const bytes = buildSkeleton("switch");
    const parsed = parseSave(bytes);
    expect(diffByteRanges(bytes, parsed.data)).toEqual({
      ranges: [],
      changed: 0,
      sameLength: true,
    });
  });

  it("reproduces the ps4 skeleton byte-for-byte", () => {
    const bytes = buildSkeleton("ps4");
    const parsed = parseSave(bytes);
    expect(diffByteRanges(bytes, parsed.data)).toEqual({
      ranges: [],
      changed: 0,
      sameLength: true,
    });
  });

  it("re-parsing the output yields the identical structure (idempotence)", () => {
    const parsed = skeleton();
    writeMoney(parsed, 123);
    const again = parseSave(parsed.data.slice());
    expect(again.sections.map((s) => [s.offset, s.type, s.idxSize])).toEqual(
      parsed.sections.map((s) => [s.offset, s.type, s.idxSize]),
    );
    expect(again.sections.flatMap((s) => s.records.map((r) => [r.key, r.len]))).toEqual(
      parsed.sections.flatMap((s) => s.records.map((r) => [r.key, r.len])),
    );
  });

  it.each(REAL_SAVES)("reproduces real save %s byte-for-byte", (path) => {
    const bytes = new Uint8Array(readFileSync(path));
    const parsed = parseSave(bytes);
    const diff = diffByteRanges(bytes, parsed.data);
    expect(diff.changed).toBe(0);
    expect(diff.sameLength).toBe(true);
  });

  it.each(REAL_SAVES)("real save %s passes the editable-layout gate", (path) => {
    expect(() => assertEditableLayout(loadReal(path))).not.toThrow();
  });

  it("parses a subarray view correctly (byte-offset normalization)", () => {
    const bytes = buildSkeleton("switch");
    const padded = new Uint8Array(16 + bytes.length);
    padded.set(bytes, 16);
    const parsed = parseSave(padded.subarray(16));
    expect(readPlayer(parsed).money).toBe(0);
    writeMoney(parsed, 77);
    expect(readPlayer(parsed).money).toBe(77);
    // The write must land inside the view's own bytes, not shift into the pad.
    expect(Array.from(padded.subarray(0, 16)).every((b) => b === 0)).toBe(true);
  });
});

describe("edit isolation (writes touch only their own region)", () => {
  it("player-field edits stay inside their records", () => {
    const parsed = skeleton();
    const pristine = parsed.data.slice();
    writeMoney(parsed, 4581);
    writeMoneySpent(parsed, 12);
    writeName(parsed, 0, "Nate");
    writeName(parsed, 5, "Katie");
    writeMapId(parsed, 0x36a5421e, true);
    writePosition(parsed, 1.5, -2.25, 300.75);
    writeCrank(parsed, 0, 9);
    writeCrank(parsed, 3, 2);

    const diff = diffByteRanges(pristine, parsed.data);
    expect(diff.ranges.length).toBeGreaterThan(0);
    for (const range of diff.ranges) {
      expect(
        writableRegions(parsed).some((r) => range.start >= r.start && range.end <= r.end),
        `edit leaked into 0x${range.start.toString(16)}..0x${range.end.toString(16)}`,
      ).toBe(true);
    }
  });

  it("inventory edits stay inside one inventory slot", () => {
    const parsed = skeleton();
    const pristine = parsed.data.slice();
    const food = itemsOfCategory("consumable");

    const slot = giveItem(parsed, INVENTORIES.bag, food[0].crc, 5)!;
    setQuantity(parsed, INVENTORIES.bag, slot, 0xffff);
    const eqSlot = giveItem(parsed, INVENTORIES.equipment, itemsOfCategory("equipment")[0].crc, 1)!;
    setEquipped(parsed, INVENTORIES.equipment, eqSlot, true);
    giveItem(parsed, INVENTORIES.souls, itemsOfCategory("soul")[0].crc, 99);
    clearSlot(parsed, INVENTORIES.bag, slot);

    const diff = diffByteRanges(pristine, parsed.data);
    const allowed = writableRegions(parsed);
    for (const range of diff.ranges) {
      expect(
        allowed.some((r) => range.start >= r.start && range.end <= r.end),
        `inventory edit leaked into 0x${range.start.toString(16)}`,
      ).toBe(true);
    }
  });

  it("party and yo-kai slot edits stay inside the edited slot", () => {
    const parsed = skeleton();
    const pristine = parsed.data.slice();
    writeSlot(parsed, "party", 2, { name: "Test", level: 99, xp: 12345, skills: [1, 2, 3] });
    writeSlot(parsed, "yokai", 371, { speciesId: 0xdeadbeef, level: 1 });

    const diff = diffByteRanges(pristine, parsed.data);
    for (const range of diff.ranges) {
      const inParty =
        range.start >= bulkOffset(parsed, 166627 + 2 * 469) &&
        range.end <= bulkOffset(parsed, 166627 + 3 * 469);
      const inYokai =
        range.start >= bulkOffset(parsed, 169449 + 371 * 469) &&
        range.end <= bulkOffset(parsed, 169449 + 372 * 469);
      expect(inParty || inYokai, `slot edit leaked to 0x${range.start.toString(16)}`).toBe(true);
    }
  });

  it("soul counter edits touch exactly two bytes", () => {
    const parsed = skeleton();
    const pristine = parsed.data.slice();
    setYoKaiSoul(parsed, 123, "gold", 0xffff);
    const diff = diffByteRanges(pristine, parsed.data);
    expect(diff.ranges).toHaveLength(1);
    expect(diff.ranges[0].end - diff.ranges[0].start).toBe(2);
  });

  it("a full realistic editing session never leaves the writable regions", () => {
    const parsed = skeleton();
    const pristine = parsed.data.slice();

    writeMoney(parsed, 999999);
    writeName(parsed, 1, "夏");
    for (const item of itemsOfCategory("consumable").slice(0, 20)) {
      giveItem(parsed, INVENTORIES.bag, item.crc, 99);
    }
    for (let i = 0; i < 5; i++) {
      writeSlot(parsed, "yokai", i * 37, { level: 50, hp: 400, yp: 200 });
    }
    setYoKaiSoul(parsed, 499, "red", 1);
    giveKeyItems(parsed, 5);

    for (const range of diffByteRanges(pristine, parsed.data).ranges) {
      expect(
        writableRegions(parsed).some((r) => range.start >= r.start && range.end <= r.end),
        `session leaked into 0x${range.start.toString(16)}`,
      ).toBe(true);
    }
  });
});

function giveKeyItems(parsed: ParsedSave, count: number) {
  // Exercise the section-1 acquisition log too (the game rebuilds it on load,
  // so this is a data-level edit, not key-item granting — see REVERSING.md §4).
  for (const item of itemsOfCategory("key").slice(0, count)) {
    expect(giveKeyItem(parsed, item.crc)).toBe(true);
  }
}

describe("change report (labels match the edited fields)", () => {
  it("labels money, name-slot and crank edits", () => {
    const parsed = skeleton();
    const original = parsed.data.slice();
    writeMoney(parsed, 100);
    writeName(parsed, 2, "Katie");
    writeCrank(parsed, 1, 3);

    const labels = describeChanges(parsed, original).map((g) => g.label);
    expect(labels).toContain("Money");
    expect(labels).toContain("Protagonist name slot 3");
    expect(labels).toContain("Crank-a-kai counters");
  });

  it("labels bulk-region edits through the offset tables", () => {
    const parsed = skeleton();
    const original = parsed.data.slice();
    const food = itemsOfCategory("consumable")[0];
    const slot = giveItem(parsed, INVENTORIES.bag, food.crc, 5)!;
    setQuantity(parsed, INVENTORIES.bag, slot, 9);
    writeSlot(parsed, "yokai", 3, { level: 10 });
    setYoKaiSoul(parsed, 7, "white", 2);

    const labels = describeChanges(parsed, original).map((g) => g.label);
    expect(labels.some((l) => l.startsWith("Bag slot"))).toBe(true);
    expect(labels).toContain("Yo-kai slot 4");
    expect(labels).toContain("Yo-kai soul counters slot 8");
  });

  it("reports no changes for an untouched save", () => {
    const parsed = skeleton();
    const original = parsed.data.slice();
    expect(describeChanges(parsed, original)).toEqual([]);
  });
});
