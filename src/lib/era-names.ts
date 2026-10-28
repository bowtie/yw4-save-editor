/** Era tags on yo-kai names. The game suffixes species that exist in more
 *  than one era, e.g. "Blazion (Lightside)". The editor shows the era only
 *  where a name is shared: Lightside and Future rows are the shadowside
 *  versions, Nate's era ("Present") is the default and stays bare. */
import { nameForParam } from "./characters";
import { PLAYABLE_YOKAI } from "./yokai-playable";

const ERA_TAG = / \((Lightside|Future|Present|Past|Friend Form)\)$/;
const ERA_LABEL: Record<string, string> = {
  Lightside: "Shadowside",
  Future: "Shadowside",
  Past: "Past",
};

/** The name without its era tag. */
export function eraBaseName(raw: string): string {
  return raw.replace(ERA_TAG, "");
}

/** `raw` with its era shown, but only when `shared` (another entry has the
 *  same base name). */
export function eraDisplayName(raw: string, shared: boolean): string {
  const base = eraBaseName(raw);
  const label = ERA_LABEL[ERA_TAG.exec(raw)?.[1] ?? ""];
  return label && shared ? `${base} (${label})` : base;
}

/** How many entries of `names` share each era-less name. */
export function eraNameCounts(names: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of names) {
    const base = eraBaseName(raw);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  return counts;
}

const rosterRaw = (y: { id: number; name: string }) => nameForParam(y.id) ?? y.name;
const COLLECTIBLE = PLAYABLE_YOKAI.filter((y) => y.section === "yokai");
const ROSTER_COUNTS = eraNameCounts(COLLECTIBLE.map(rosterRaw));
const ROSTER_NAMES = new Map(
  COLLECTIBLE.map((y) => {
    const raw = rosterRaw(y);
    return [y.id, eraDisplayName(raw, (ROSTER_COUNTS.get(eraBaseName(raw)) ?? 0) > 1)] as const;
  }),
);

/** Display name for a collectible yo-kai ParamID, or undefined for ids
 *  outside the collectible roster (boss and special entries). */
export function rosterDisplayName(paramId: number): string | undefined {
  return ROSTER_NAMES.get(paramId);
}
