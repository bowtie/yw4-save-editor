/**
 * Yo-kai Watch 4++ save structure (Switch ↔ PS4 share it).
 *
 * A save file is a chain of sections. Each section:
 *   +0x00  ee ff          magic
 *   +0x02  u16            section type (0x1001, 0x1002, ...)
 *   +0x04  u32            index size = offset of this section's end marker
 *   +0x08  u32            section ident
 *   +0x0c  u32            0x01000000 (bytes 00 00 00 01)
 *   +0x10  records...     [u32 key][u16 len][u16 flags][len bytes value]
 *   marker [u32 ident][u16 0][u16 0x0200]
 *   tail   ff ef 00 00
 *
 * Big saves (USERDATA00 / AUTOSAVE) hold 14 sections; HEADERSAVE holds one.
 * Sections 0/1 differ slightly between platforms (the Switch timezone
 * record is 208 bytes, the PS4 one 1); everything from section 2 onward is
 * byte-identical, only shifted - which is what the editor's bulk mapping
 * relies on.
 */

export const SECTION_MAGIC0 = 0xee;
export const SECTION_MAGIC1 = 0xff;

/** Switch-only timezone/DST history record (208 bytes on Switch, 1 on PS4). */
export const KEY_TZ_TABLE = 0x725ea090;
/** Player name list: 6 slots x 36 bytes. */
export const KEY_PLAYER_NAMES = 0x3c823935;
/** Section-0 flag: 1 in manual saves (USERDATA00), 0 in AUTOSAVE. */
export const KEY_MANUAL_SAVE = 0xff73995b;

export interface Yw4Record {
  key: number;
  len: number;
  flags: number;
  /** Absolute offset of the record header in the file. */
  offset: number;
}

export interface Yw4Section {
  /** Absolute offset of the section header. */
  offset: number;
  type: number;
  idxSize: number;
  ident: number;
  records: Yw4Record[];
}

export interface ParsedSave {
  data: Uint8Array;
  sections: Yw4Section[];
}

export function parseSave(data: Uint8Array): ParsedSave {
  if (data.length < 16) throw new Error("File is too small to be a Yo-kai Watch save.");
  if (data[0] !== SECTION_MAGIC0 || data[1] !== SECTION_MAGIC1) {
    throw new Error("Not a Yo-kai Watch 4++ save (missing `ee ff` magic).");
  }

  // Every accessor in this module and the editor treats `parsed.data` indices
  // as file offsets. A caller-provided view into a larger buffer would break
  // that (TypedArray fill/set are view-relative), so normalize to a copy.
  if (data.byteOffset !== 0) data = data.slice();

  const sections: Yw4Section[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let off = 0;

  while (off + 16 <= data.length) {
    if (data[off] !== SECTION_MAGIC0 || data[off + 1] !== SECTION_MAGIC1) break;
    const type = view.getUint16(off + 2, true);
    const idxSize = view.getUint32(off + 4, true);
    const ident = view.getUint32(off + 8, true);
    const recordsEnd = off + idxSize;
    if (recordsEnd + 12 > data.length) {
      throw new Error("Save file is truncated (section claims more data than the file holds).");
    }

    const records: Yw4Record[] = [];
    let roff = off + 16;
    while (roff + 8 <= recordsEnd) {
      const key = view.getUint32(roff, true);
      const len = view.getUint16(roff + 4, true);
      const flags = view.getUint16(roff + 6, true);
      if (roff + 8 + len > recordsEnd) break; // malformed tail; stop scanning
      records.push({ key, len, flags, offset: roff });
      roff += 8 + len;
    }

    sections.push({ offset: off, type, idxSize, ident, records });
    off = recordsEnd + 12; // end marker (8) + ff ef 00 00 (4)
  }

  if (sections.length === 0) {
    throw new Error("No valid sections found in save file.");
  }
  return { data, sections };
}

export function findRecord(
  parsed: ParsedSave,
  sectionIndex: number,
  key: number,
): Yw4Record | undefined {
  return parsed.sections[sectionIndex]?.records.find((r) => r.key === key);
}

export function readRecordBytes(parsed: ParsedSave, sectionIndex: number, key: number): Uint8Array {
  const rec = findRecord(parsed, sectionIndex, key);
  if (!rec) throw new Error(`Required save record 0x${key.toString(16)} is missing.`);
  return parsed.data.subarray(rec.offset + 8, rec.offset + 8 + rec.len);
}

/** Detect which platform a big save came from (null if undetectable). */
export function detectSide(parsed: ParsedSave): "switch" | "ps4" | null {
  const tz = findRecord(parsed, 0, KEY_TZ_TABLE);
  if (!tz) return null;
  if (tz.len === 1) return "ps4";
  if (tz.len > 4) return "switch";
  return null;
}

/** True for AUTOSAVE saves, false for manual (USERDATA00). */
export function isAutosave(parsed: ParsedSave): boolean | null {
  const rec = findRecord(parsed, 0, KEY_MANUAL_SAVE);
  if (!rec || rec.len < 1) return null;
  return parsed.data[rec.offset + 8] === 0;
}
