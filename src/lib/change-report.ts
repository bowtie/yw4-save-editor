/**
 * Human-readable change report for the download diff preview: turns raw
 * differing byte ranges into labeled groups ("Money", "Bag slot 12",
 * "Yo-kai slot 37") so users can see exactly what their edits touched
 * before they write a save file.
 */
import { diffByteRanges, type ByteRange } from "./byte-diff";
import { bulkStart, INVENTORIES, SOUL_KEYS, SWITCH_SECTION2_START, YOKAI_SOULS } from "./editor";
import { PARTY_BASE, YOKAI_BASE, SLOT_STRIDE, PARTY_SLOTS, YOKAI_SLOTS } from "./party";
import type { ParsedSave, Yw4Record, Yw4Section } from "./save-format";

/** The 0x1009 soulUnique slot region, located the same way editor.ts's
 *  `soulSectionBase` finds it: scan the section head for the key at 8-byte
 *  stride. Null when this save has no ledger region. */
function soulLedgerRegion(
  parsed: ParsedSave,
  sec: Yw4Section,
): { start: number; end: number } | null {
  const v = new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength);
  const limit = Math.min(sec.offset + 0x2000, parsed.data.byteLength);
  for (let o = sec.offset + 16; o + 4 <= limit; o += 8) {
    if (v.getUint32(o, true) >>> 0 === SOUL_KEYS.soulUnique) {
      return { start: o, end: o + YOKAI_SOULS.count * YOKAI_SOULS.stride };
    }
  }
  return null;
}

/** Labels for the section-0/1 record keys this tool knows the meaning of. */
const KEY_LABELS: Record<number, string> = {
  0xb7df13e4: "Money",
  0x8127b2c2: "Money spent",
  0x3c823935: "Protagonist names",
  0x19560d9a: "Current map",
  0xd149530b: "Safe respawn map",
  0x4b7664ab: "Player position",
  0x3a40c52c: "Play time",
  0x523e47fa: "Current protagonist",
  0x725ea090: "Timezone history",
  0xff73995b: "Manual-save flag",
  0x2e5f582c: "Global flags",
  0xcf6dfcc9: "Item acquisition log",
};

/** Bytes 11..14 of the global flag array hold the crank-a-kai counters. */
const CRANK_VALUE_START = 11;
const CRANK_VALUE_END = 15;

const hex24 = (n: number) => "0x" + n.toString(16).padStart(8, "0");

/** Label for a range known to sit inside one section-0/1 record. */
function labelSmallSectionRecord(
  sectionIndex: number,
  key: number,
  valueStart: number,
  at: number,
): string {
  if (
    key === 0x2e5f582c &&
    at >= valueStart + CRANK_VALUE_START &&
    at < valueStart + CRANK_VALUE_END
  ) {
    return "Crank-a-kai counters";
  }
  if (key === 0x3c823935) {
    const slot = Math.floor((at - valueStart) / 36);
    if (slot >= 0 && slot < 6) return `Protagonist name slot ${slot + 1}`;
  }
  return KEY_LABELS[key] ?? `Section-${sectionIndex} record ${hex24(key)}`;
}

/** Label for a bulk-region range, from the confirmed offset tables. */
function labelBulk(sw: number): string {
  for (const def of Object.values(INVENTORIES)) {
    if (sw >= def.base && sw < def.base + def.count * def.stride) {
      const slot = Math.floor((sw - def.base) / def.stride);
      return `${def.label} slot ${slot + 1}`;
    }
  }
  if (sw >= YOKAI_SOULS.base && sw < YOKAI_SOULS.base + YOKAI_SOULS.count * YOKAI_SOULS.stride) {
    const slot = Math.floor((sw - YOKAI_SOULS.base) / YOKAI_SOULS.stride);
    return `Yo-kai soul counters slot ${slot + 1}`;
  }
  if (sw >= PARTY_BASE && sw < PARTY_BASE + PARTY_SLOTS * SLOT_STRIDE) {
    return `Party character slot ${Math.floor((sw - PARTY_BASE) / SLOT_STRIDE) + 1}`;
  }
  if (sw >= YOKAI_BASE && sw < YOKAI_BASE + YOKAI_SLOTS * SLOT_STRIDE) {
    return `Yo-kai slot ${Math.floor((sw - YOKAI_BASE) / SLOT_STRIDE) + 1}`;
  }
  return `Bulk data @${hex24(sw)}`;
}

function labelRange(parsed: ParsedSave, range: ByteRange): string {
  for (let i = 0; i < parsed.sections.length; i++) {
    const sec = parsed.sections[i];
    const recordsEnd = sec.offset + sec.idxSize;
    const secEnd = recordsEnd + 12; // end marker + ff ef 00 00
    if (range.start < sec.offset || range.start >= secEnd) continue;

    if (range.start < sec.offset + 16 || range.start >= recordsEnd) {
      return `Section ${i} header/markers`;
    }

    if (i <= 1) {
      // Modeled by record key.
      const rec: Yw4Record | undefined = sec.records.find(
        (r) => range.start >= r.offset && range.start < r.offset + 8 + r.len,
      );
      if (!rec) return `Section ${i} record headers`;
      return labelSmallSectionRecord(i, rec.key, rec.offset + 8, range.start);
    }

    if (i === 2) {
      const rec: Yw4Record | undefined = sec.records.find(
        (r) => range.start >= r.offset && range.start < r.offset + 8 + r.len,
      );
      return rec ? `Section-2 record ${hex24(rec.key)}` : `Section 2 structure`;
    }

    if (sec.type === 0x1009) {
      // The 0x1009 soulUnique slot region (see editor.ts's soul ledger):
      // 500 x 80B records whose writes must not be confused with the soul
      // BAG table they sit adjacent to in switch-space coordinates.
      const ledger = soulLedgerRegion(parsed, sec);
      if (ledger && range.start >= ledger.start && range.start < ledger.end) {
        const row = Math.floor((range.start - ledger.start) / 80);
        return `Soul ledger row ${row + 1} (section record)`;
      }
    }

    // Sections 3+: the record scan is deliberately incomplete here (extended
    // record formats), so label from the confirmed bulk tables first.
    return labelBulk(SWITCH_SECTION2_START + (range.start - bulkStart(parsed)));
  }
  // Data beyond the last section (the skeleton's bulk tail, or any bytes the
  // game appends without a section wrapper) still maps through the bulk tables.
  if (parsed.sections.length >= 3 && range.start >= bulkStart(parsed)) {
    return labelBulk(SWITCH_SECTION2_START + (range.start - bulkStart(parsed)));
  }
  return `Unknown region @${hex24(range.start)}`;
}

export interface ChangeGroup {
  label: string;
  /** Total differing bytes in the group. */
  bytes: number;
  ranges: ByteRange[];
}

/**
 * Group the byte difference between the loaded original and the current
 * (possibly edited) parsed save into labeled change groups, ordered by file
 * position. An unedited save yields an empty list.
 */
export function describeChanges(parsed: ParsedSave, original: Uint8Array): ChangeGroup[] {
  const { ranges } = diffByteRanges(original, parsed.data);
  const groups: ChangeGroup[] = [];
  for (const range of ranges) {
    const label = labelRange(parsed, range);
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.ranges[last.ranges.length - 1].end === range.start) {
      last.ranges.push(range);
      last.bytes += range.end - range.start;
    } else {
      groups.push({ label, bytes: range.end - range.start, ranges: [range] });
    }
  }
  return groups;
}
