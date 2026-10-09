import { describe, expect, it } from "vitest";
import {
  detectSide,
  findRecord,
  isAutosave,
  parseSave,
  KEY_TZ_TABLE,
  KEY_MANUAL_SAVE,
} from "./save-format";
import { buildSkeleton } from "./test-skeleton";

const skeleton = () => buildSkeleton("switch");

describe("save parsing", () => {
  it("rejects files that are too small", () => {
    expect(() => parseSave(new Uint8Array(8))).toThrow(/too small/);
  });

  it("rejects files without the ee ff magic", () => {
    const bytes = skeleton();
    bytes[0] = 0x12;
    bytes[1] = 0x34;
    expect(() => parseSave(bytes)).toThrow(/magic/);
  });

  it("rejects a truncated section that claims data past EOF", () => {
    const bytes = skeleton();
    const view = new DataView(bytes.buffer);
    view.setUint32(4, bytes.length * 2, true); // idxSize far beyond EOF
    expect(() => parseSave(bytes)).toThrow(/truncated/);
  });

  it("stops the section walk at the first non-magic byte", () => {
    // The filler tail after section C has no ee ff magic; the parser should
    // return the 3 real sections without throwing.
    expect(parseSave(skeleton()).sections).toHaveLength(3);
  });

  it("detects the platform from the timezone record", () => {
    const switchParsed = parseSave(skeleton());
    const ps4Parsed = parseSave(buildSkeleton("ps4"));
    // Switch timezone record: 208 bytes; PS4: 1. detectSide keys off length.
    expect(detectSide(switchParsed)).toBe("switch");
    expect(detectSide(ps4Parsed)).toBe("ps4");
  });

  it("reads the manual-save flag from section 0", () => {
    const parsed = parseSave(skeleton());
    const rec = findRecord(parsed, 0, KEY_MANUAL_SAVE);
    expect(rec).toBeDefined();
    // Skeleton records are zero-filled, so the flag reads as autosave; set it
    // to 1 and isAutosave must flip to false (USERDATA00 behavior).
    expect(isAutosave(parsed)).toBe(true);
    parsed.data[rec!.offset + 8] = 1;
    expect(isAutosave(parsed)).toBe(false);
    // The timezone table only exists on the Switch side.
    expect(findRecord(parsed, 0, KEY_TZ_TABLE)?.len).toBeGreaterThan(4);
  });
});
