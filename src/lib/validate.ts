/**
 * Load-time layout gate for the editor.
 *
 * The editor edits sections 0/1 by record key and the bulk data region by
 * absolute offset, anchored at section 2's start with offsets pinned to
 * Switch 2.2.0 / PS4 1.50 (see editor.ts). Anything that shifts that layout —
 * another game version, a different Yo-kai Watch title, a truncated file —
 * must be rejected before an edit can land on the wrong bytes. All checks
 * here are confirmed against real dumps.
 */
import { IDENT_BIG, IDENT_C, TAIL_SIZE } from "./skeleton-data";
import { findRecord, type ParsedSave } from "./save-format";
import {
  KEY_GLOBAL_BYTE_FLAG,
  KEY_MONEY,
  KEY_MONEY_SPENT,
  KEY_PLAYER_NAMES,
  KEY_PLAY_TIME,
} from "./editor";

const hex = (n: number) => "0x" + n.toString(16);

/** Records every edit path in editor.ts hard-requires. */
const REQUIRED_RECORDS: readonly { section: 0 | 1; key: number; why: string }[] = [
  { section: 0, key: KEY_MONEY, why: "money" },
  { section: 0, key: KEY_MONEY_SPENT, why: "money spent" },
  { section: 0, key: KEY_PLAYER_NAMES, why: "protagonist names" },
  { section: 0, key: KEY_PLAY_TIME, why: "play time" },
  { section: 1, key: KEY_GLOBAL_BYTE_FLAG, why: "global flags (crank-a-kai counters)" },
];

/**
 * Throw (with an actionable message) unless `parsed` is a big save with the
 * exact section/record layout the editor's offset tables assume.
 */
export function assertEditableLayout(parsed: ParsedSave): void {
  if (parsed.sections.length < 3) {
    throw new Error(
      "This file holds too few sections to be an editable user save " +
        "(HEADERSAVE/SYSTEM are metadata only). Drop USERDATA00 or AUTOSAVE.",
    );
  }

  const [sec0, sec1, sec2] = parsed.sections;
  if (sec0.type !== 0x1001 || sec1.type !== 0x1002 || sec2.type !== 0x1003) {
    throw new Error(
      `Unexpected section layout (types ${hex(sec0.type)}, ${hex(sec1.type)}, ${hex(sec2.type)}): ` +
        "not a Yo-kai Watch 4++ user save.",
    );
  }
  if (sec0.ident !== IDENT_BIG || sec1.ident !== IDENT_BIG || sec2.ident !== IDENT_C) {
    throw new Error("Unexpected section idents: not a Yo-kai Watch 4++ user save.");
  }

  // Bulk offsets are expressed relative to section 2; the game version that
  // wrote the save must have the exact same region sizes, or every inventory
  // write would land on the wrong bytes.
  const tail = parsed.data.length - sec2.offset;
  if (tail !== TAIL_SIZE) {
    throw new Error(
      `Unsupported save version: the data region is ${tail} bytes, expected ${TAIL_SIZE} ` +
        "(Switch 2.2.0 / PS4 1.50). Refusing to edit rather than corrupt the file.",
    );
  }

  const missing = REQUIRED_RECORDS.filter(
    ({ section, key }) => !findRecord(parsed, section, key),
  ).map(({ why }) => why);
  if (missing.length > 0) {
    throw new Error(`Save is missing required records (${missing.join(", ")}); refusing to edit.`);
  }
}
