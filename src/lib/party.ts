/** Party (main characters) and user yo-kai editing.
 *
 *  Layout ported from the reference editor AYw4SaveEditor: both tables are
 *  469-byte slots in the bulk region with an identical field map. Edits
 *  mutate the parsed copy in place; the ID-pair mirror regions further in
 *  the bulk data only change when slots are added/removed, which this file
 *  deliberately does not do.
 */

import type { ParsedSave } from "./save-format";

/** Bulk-region base offsets (switch-space; see docs/save-format.md). */
export const PARTY_BASE = 166627;
export const YOKAI_BASE = 169449;
export const SLOT_STRIDE = 469;
export const PARTY_SLOTS = 6;
export const YOKAI_SLOTS = 400;

const OFF_ID2 = 2; // u16; > 0 marks an occupied slot
const OFF_NAME = 28; // 24 bytes, null-terminated
const OFF_SPECIES = 72; // u32 signature
const OFF_SKILLS = 84; // 6 u32 signatures
const OFF_XP = 132; // u32
const OFF_HP = 144; // u32
const OFF_YP = 156; // u32
const OFF_PG = 168; // u32
const OFF_LEVEL = 180; // u32
const OFF_HP_PLUS = 214; // u16, +216 YP, +218 ST, +220 SP, +222 PA, +224 SA

export interface PartySlot {
  index: number;
  /** False for empty slots (ID2 == 0). */
  exists: boolean;
  /** Given name; empty unless the player renamed this slot. */
  name: string;
  /** ParamID of the character/species occupying the slot. */
  speciesId: number;
  level: number;
  xp: number;
  hp: number;
  yp: number;
  pg: number;
  skills: number[];
  hpPlus: number;
  ypPlus: number;
  stPlus: number;
  spPlus: number;
  paPlus: number;
  saPlus: number;
}

function view(parsed: ParsedSave): DataView {
  return new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength);
}

function slotOffset(parsed: ParsedSave, base: number, index: number): number {
  return bulk(parsed, base + index * SLOT_STRIDE);
}

function bulk(parsed: ParsedSave, switchOffset: number): number {
  const sec2 = parsed.sections[2];
  if (!sec2) throw new Error("Save has no bulk region.");
  return sec2.offset + (switchOffset - 35395);
}

function readName(data: Uint8Array, off: number): string {
  const slice = data.subarray(off, off + 24);
  const end = slice.indexOf(0);
  return new TextDecoder().decode(end === -1 ? slice : slice.subarray(0, end));
}

function readSlot(parsed: ParsedSave, base: number, index: number): PartySlot {
  const dv = view(parsed);
  const off = slotOffset(parsed, base, index);
  const skills: number[] = [];
  for (let s = 0; s < 6; s++) skills.push(dv.getUint32(off + OFF_SKILLS + s * 4, true));
  return {
    index,
    exists: dv.getUint16(off + OFF_ID2, true) > 0,
    name: readName(parsed.data, off + OFF_NAME),
    speciesId: dv.getUint32(off + OFF_SPECIES, true),
    level: dv.getUint32(off + OFF_LEVEL, true),
    xp: dv.getUint32(off + OFF_XP, true),
    hp: dv.getUint32(off + OFF_HP, true),
    yp: dv.getUint32(off + OFF_YP, true),
    pg: dv.getUint32(off + OFF_PG, true),
    skills,
    hpPlus: dv.getUint16(off + OFF_HP_PLUS, true),
    ypPlus: dv.getUint16(off + OFF_HP_PLUS + 2, true),
    stPlus: dv.getUint16(off + OFF_HP_PLUS + 4, true),
    spPlus: dv.getUint16(off + OFF_HP_PLUS + 6, true),
    paPlus: dv.getUint16(off + OFF_HP_PLUS + 8, true),
    saPlus: dv.getUint16(off + OFF_HP_PLUS + 10, true),
  };
}

export function readParty(parsed: ParsedSave): PartySlot[] {
  const slots: PartySlot[] = [];
  for (let i = 0; i < PARTY_SLOTS; i++) slots.push(readSlot(parsed, PARTY_BASE, i));
  return slots;
}

export function readYoKaiSlots(parsed: ParsedSave): PartySlot[] {
  const slots: PartySlot[] = [];
  for (let i = 0; i < YOKAI_SLOTS; i++) slots.push(readSlot(parsed, YOKAI_BASE, i));
  return slots;
}

export interface PartySlotPatch {
  name?: string;
  level?: number;
  xp?: number;
  hp?: number;
  yp?: number;
  pg?: number;
  skills?: number[];
  hpPlus?: number;
  ypPlus?: number;
  stPlus?: number;
  spPlus?: number;
  paPlus?: number;
  saPlus?: number;
  /** Species signature; assigning one to an empty yo-kai slot claims it. */
  speciesId?: number;
}

function writeName(data: Uint8Array, off: number, name: string): void {
  const encoded = new TextEncoder().encode(name);
  if (encoded.length > 24) throw new Error("Name is too long (max 24 bytes).");
  data.fill(0, off, off + 24);
  data.set(encoded, off);
}

/** Apply a partial edit to one slot. Skill lists are padded to 6 entries. */
export function writeSlot(
  parsed: ParsedSave,
  table: "party" | "yokai",
  index: number,
  patch: PartySlotPatch,
): void {
  const slots = table === "party" ? PARTY_SLOTS : YOKAI_SLOTS;
  if (index < 0 || index >= slots) {
    throw new Error(`${table === "party" ? "Party" : "Yo-kai"} slot ${index} out of range.`);
  }
  const dv = view(parsed);
  const off = slotOffset(parsed, table === "party" ? PARTY_BASE : YOKAI_BASE, index);

  if (patch.name !== undefined) writeName(parsed.data, off + OFF_NAME, patch.name);
  if (patch.speciesId !== undefined) {
    dv.setUint32(off + OFF_SPECIES, patch.speciesId >>> 0, true);
    // Claim empty yo-kai slots (ID2 > 0 marks occupancy).
    if (table === "yokai" && dv.getUint16(off + OFF_ID2, true) === 0) {
      dv.setUint16(off + OFF_ID2, (index + 1) & 0xffff, true);
    }
  }
  if (patch.level !== undefined) dv.setUint32(off + OFF_LEVEL, patch.level >>> 0, true);
  if (patch.xp !== undefined) dv.setUint32(off + OFF_XP, patch.xp >>> 0, true);
  if (patch.hp !== undefined) dv.setUint32(off + OFF_HP, patch.hp >>> 0, true);
  if (patch.yp !== undefined) dv.setUint32(off + OFF_YP, patch.yp >>> 0, true);
  if (patch.pg !== undefined) dv.setUint32(off + OFF_PG, patch.pg >>> 0, true);
  if (patch.skills !== undefined) {
    for (let s = 0; s < 6; s++) {
      dv.setUint32(off + OFF_SKILLS + s * 4, (patch.skills[s] ?? 0) >>> 0, true);
    }
  }
  const pluses: [keyof PartySlotPatch, number][] = [
    ["hpPlus", 0],
    ["ypPlus", 2],
    ["stPlus", 4],
    ["spPlus", 6],
    ["paPlus", 8],
    ["saPlus", 10],
  ];
  for (const [key, delta] of pluses) {
    const value = patch[key] as number | undefined;
    if (value !== undefined) dv.setUint16(off + OFF_HP_PLUS + delta, value & 0xffff, true);
  }
}
