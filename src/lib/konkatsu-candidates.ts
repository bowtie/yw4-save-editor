/** The yo-kai currently offered by the soul-summon (konkatsu) match board.
 *
 *  Section 0x1005 is a pool of 1607 fixed 469-byte cells:
 *  [6 party][400 roster][1200 candidates]. The game refreshes the candidate
 *  pool with three rolled individuals per offered species; each candidate
 *  carries its own level, personality and random-growth rolls. The cells are
 *  tagged property lists: [u32 crc32(field name)][u32 value length][value].
 *
 *  Candidate ParamIDs are CHARA_PARAM rows; several BaseIDs (the soul-ledger
 *  key used by KONKATSU_LIST) can share one species ParamID, so candidates
 *  are grouped by canonical ParamID. Layout is pinned to the supported game
 *  version, like every offset in this project.
 */
import type { ParsedSave } from "./save-format";
import { canonicalParamId } from "./yokai-stats";

/** Candidate-pool layout inside section 0x1005. */
export const KONKATSU_BOARD = {
  /** Records begin after the 16-byte section header. */
  dataOffset: 16,
  /** 6 party + 400 roster cells precede the 1200-candidate board. */
  firstCell: 406,
  cellSize: 469,
  cells: 1200,
} as const;

export interface KonkatsuCandidate {
  /** Cell index in the candidate pool (for stable React keys / debugging). */
  slot: number;
  /** ParamID stored on the candidate. */
  paramId: number;
  /** ParamID with alternate rows resolved to the canonical species row. */
  speciesParamId: number;
  level: number;
  /** 1-based personality enum stored by the game. */
  personality: number;
  /** Six raw prm_random growth rolls stored with the candidate. */
  growth: readonly [number, number, number, number, number, number];
  /** Rare candidates cost ten times the level surcharge. */
  isRare: boolean;
}

const TAG = {
  paramId: 0xba162c11,
  prmRandom: 0xf21c51ff,
  personality: 0xe1cf90ae,
  nowLv: 0x377173b1,
  isRare: 0x288b8db3,
} as const;

type TagName = keyof typeof TAG;

const TAG_BY_KEY = new Map<number, TagName>(
  (Object.entries(TAG) as [TagName, number][]).map(([name, key]) => [key, name]),
);

interface CellTags {
  paramId?: number;
  level?: number;
  personality?: number;
  growth?: [number, number, number, number, number, number];
  isRare?: boolean;
}

/** Read the tags this module needs from one cell.  Empty cells have every
 *  value zeroed, so the caller also checks that paramId is non-zero. */
function readCellTags(v: DataView, start: number, end: number): CellTags {
  const tags: CellTags = {};
  for (let o = start; o + 8 <= end; o++) {
    const name = TAG_BY_KEY.get(v.getUint32(o, true));
    if (!name) continue;
    const len = v.getUint32(o + 4, true);
    const value = o + 8;
    if (value + len > end) continue;
    switch (name) {
      case "paramId":
        if (len === 4) tags.paramId = v.getUint32(value, true);
        break;
      case "nowLv": {
        if (len !== 4) break;
        const level = v.getUint32(value, true);
        if (level >= 1 && level <= 120) tags.level = level;
        break;
      }
      case "personality":
        if (len === 1) tags.personality = v.getUint8(value);
        break;
      case "prmRandom":
        if (len === 6) {
          tags.growth = [
            v.getUint8(value),
            v.getUint8(value + 1),
            v.getUint8(value + 2),
            v.getUint8(value + 3),
            v.getUint8(value + 4),
            v.getUint8(value + 5),
          ];
        }
        break;
      case "isRare":
        if (len === 1) tags.isRare = v.getUint8(value) !== 0;
        break;
    }
  }
  return tags;
}

const ZERO_GROWTH = [0, 0, 0, 0, 0, 0] as const;

/** Every filled candidate cell on the current match board.  Returns an empty
 *  list for save variants without the 0x1005 board. */
export function readKonkatsuCandidates(parsed: ParsedSave): KonkatsuCandidate[] {
  const section = parsed.sections.find((s) => s.type === 0x1005);
  if (!section) return [];
  const v = new DataView(parsed.data.buffer, parsed.data.byteOffset, parsed.data.byteLength);
  const limit = Math.min(section.offset + section.idxSize, parsed.data.length);
  const pool =
    section.offset + KONKATSU_BOARD.dataOffset + KONKATSU_BOARD.firstCell * KONKATSU_BOARD.cellSize;
  const out: KonkatsuCandidate[] = [];
  for (let slot = 0; slot < KONKATSU_BOARD.cells; slot++) {
    const start = pool + slot * KONKATSU_BOARD.cellSize;
    if (start + 16 > limit) break;
    const end = Math.min(start + KONKATSU_BOARD.cellSize, limit);
    const tags = readCellTags(v, start, end);
    if (!tags.paramId || tags.level === undefined) continue;
    const paramId = tags.paramId >>> 0;
    out.push({
      slot,
      paramId,
      speciesParamId: canonicalParamId(paramId),
      level: tags.level,
      personality: tags.personality ?? 0,
      growth: tags.growth ?? ZERO_GROWTH,
      isRare: tags.isRare ?? false,
    });
  }
  return out;
}

/** Candidates grouped by canonical species ParamID, in board order. */
export function konkatsuCandidatesBySpecies(parsed: ParsedSave): Map<number, KonkatsuCandidate[]> {
  const groups = new Map<number, KonkatsuCandidate[]>();
  for (const candidate of readKonkatsuCandidates(parsed)) {
    const list = groups.get(candidate.speciesParamId);
    if (list) list.push(candidate);
    else groups.set(candidate.speciesParamId, [candidate]);
  }
  return groups;
}
