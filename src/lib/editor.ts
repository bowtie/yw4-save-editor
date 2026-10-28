/**
 * In-browser save editing for Yo-kai Watch 4++.
 *
 * Works on the already-parsed save structure (see converter.ts): fields in
 * sections 0/1 are reached through their record keys (platform-independent),
 * and the inventory arrays live in the byte-identical bulk region, which is
 * addressed by a constant offset relative to the save's section-2 start.
 * All writes mutate the parsed save's underlying bytes; call sites keep the
 * original file untouched and hand the modified bytes to a download.
 */

import { itemByCrc, type ItemCategory } from "./item-data";
import { nameForBase } from "./characters";
import { findRecord, readRecordBytes as getRecordBytes, type ParsedSave } from "./save-format";

// ── layout constants ───────────────────────────────────────────────────────

/**
 * Where the bulk region starts in a Switch 2.2.0 save (the final Switch
 * version). Everything from here on is byte-identical between platforms.
 * Pinned to the game version, like every offset table in this project.
 */
export const SWITCH_SECTION2_START = 35395;

/** Section-2 start of the loaded save (the bulk-region anchor). */
export function bulkStart(parsed: ParsedSave): number {
  const sec2 = parsed.sections[2];
  if (!sec2) throw new Error("Save has no bulk region.");
  return sec2.offset;
}

/** Translate a Switch-save offset to an offset in this save's bulk region. */
export function bulkOffset(parsed: ParsedSave, switchOffset: number): number {
  return bulkStart(parsed) + (switchOffset - SWITCH_SECTION2_START);
}

// ── record access (sections 0/1, by key) ───────────────────────────────────

function view(parsed: ParsedSave): DataView {
  return new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength);
}

// record keys (crc32 of the game's internal field names)
export const KEY_MONEY = 0xb7df13e4;
export const KEY_MONEY_SPENT = 0x8127b2c2;
export const KEY_PLAYER_NAMES = 0x3c823935; // 6 slots x 36 bytes
export const KEY_MAP_ID = 0x19560d9a;
export const KEY_SAFE_MAP_ID = 0xd149530b;
export const KEY_POS = 0x4b7664ab; // 16 bytes: x/y/z floats
export const KEY_PLAY_TIME = 0x3a40c52c;
export const KEY_GLOBAL_BYTE_FLAG = 0x2e5f582c; // section 1

export const NAME_SLOTS = 6;
export const NAME_SLOT_SIZE = 36;

export interface PlayerInfo {
  money: number;
  names: string[];
  /** Total playtime in seconds (u32; confirmed against real saves). */
  playTimeSeconds: number;
  /** The four daily crank-a-kai counters inside m_globalByteFlag. */
  crank: [number, number, number, number];
}

export function readPlayer(parsed: ParsedSave): PlayerInfo {
  const v = view(parsed);
  const money = getRecordBytes(parsed, 0, KEY_MONEY);
  const namesBytes = getRecordBytes(parsed, 0, KEY_PLAYER_NAMES);
  const playTime = getRecordBytes(parsed, 0, KEY_PLAY_TIME);
  const flags = getRecordBytes(parsed, 1, KEY_GLOBAL_BYTE_FLAG);
  const names: string[] = [];
  for (let i = 0; i < NAME_SLOTS; i++) {
    const slot = namesBytes.subarray(i * NAME_SLOT_SIZE, (i + 1) * NAME_SLOT_SIZE);
    const end = slot.findIndex((b) => b === 0);
    names.push(new TextDecoder().decode(end === -1 ? slot : slot.subarray(0, end)));
  }
  return {
    money: v.getUint32(money.byteOffset, true),
    names,
    playTimeSeconds: v.getUint32(playTime.byteOffset, true),
    crank: [flags[11], flags[12], flags[13], flags[14]],
  };
}

export function writeMoney(parsed: ParsedSave, money: number): void {
  const bytes = getRecordBytes(parsed, 0, KEY_MONEY);
  new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength).setUint32(
    bytes.byteOffset,
    money >>> 0,
    true,
  );
}

export function readMoneySpent(parsed: ParsedSave): number {
  const bytes = getRecordBytes(parsed, 0, KEY_MONEY_SPENT);
  return new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength).getUint32(
    bytes.byteOffset,
    true,
  );
}

export function writeMoneySpent(parsed: ParsedSave, money: number): void {
  const bytes = getRecordBytes(parsed, 0, KEY_MONEY_SPENT);
  new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength).setUint32(
    bytes.byteOffset,
    money >>> 0,
    true,
  );
}

export function writeName(parsed: ParsedSave, slot: number, name: string): void {
  if (slot < 0 || slot >= NAME_SLOTS) throw new Error(`Name slot ${slot} out of range.`);
  const encoded = new TextEncoder().encode(name);
  if (encoded.length > NAME_SLOT_SIZE) {
    throw new Error(`Name is too long (max ${NAME_SLOT_SIZE} bytes in UTF-8).`);
  }
  const bytes = getRecordBytes(parsed, 0, KEY_PLAYER_NAMES);
  const start = bytes.byteOffset + slot * NAME_SLOT_SIZE;
  parsed.data.fill(0, start, start + NAME_SLOT_SIZE);
  parsed.data.set(encoded, start);
}

/** which = 0..3: manual tries, manual max, capital tries, capital max. */
export function writeCrank(parsed: ParsedSave, which: number, value: number): void {
  if (which < 0 || which > 3) throw new Error(`Crank counter ${which} out of range.`);
  const flags = getRecordBytes(parsed, 1, KEY_GLOBAL_BYTE_FLAG);
  if (11 + which >= flags.length) throw new Error("Global flag record is truncated.");
  flags[11 + which] = value & 0xff;
}

/** Crank-a-kai daily counters are single bytes inside the global flag array. */
export const CRANK_MAX = 0xff;

// ── inventories (bulk region) ──────────────────────────────────────────────

export interface InventoryDef {
  /** Switch-space base offset of the array. */
  base: number;
  count: number;
  stride: number;
  /** Byte offsets within one record. */
  sig: number;
  qty: number;
  equipped?: number;
  /** Only these categories can be placed in this inventory. */
  categories: ItemCategory[];
  label: string;
  /**
   * Instance ids (id1, u16 at +0) are global across inventories, and each
   * inventory owns a distinct range: bag 0x0000+, equipment 0x1000+, souls
   * 0x4000+. Writing ids outside the range collides with other inventories
   * and crashes the game's item lookups.
   */
  id1Base: number;
}

export const INVENTORIES: Record<"bag" | "equipment" | "souls", InventoryDef> = {
  bag: {
    base: 76579,
    count: 500,
    stride: 54,
    sig: 12,
    qty: 36,
    categories: ["consumable", "key"],
    label: "Bag",
    id1Base: 0x0000,
  },
  equipment: {
    base: 103587,
    count: 1000,
    stride: 63,
    sig: 12,
    qty: 36,
    equipped: 46,
    categories: ["equipment"],
    label: "Equipment",
    id1Base: 0x1000,
  },
  souls: {
    base: 958227,
    count: 100,
    stride: 54,
    sig: 12,
    qty: 36,
    categories: ["soul"],
    label: "Soul bag",
    id1Base: 0x4000,
  },
};

export interface Slot {
  /** Index within the inventory array. */
  index: number;
  crc: number;
  quantity: number;
  equipped?: number;
  name: string;
}

export function readInventory(parsed: ParsedSave, def: InventoryDef): Slot[] {
  const v = view(parsed);
  const slots: Slot[] = [];
  for (let i = 0; i < def.count; i++) {
    const off = bulkOffset(parsed, def.base) + i * def.stride;
    const crc = v.getUint32(off + def.sig, true);
    if (crc === 0) continue;
    slots.push({
      index: i,
      crc,
      quantity: v.getUint16(off + def.qty, true),
      equipped: def.equipped !== undefined ? v.getUint8(off + def.equipped) : undefined,
      name: itemByCrc(crc)?.name ?? `Unknown 0x${crc.toString(16).toUpperCase()}`,
    });
  }
  return slots;
}

function requireSlotIndex(def: InventoryDef, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= def.count) {
    throw new Error(`${def.label} slot ${index} out of range (0..${def.count - 1}).`);
  }
}

export function setQuantity(
  parsed: ParsedSave,
  def: InventoryDef,
  index: number,
  quantity: number,
): void {
  requireSlotIndex(def, index);
  const v = view(parsed);
  const off = bulkOffset(parsed, def.base) + index * def.stride;
  v.setUint16(off + def.qty, quantity & 0xffff, true);
}

export function setEquipped(
  parsed: ParsedSave,
  def: InventoryDef,
  index: number,
  equipped: boolean,
): void {
  if (def.equipped === undefined) throw new Error("This inventory has no equipped flag.");
  requireSlotIndex(def, index);
  const off = bulkOffset(parsed, def.base) + index * def.stride;
  v8(parsed).setUint8(off + def.equipped, equipped ? 1 : 0);
}

function v8(parsed: ParsedSave): DataView {
  return view(parsed);
}

export function clearSlot(parsed: ParsedSave, def: InventoryDef, index: number): void {
  requireSlotIndex(def, index);
  // Zero the whole record: stale ids/order/equipped bytes make the game render
  // ghost rows even though the signature is cleared.
  const start = bulkOffset(parsed, def.base) + index * def.stride;
  parsed.data.fill(0, start, start + def.stride);
}

// ── key items (section-1 acquisition log) ──────────────────────────────────

/**
 * Key items aren't in the bulk bag region: the game tracks them in a section-1
 * record that logs every item ever obtained, as a flat u32 signature array
 * (3072 slots). The in-game key-items screen reads this log, so owning a key
 * item means its signature appears here exactly once.
 */
export const KEY_ITEM_LOG_RECORD = 0xcf6dfcc9;

function keyItemLogRange(parsed: ParsedSave): { start: number; count: number } | null {
  const rec = findRecord(parsed, 1, KEY_ITEM_LOG_RECORD);
  if (!rec) return null;
  return { start: rec.offset + 8, count: Math.floor(rec.len / 4) };
}

/** Signatures currently present in the acquisition log, in log order. */
export function readKeyItemLog(parsed: ParsedSave): number[] {
  const range = keyItemLogRange(parsed);
  if (!range) return [];
  const v = view(parsed);
  const out: number[] = [];
  for (let k = 0; k < range.count; k++) {
    const crc = v.getUint32(range.start + k * 4, true);
    if (crc !== 0) out.push(crc);
  }
  return out;
}

/** Add a signature to the acquisition log. Idempotent. */
export function giveKeyItem(parsed: ParsedSave, crc: number): boolean {
  const range = keyItemLogRange(parsed);
  if (!range) return false;
  const v = view(parsed);
  for (let k = 0; k < range.count; k++) {
    const at = range.start + k * 4;
    const cur = v.getUint32(at, true);
    if (cur === crc) return true;
    if (cur === 0) {
      v.setUint32(at, crc >>> 0, true);
      return true;
    }
  }
  return false;
}

/** Give an item: fills the first empty slot. Returns the slot index used,
 *  or null when the inventory is full. Skips nothing - callers decide. */
export function giveItem(
  parsed: ParsedSave,
  def: InventoryDef,
  crc: number,
  quantity: number,
): number | null {
  const v = view(parsed);
  const base = bulkOffset(parsed, def.base);
  let freeId = 1;
  const taken = new Set<number>();
  let empty = -1;
  for (let i = 0; i < def.count; i++) {
    const off = base + i * def.stride;
    const crcAt = v.getUint32(off + def.sig, true);
    if (crcAt === crc) return i; // already owned: nothing to do
    if (crcAt === 0 && empty < 0) empty = i;
    const id2 = v.getUint16(off + 2, true);
    if (id2 > 0) taken.add(id2);
  }
  if (empty < 0) return null;
  while (taken.has(freeId)) freeId++;

  // The sort order is a shared acquisition counter across all inventories:
  // continue from the highest existing value so new rows sort last.
  let nextOrder = 0;
  for (const inv of Object.values(INVENTORIES)) {
    const invBase = bulkOffset(parsed, inv.base);
    for (let i = 0; i < inv.count; i++) {
      const order = v.getUint32(invBase + i * inv.stride + 24, true);
      if (order > nextOrder) nextOrder = order;
    }
  }

  // Wipe stale bytes first: reused slots carry old aux data the game parses.
  const off = base + empty * def.stride;
  parsed.data.fill(0, off, off + def.stride);
  v.setUint32(off + def.sig, crc >>> 0, true);
  v.setUint16(off + def.qty, quantity & 0xffff, true);
  v.setUint16(off, def.id1Base + empty, true); // id1 = global instance id
  v.setUint16(off + 2, freeId, true); // id2 = next free instance id
  v.setUint32(off + 24, ++nextOrder, true); // order
  if (def.equipped !== undefined) v8(parsed).setUint8(off + def.equipped, 0);
  return empty;
}

// ── yo-kai souls (per-kind white/red/gold counters) ────────────────────────

export const YOKAI_SOULS = { base: 963635, count: 500, stride: 80, white: 36, red: 38, gold: 40 };

export interface YokaiSoulSlot {
  index: number;
  /** Species ParamID the ledger row keys by. */
  paramId: number;
  name: string;
  white: number;
  red: number;
  gold: number;
}

export function readYoKaiSouls(parsed: ParsedSave): YokaiSoulSlot[] {
  const v = view(parsed);
  const out: YokaiSoulSlot[] = [];
  for (let i = 0; i < YOKAI_SOULS.count; i++) {
    const off = bulkOffset(parsed, YOKAI_SOULS.base) + i * YOKAI_SOULS.stride;
    const white = v.getUint16(off + YOKAI_SOULS.white, true);
    const red = v.getUint16(off + YOKAI_SOULS.red, true);
    const gold = v.getUint16(off + YOKAI_SOULS.gold, true);
    if (white === 0 && red === 0 && gold === 0) continue;
    const crc = v.getUint32(off + 12, true);
    out.push({
      index: i,
      paramId: crc,
      name:
        nameForBase(crc) ??
        itemByCrc(crc)?.name ??
        `Yo-kai soul 0x${crc.toString(16).toUpperCase()}`,
      white,
      red,
      gold,
    });
  }
  return out;
}

export function setYoKaiSoul(
  parsed: ParsedSave,
  index: number,
  which: "white" | "red" | "gold",
  quantity: number,
): void {
  if (index < 0 || index >= YOKAI_SOULS.count) {
    throw new Error(`Yo-kai soul slot ${index} out of range (0..${YOKAI_SOULS.count - 1}).`);
  }
  const v = view(parsed);
  const off = bulkOffset(parsed, YOKAI_SOULS.base) + index * YOKAI_SOULS.stride;
  v.setUint16(off + YOKAI_SOULS[which], quantity & 0xffff, true);
}

/* ── soul ledger row creation (dual-write) ──────────────────────────────── */

/** Tuple keys of the ledger's tagged records, crc32 of the native field
 *  names; each is the crc32 of the native field name). */
/** Exported for the change reporter's diff-preview labels. */
export const SOUL_KEYS = {
  soulUnique: 0xd344531f,
  handle: 0x918020d9,
  item_id: 0x126f525e,
  get_order: 0x90f47c83,
  stock_num: 0xaa2d1af8,
  is_new: 0x2787e78d,
  is_get: 0xb15f8db8,
} as const;

function soulTuple(key: number, value: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + value.length);
  new DataView(out.buffer).setUint32(0, key, true);
  new DataView(out.buffer).setUint32(4, value.length, true);
  out.set(value, 8);
  return out;
}

/** The 0x1009 soulUnique slot region: 500 x 80B, found by its key header. */
function soulSectionBase(parsed: ParsedSave): number {
  const v = view(parsed);
  const sec = parsed.sections.find((s) => s.type === 0x1009);
  if (!sec) throw new Error("Save has no 0x1009 section for the soul ledger.");
  const limit = Math.min(sec.offset + 0x2000, parsed.data.length);
  for (let o = sec.offset + 16; o < limit; o += 8) {
    if (v.getUint32(o, true) === SOUL_KEYS.soulUnique) return o;
  }
  throw new Error("soulUnique slots not found in section 0x1009.");
}

/** Create a ledger row for a species the save has no souls for yet. Writes
 *  both copies — the packed bulk record and the slotted 0x1009 record —
 *  with a starter stock and per-tier is_get flags, mirroring how the game
 *  appends rows. Returns the new row's index. */
export function addYoKaiSoulRow(
  parsed: ParsedSave,
  paramId: number,
  stock: { white: number; red: number; gold: number },
): number {
  const v = view(parsed);
  for (const existing of readYoKaiSouls(parsed)) {
    if (existing.paramId === paramId) {
      throw new Error("This species already has a soul ledger row.");
    }
  }
  // Ledger rows are packed: the first all-zero bulk record is the append
  // point, and the section slot at the same index is its mirror.
  let index = 0;
  let maxOrder = 0;
  const bulkBase = bulkOffset(parsed, YOKAI_SOULS.base);
  while (index < YOKAI_SOULS.count) {
    const off = bulkBase + index * YOKAI_SOULS.stride;
    const w = v.getUint16(off + YOKAI_SOULS.white, true);
    const r = v.getUint16(off + YOKAI_SOULS.red, true);
    const g = v.getUint16(off + YOKAI_SOULS.gold, true);
    if (w === 0 && r === 0 && g === 0) break;
    maxOrder = Math.max(maxOrder, v.getUint32(off + 24, true));
    index++;
  }
  if (index >= YOKAI_SOULS.count) throw new Error("The soul ledger is full (500 rows).");

  const handle = ((index + 1) << 16) | (0x3000 + index);
  const u32 = (x: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, x >>> 0, true);
    return b;
  };
  const stockBuf = new Uint8Array(6);
  new DataView(stockBuf.buffer).setUint16(0, stock.white & 0xffff, true);
  new DataView(stockBuf.buffer).setUint16(2, stock.red & 0xffff, true);
  new DataView(stockBuf.buffer).setUint16(4, stock.gold & 0xffff, true);
  const isGet = new Uint8Array([
    stock.white > 0 ? 1 : 0,
    stock.red > 0 ? 1 : 0,
    stock.gold > 0 ? 1 : 0,
  ]);
  const tuples = new Uint8Array(60);
  let p = 0;
  for (const part of [
    soulTuple(SOUL_KEYS.item_id, u32(paramId)),
    soulTuple(SOUL_KEYS.get_order, u32(maxOrder + 1)),
    soulTuple(SOUL_KEYS.stock_num, stockBuf),
    soulTuple(SOUL_KEYS.is_new, new Uint8Array(3)),
    soulTuple(SOUL_KEYS.is_get, isGet),
  ]) {
    tuples.set(part, p);
    p += part.length;
  }
  // Bulk record: raw handle + tuples, zero-padded to the 80-byte slot.
  const bulk = new Uint8Array(80);
  bulk.set(u32(handle), 0);
  bulk.set(tuples, 4);
  parsed.data.set(bulk, bulkBase + index * YOKAI_SOULS.stride);
  // Section record: [key][500][flags] header + handle tuple + tuples.
  const sec = new Uint8Array(80);
  const sv = new DataView(sec.buffer);
  sv.setUint32(0, SOUL_KEYS.soulUnique, true);
  sv.setUint16(4, YOKAI_SOULS.count, true);
  sv.setUint16(6, index === 0 ? 0x0300 : 0x0400, true);
  sec.set(soulTuple(SOUL_KEYS.handle, u32(handle)), 8);
  sec.set(tuples, 20);
  parsed.data.set(sec, soulSectionBase(parsed) + index * YOKAI_SOULS.stride);
  return index;
}
