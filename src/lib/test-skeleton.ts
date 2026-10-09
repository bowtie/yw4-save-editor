/**
 * Synthetic empty saves with the real record layout, used by tests to get a
 * structurally valid save without shipping one. Extracted verbatim from the
 * converter's built-in template builder.
 */
import {
  IDENT_BIG,
  PS4_SECTION_A,
  PS4_SECTION_B,
  SECTION_A_TYPE,
  SECTION_B_TYPE,
  SECTION_C_TYPE,
  IDENT_C,
  SWITCH_SECTION_A,
  SWITCH_SECTION_B,
  SWITCH_TZ_BASE64,
  TAIL_SIZE,
  type SkeletonRow,
} from "./skeleton-data";
import { KEY_TZ_TABLE, SECTION_MAGIC0, SECTION_MAGIC1 } from "./save-format";

type Side = "switch" | "ps4";

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function buildSectionFromRows(
  type: number,
  ident: number,
  rows: SkeletonRow[],
  tz: Uint8Array | null,
): Uint8Array {
  const bodyLen = rows.reduce((n, r) => n + 8 + r.l, 0);
  const s = new Uint8Array(16 + bodyLen + 12);
  const v = new DataView(s.buffer);
  s[0] = SECTION_MAGIC0;
  s[1] = SECTION_MAGIC1;
  v.setUint16(2, type, true);
  v.setUint32(4, 16 + bodyLen, true); // idxSize = offset of the end marker
  v.setUint32(8, ident, true);
  v.setUint32(12, 0x01000000, true);
  let off = 16;
  for (const r of rows) {
    v.setUint32(off, r.k, true);
    v.setUint16(off + 4, r.l, true);
    v.setUint16(off + 6, r.f, true);
    if (tz && r.k === KEY_TZ_TABLE) s.set(tz, off + 8);
    off += 8 + r.l;
  }
  v.setUint32(off, ident, true); // end marker
  v.setUint16(off + 4, 0, true);
  v.setUint16(off + 6, 0x0200, true);
  s[off + 8] = 0xff;
  s[off + 9] = 0xef;
  return s;
}

/** Synthesize a destination-platform save structure for one-sided drops. */
export function buildSkeleton(side: Side): Uint8Array {
  const rowsA = side === "ps4" ? PS4_SECTION_A : SWITCH_SECTION_A;
  const rowsB = side === "ps4" ? PS4_SECTION_B : SWITCH_SECTION_B;
  const tz = side === "switch" ? base64ToBytes(SWITCH_TZ_BASE64) : null;
  const a = buildSectionFromRows(SECTION_A_TYPE, IDENT_BIG, rowsA, tz);
  const b = buildSectionFromRows(SECTION_B_TYPE, IDENT_BIG, rowsB, null);
  // A valid but empty section marks the start of the bulk-data region so the
  // converter's tail-size check sees the same layout as a real save.
  const emptyC = new Uint8Array(28);
  const cv = new DataView(emptyC.buffer);
  emptyC[0] = SECTION_MAGIC0;
  emptyC[1] = SECTION_MAGIC1;
  cv.setUint16(2, SECTION_C_TYPE, true);
  cv.setUint32(4, 16, true);
  cv.setUint32(8, IDENT_C, true);
  cv.setUint32(12, 0x01000000, true);
  cv.setUint32(16, IDENT_C, true);
  cv.setUint16(20, 0, true);
  cv.setUint16(22, 0x0200, true);
  emptyC[24] = 0xff;
  emptyC[25] = 0xef;
  const filler = new Uint8Array(TAIL_SIZE - emptyC.length);
  return concat([a, b, emptyC, filler]);
}
