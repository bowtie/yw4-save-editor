/**
 * Yo-kai Watch 4++ system save (SYSTEM slot) — graphics & options editing.
 *
 * The SYSTEM save is a single section (type 0x10f0, ident 0x46e7e246) holding
 * one record (key 0x40c46a00) with the packed CSystemSaveData options blob.
 * The blob is a tagged list in the game's internal field order:
 *
 *   [u32 count][count × u8 value][u32 crc32(field name)]  per setting
 *
 * Field names come from the CSystemSaveData strings in eboot.bin; every key
 * below was matched against a real shadPS4 SYSTEM dump (crc32 hit at stride,
 * in exact eboot order). Value ranges: AllGraphic is confirmed 0–2 by the
 * three-preset COptionPresetParam in gamedata.cpk; the other ranges are
 * storage-derived or inferred and marked in `range` notes. The blob's first
 * entry and 3-byte tail use irregular encodings — both are preserved
 * verbatim; only the well-formed count=1/count=2 entries are exposed.
 */
import type { ParsedSave } from "./save-format";

export const SYSTEM_SECTION_TYPE = 0x10f0;
export const SYSTEM_SECTION_IDENT = 0x46e7e246;
export const SYSTEM_RECORD_KEY = 0x40c46a00;

const table = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** crc32 of an internal field name — the same scheme as the record keys. */
export function fieldNameCrc(name: string): number {
  let c = 0xffffffff;
  for (const b of new TextEncoder().encode(name)) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface SystemSettingDef {
  /** Internal field name (eboot.bin CSystemSaveData strings). */
  name: string;
  label: string;
  group: "graphics" | "camera" | "audio" | "interface";
  /** Confirmed from game data (presets, observed values) vs inferred. */
  min: number;
  max: number;
  bytes: 1 | 2;
  /** Range confidence note for the UI. */
  confirmed: boolean;
  /** Optional value labels (only where meaning is confirmed or near-certain). */
  labels?: string[];
  /** The game writes the field but its options menu never shows it. */
  hiddenInMenu?: boolean;
}

const def = (
  name: string,
  label: string,
  group: SystemSettingDef["group"],
  min: number,
  max: number,
  opts: { bytes?: 1 | 2; confirmed?: boolean; labels?: string[]; hiddenInMenu?: boolean } = {},
): SystemSettingDef => ({
  name,
  label,
  group,
  min,
  max,
  bytes: opts.bytes ?? 1,
  confirmed: opts.confirmed ?? false,
  labels: opts.labels,
  hiddenInMenu: opts.hiddenInMenu,
});

/**
 * The settings the editor exposes, in blob (eboot) order. The engine-side
 * toggles from eboot (enableSSR, TAA/FXAA/SMAA, hdrIntensity, …) are NOT
 * stored in the save and are deliberately absent.
 */
export const SYSTEM_SETTINGS: SystemSettingDef[] = [
  // Camera (first regular entries of the blob).
  def("CameraRevrseUD", "Invert camera up/down", "camera", 0, 1, { labels: ["Off", "On"] }),
  def("CameraRevrseLR", "Invert camera left/right", "camera", 0, 1, { labels: ["Off", "On"] }),
  def("BGMVol", "Music volume", "audio", 0, 10),
  def("SEVol", "Sound effects volume", "audio", 0, 10),
  def("VoiceVol", "Voice volume", "audio", 0, 10),
  def("CursorSpeed", "Cursor speed", "interface", 0, 10),
  def("CameraSpeedMouse", "Camera speed (mouse)", "camera", 0, 10),
  def("CameraSpeedPad", "Camera speed (controller)", "camera", 0, 10),
  def("VoiceLanguage", "Voice language", "interface", 0, 5),
  def("LastLanguageCode", "Last language code", "interface", 0, 255),
  def("CameraAdjustUD", "Camera adjust up/down", "camera", 0, 7),
  def("CameraAdjustLR", "Camera adjust left/right", "camera", 0, 7),
  def("SubTitle", "Subtitles", "interface", 0, 2),
  def("MinimapRotate", "Minimap rotation", "interface", 0, 1, { labels: ["Off", "On"] }),
  // Graphics block.
  def("ScreenSize", "Screen size", "graphics", 0, 2),
  def("Resolution", "Resolution", "graphics", 0, 2, { labels: ["0", "1", "2"] }),
  // Both a PS4 and a Switch dump store FrameRate=1 while the consoles run
  // 60/30 natively — this field is a stored default/preference, not the
  // effective framerate, so no 30/60 labels are claimed.
  def("FrameRate", "Frame rate", "graphics", 0, 1, { labels: ["0", "1"] }),
  def("AntiAliasing", "Anti-aliasing", "graphics", 0, 2),
  def("AllGraphic", "Quality preset", "graphics", 0, 2, {
    confirmed: true,
    labels: ["0 (low)", "1 (standard)", "2 (high)"],
  }),
  def("SSAO", "SSAO", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("MotionBlur", "Motion blur", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("SSR", "Screen-space reflections", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("Bloom", "Bloom", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("DepthOfField", "Depth of field", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("SunShaft", "Sun shafts", "graphics", 0, 1, { labels: ["Off", "On"] }),
  def("ShadowQuality", "Shadow quality", "graphics", 0, 2),
  def("TextureQuality", "Texture quality", "graphics", 0, 2),
  def("EulaAgree", "EULA agreed", "interface", 0, 1),
  def("BattlePadSetting", "Battle pad setting", "interface", 0, 255),
  def("LastSaveSlot", "Last save slot", "interface", 0, 255),
  def("ResolutionWidth", "Resolution width", "graphics", 0, 0xffff, { bytes: 2 }),
  def("ResolutionHeight", "Resolution height", "graphics", 0, 0xffff, { bytes: 2 }),
  def("AimModeType", "Aim mode", "interface", 0, 2, { bytes: 2 }),
  def("CameraSpeedPadVertical", "Camera speed (vertical)", "camera", 0, 10),
  def("CameraSpeedPadHorizontal", "Camera speed (horizontal)", "camera", 0, 10),
  // These live past the record's declared length — the game's len field
  // undercounts and the tagged list runs to the section end marker. The
  // game writes them but its options menu never shows them (hidden).
  def("ObjectVisible", "Object visibility", "interface", 0, 2, { hiddenInMenu: true }),
  def("ObjectiveArrowVisible", "Objective arrow", "interface", 0, 1, {
    labels: ["Off", "On"],
    hiddenInMenu: true,
  }),
  def("BaloonTalkSpeed", "Balloon talk speed", "interface", 0, 10, { hiddenInMenu: true }),
  def("MinimapVisible", "Minimap visibility", "interface", 0, 3, { hiddenInMenu: true }),
  def("CompassVisible", "Compass", "interface", 0, 1, {
    labels: ["Off", "On"],
    hiddenInMenu: true,
  }),
  def("AMPMNotation", "AM/PM notation", "interface", 0, 1, { hiddenInMenu: true }),
  def("FirstBooted", "First boot done", "interface", 0, 1, { hiddenInMenu: true }),
  def("LanguageCode", "Language code", "interface", 0, 255, { hiddenInMenu: true }),
];

const defsByCrc = new Map(SYSTEM_SETTINGS.map((d) => [fieldNameCrc(d.name), d]));

export interface SystemSettingEntry {
  def: SystemSettingDef;
  /** Absolute offset of the value bytes in the parsed save. */
  valueOffset: number;
  /** Value byte count as written by the game (blob count field). */
  byteLength: number;
  value: number;
}

export interface SystemSettings {
  entries: SystemSettingEntry[];
  byName: Map<string, SystemSettingEntry>;
}

/** Throw unless `parsed` is the single-section SYSTEM save. */
export function assertSystemLayout(parsed: ParsedSave): void {
  if (parsed.sections.length !== 1 || parsed.sections[0].type !== SYSTEM_SECTION_TYPE) {
    throw new Error("This file is not a Yo-kai Watch 4++ SYSTEM save.");
  }
  const sec = parsed.sections[0];
  if (sec.ident !== SYSTEM_SECTION_IDENT) {
    throw new Error("Unexpected SYSTEM save section ident.");
  }
  if (!sec.records.some((r) => r.key >>> 0 === SYSTEM_RECORD_KEY)) {
    throw new Error("SYSTEM save is missing the options record.");
  }
}

/**
 * Decode the options blob. Unmodeled prologue bytes (the first entry's short
 * count) are left untouched — every write substitutes value bytes in place,
 * so the structure can never shift.
 *
 * The record's declared len UNDERCOUNTS the real tagged list (verified on
 * dumps where the game appended newer fields): the chain runs to the section
 * end marker, so scanning continues past the record boundary.
 */
export function readSystemSettings(parsed: ParsedSave): SystemSettings {
  assertSystemLayout(parsed);
  const sec = parsed.sections[0];
  const rec = sec.records.find((r) => r.key >>> 0 === SYSTEM_RECORD_KEY)!;
  const start = rec.offset + 8;
  const end = sec.offset + sec.idxSize; // chain may exceed the record's len
  const view = new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength);

  const entries: SystemSettingEntry[] = [];
  // Entries begin after the irregular 6-byte prologue and run while a full
  // [u32 count][values][u32 crc] unit fits and its crc matches a known field.
  let p = start + 6;
  while (p + 9 <= end) {
    const count = view.getUint32(p, true);
    if (count !== 1 && count !== 2) break;
    const crc = view.getUint32(p + 4 + count, true);
    const defEntry = defsByCrc.get(crc);
    if (!defEntry) break;
    let value = 0;
    for (let b = 0; b < count; b++) {
      value |= parsed.data[p + 4 + b] << (8 * b);
    }
    entries.push({ def: defEntry, valueOffset: p + 4, byteLength: count, value });
    p += 4 + count + 4;
  }

  const byName = new Map(entries.map((e) => [e.def.name, e]));
  return { entries, byName };
}

/**
 * Write a setting value in place (same byte length; the format has no
 * checksums, but structure must never shift). Throws when the entry is not
 * present in this save or the value is out of the field's confirmed range.
 */
export function writeSystemSetting(
  parsed: ParsedSave,
  entry: SystemSettingEntry,
  value: number,
): void {
  const { def: d, byteLength } = entry;
  const byteCap = byteLength === 1 ? 0xff : 0xffff;
  if (!Number.isInteger(value) || value < d.min || value > Math.min(d.max, byteCap)) {
    throw new Error(`${d.label}: value ${value} outside ${d.min}–${Math.min(d.max, byteCap)}.`);
  }
  for (let b = 0; b < byteLength; b++) {
    parsed.data[entry.valueOffset + b] = (value >>> (8 * b)) & 0xff;
  }
}
