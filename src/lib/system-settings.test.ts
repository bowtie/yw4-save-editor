/**
 * Tests for the SYSTEM save's options blob (graphics & settings).
 *
 * The synthetic builder reproduces the real SYSTEM layout (single 0x10f0
 * section, one options record, irregular 6-byte prologue + 3-byte epilogue
 * around the tagged entries). Real shadPS4 dumps are used when present
 * (git-ignored) to pin the decode against actual game output.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diffByteRanges } from "./byte-diff";
import { parseSave } from "./save-format";
import {
  fieldNameCrc,
  readSystemSettings,
  SYSTEM_SETTINGS,
  SYSTEM_RECORD_KEY,
  SYSTEM_SECTION_IDENT,
  SYSTEM_SECTION_TYPE,
  writeSystemSetting,
} from "./system-settings";
import { describeSystemChanges } from "./change-report";
import { buildSkeleton } from "./test-skeleton";

const REAL_SYSTEM = [
  "tools/lua/saves/system/SYSTEM_data.bin",
  "tools/lua/saves/system/SYSTEM_switch_data.bin",
  "tools/lua/saves/system/SYSTEM_data_modified.bin",
].filter((p) => existsSync(p));

/** Build a minimal SYSTEM save: one section, one record, tagged entries. */
function buildSystemSave(
  values: Record<string, number>,
  byteCounts?: Record<string, 1 | 2>,
): Uint8Array {
  const body: number[] = [0x00, 0x01]; // irregular first entry (CameraRevrseUD)
  const put32 = (v: number) =>
    body.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  put32(fieldNameCrc("CameraRevrseUD"));
  // Regular entries: everything after the first eboot field.
  for (const def of SYSTEM_SETTINGS.filter((d) => d.name !== "CameraRevrseUD")) {
    const count = byteCounts?.[def.name] ?? def.bytes;
    const value = values[def.name] ?? 0;
    put32(count);
    for (let b = 0; b < count; b++) body.push((value >>> (8 * b)) & 0xff);
    put32(fieldNameCrc(def.name));
  }
  body.push(0x01, 0x00, 0x00); // irregular epilogue

  const section = new Uint8Array(16 + 8 + body.length + 12);
  const view = new DataView(section.buffer);
  section[0] = 0xee;
  section[1] = 0xff;
  view.setUint16(2, SYSTEM_SECTION_TYPE, true);
  view.setUint32(4, 16 + 8 + body.length, true);
  view.setUint32(8, SYSTEM_SECTION_IDENT, true);
  view.setUint32(12, 0x01000000, true);
  view.setUint32(16, SYSTEM_RECORD_KEY, true);
  view.setUint16(20, body.length, true);
  view.setUint16(22, 0, true);
  section.set(body, 24);
  const marker = 16 + 8 + body.length;
  view.setUint32(marker, SYSTEM_SECTION_IDENT, true);
  section[marker + 8] = 0xff;
  section[marker + 9] = 0xef;
  return section;
}

const synthetic = () => parseSave(buildSystemSave({ FrameRate: 1, AllGraphic: 2, BGMVol: 7 }));

describe("system settings decode", () => {
  it("decodes every regular field from a synthetic blob", () => {
    const settings = readSystemSettings(synthetic());
    // The irregular CameraRevrseUD prologue entry is not exposed; the other
    // 34 fields decode.
    expect(settings.entries).toHaveLength(SYSTEM_SETTINGS.length - 1);
    expect(settings.byName.get("FrameRate")!.value).toBe(1);
    expect(settings.byName.get("AllGraphic")!.value).toBe(2);
    expect(settings.byName.get("BGMVol")!.value).toBe(7);
  });

  it("reads multi-byte values as little-endian u16", () => {
    const parsed = parseSave(buildSystemSave({ ResolutionWidth: 1920 }, { ResolutionWidth: 2 }));
    expect(readSystemSettings(parsed).byName.get("ResolutionWidth")!.value).toBe(1920);
  });

  it("stops cleanly at unknown crc keys instead of guessing", () => {
    // Build a blob whose second entry has an unknown crc: decode must stop
    // after the first entry, leaving the rest untouched.
    const body: number[] = [0x00, 0x01];
    const put32 = (v: number) =>
      body.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
    put32(fieldNameCrc("CameraRevrseUD")); // irregular first entry
    put32(1);
    body.push(0);
    put32(fieldNameCrc("FrameRate"));
    put32(1);
    body.push(3);
    put32(0xdeadbeef);
    const section = new Uint8Array(16 + 8 + body.length + 12);
    const view = new DataView(section.buffer);
    section[0] = 0xee;
    section[1] = 0xff;
    view.setUint16(2, SYSTEM_SECTION_TYPE, true);
    view.setUint32(4, 16 + 8 + body.length, true);
    view.setUint32(8, SYSTEM_SECTION_IDENT, true);
    view.setUint32(16, SYSTEM_RECORD_KEY, true);
    view.setUint16(20, body.length, true);
    section.set(body, 24);
    const settings = readSystemSettings(parseSave(section));
    expect(settings.entries).toHaveLength(1);
  });
});

describe("system settings writes", () => {
  it("edits exactly the value bytes and nothing else", () => {
    const bytes = buildSystemSave({ FrameRate: 1, AllGraphic: 1, SSAO: 1 });
    const parsed = parseSave(bytes);
    const before = parsed.data.slice();
    const settings = readSystemSettings(parsed);
    writeSystemSetting(parsed, settings.byName.get("SSAO")!, 0);

    const changed: number[] = [];
    for (let i = 0; i < parsed.data.length; i++) {
      if (parsed.data[i] !== before[i]) changed.push(i);
    }
    expect(changed).toHaveLength(1);
    expect(readSystemSettings(parsed).byName.get("SSAO")!.value).toBe(0);
    expect(readSystemSettings(parsed).byName.get("FrameRate")!.value).toBe(1);
  });

  it("writes u16 values into both count=2 bytes", () => {
    const parsed = parseSave(buildSystemSave({ ResolutionHeight: 0 }, { ResolutionHeight: 2 }));
    const settings = readSystemSettings(parsed);
    writeSystemSetting(parsed, settings.byName.get("ResolutionHeight")!, 2160);
    expect(readSystemSettings(parsed).byName.get("ResolutionHeight")!.value).toBe(2160);
  });

  it("rejects out-of-range values", () => {
    const parsed = synthetic();
    const settings = readSystemSettings(parsed);
    expect(() => writeSystemSetting(parsed, settings.byName.get("FrameRate")!, 2)).toThrow(
      /outside/,
    );
    expect(() => writeSystemSetting(parsed, settings.byName.get("AllGraphic")!, -1)).toThrow(
      /outside/,
    );
    expect(() => writeSystemSetting(parsed, settings.byName.get("Resolution")!, 1.5)).toThrow(
      /outside/,
    );
  });

  it("keeps the record length constant across many edits", () => {
    const parsed = synthetic();
    const lenBefore = parsed.data.length;
    const settings = readSystemSettings(parsed);
    for (const def of SYSTEM_SETTINGS) {
      const entry = settings.byName.get(def.name);
      if (entry) writeSystemSetting(parsed, entry, Math.min(entry.value + 1, def.max));
    }
    expect(parsed.data.length).toBe(lenBefore);
    // and still decodes afterwards
    expect(readSystemSettings(parsed).entries.length).toBeGreaterThan(0);
  });

  it("labels system changes for the download preview", () => {
    const bytes = buildSystemSave({ FrameRate: 1, AllGraphic: 1 });
    const parsed = parseSave(bytes);
    const original = parsed.data.slice();
    writeSystemSetting(parsed, readSystemSettings(parsed).byName.get("AllGraphic")!, 2);
    const groups = describeSystemChanges(parsed, original, readSystemSettings(parsed).entries);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("System · Quality preset");
    expect(groups[0].bytes).toBe(1);
  });
});

// The dumps live under the git-ignored tools/ folder, so most clones (and CI)
// skip this suite rather than failing on an empty it.each.
describe.skipIf(REAL_SYSTEM.length === 0)("real SYSTEM dump", () => {
  it.each(REAL_SYSTEM)("decodes the real options blob (%s)", (path) => {
    const parsed = parseSave(new Uint8Array(readFileSync(path)));
    const settings = readSystemSettings(parsed);
    // The real save decodes 34 entries (everything except the irregular
    // first CameraRevrseUD entry, which is preserved verbatim).
    expect(settings.entries.length).toBeGreaterThanOrEqual(30);
    for (const name of ["Resolution", "FrameRate", "AllGraphic", "SSAO", "ShadowQuality"]) {
      expect(settings.byName.get(name), name).toBeDefined();
    }
    // A write round-trip must restore the file byte-for-byte.
    const original = parsed.data.slice();
    const entry = settings.byName.get("AllGraphic")!;
    writeSystemSetting(parsed, entry, entry.value);
    expect(diffByteRanges(original, parsed.data).changed).toBe(0);
  });
});

describe("cross-check with big-save skeletons", () => {
  it("field crc32s do not collide with big-save record edits", () => {
    // Guard against a typo'd name silently hashing to a user-save key.
    const skeletonKeys = parseSave(buildSkeleton("switch")).sections[0].records.map(
      (r) => r.key >>> 0,
    );
    for (const def of SYSTEM_SETTINGS) {
      expect(skeletonKeys).not.toContain(fieldNameCrc(def.name));
    }
  });
});
