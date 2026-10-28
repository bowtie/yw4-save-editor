/** Plain-language summary of what the user changed, built by reading the
 *  original and edited saves through the same readers the panels use. The
 *  byte-region report in change-report.ts stays as the low-level detail. */
import { INVENTORIES, readInventory, readPlayer, readYoKaiSouls, type Slot } from "./editor";
import { readParty, readYoKaiSlots, type PartySlot } from "./party";
import { parseSave, type ParsedSave } from "./save-format";
import { nameForParam } from "./characters";
import { yokaiNameFor } from "./yokai";
import { PLAYABLE_YOKAI } from "./yokai-playable";

const PROTAGONISTS = ["Nate", "Katie", "Summer", "Touma", "Akinori", "Shin"];
/** Party slots are stored in join order; names in display order. */
const PARTY_LABELS = ["Nate", "Summer", "Touma", "Akinori", "Katie", "Shin"];
const CRANK_LABELS = [
  "Daily crank pulls left",
  "Max crank pulls",
  "Capital pulls left",
  "Capital max",
];
const MAX_NAMES = 6;

const rosterById = new Map(PLAYABLE_YOKAI.map((y) => [y.id, y.name]));
const speciesName = (id: number): string =>
  rosterById.get(id) ??
  nameForParam(id) ??
  yokaiNameFor(id) ??
  `Unknown 0x${id.toString(16).toUpperCase()}`;

const n = (v: number) => v.toLocaleString("en-US");

/** "A, B, C and 4 more" */
function nameList(names: string[]): string {
  if (names.length <= MAX_NAMES) return names.join(", ");
  return `${names.slice(0, MAX_NAMES).join(", ")} and ${names.length - MAX_NAMES} more`;
}

function diffInventory(label: string, before: Slot[], after: Slot[]): string[] {
  const b = new Map(before.map((s) => [s.crc, s]));
  const a = new Map(after.map((s) => [s.crc, s]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const [crc, s] of a) {
    const old = b.get(crc);
    if (!old) added.push(s.name);
    else if (old.quantity !== s.quantity) changed.push(`${s.name} ${old.quantity}→${s.quantity}`);
  }
  for (const [crc, s] of b) if (!a.has(crc)) removed.push(s.name);
  const lines: string[] = [];
  if (added.length) lines.push(`${label}: added ${nameList(added)}`);
  if (changed.length) lines.push(`${label}: quantity ${nameList(changed)}`);
  if (removed.length) lines.push(`${label}: removed ${nameList(removed)}`);
  return lines;
}

function diffSlots(kind: string, before: PartySlot[], after: PartySlot[]): string[] {
  const lines: string[] = [];
  for (const s of after) {
    const old = before[s.index];
    const who = (slot: PartySlot) =>
      kind === "Character"
        ? (PARTY_LABELS[slot.index] ?? `Slot ${slot.index + 1}`)
        : speciesName(slot.speciesId);
    if (s.exists && !old?.exists) {
      lines.push(`${kind} added: ${who(s)} (Lv ${s.level}, slot ${s.index + 1})`);
      continue;
    }
    if (!s.exists && old?.exists) {
      lines.push(`${kind} removed: ${who(old)} (slot ${s.index + 1})`);
      continue;
    }
    if (!s.exists || !old) continue;
    const parts: string[] = [];
    if (old.level !== s.level) parts.push(`Lv ${old.level}→${s.level}`);
    if (old.xp !== s.xp) parts.push(`EXP ${n(old.xp)}→${n(s.xp)}`);
    if (old.name !== s.name) parts.push(`name “${old.name}”→“${s.name}”`);
    if (parts.length) lines.push(`${who(s)}: ${parts.join(", ")}`);
  }
  return lines;
}

export function summarizeEdits(original: Uint8Array, edited: ParsedSave): string[] {
  let before: ParsedSave;
  try {
    before = parseSave(original.slice());
  } catch {
    return [];
  }
  const lines: string[] = [];

  const p0 = readPlayer(before);
  const p1 = readPlayer(edited);
  if (p0.money !== p1.money) lines.push(`Money: ${n(p0.money)} → ${n(p1.money)}`);
  p1.crank.forEach((v, i) => {
    if (v !== p0.crank[i]) lines.push(`${CRANK_LABELS[i]}: ${p0.crank[i]} → ${v}`);
  });
  p1.names.forEach((name, i) => {
    if (name !== p0.names[i])
      lines.push(`${PROTAGONISTS[i] ?? `Name ${i + 1}`}’s name: “${p0.names[i]}” → “${name}”`);
  });

  lines.push(...diffSlots("Character", readParty(before), readParty(edited)));
  lines.push(...diffSlots("Yo-kai", readYoKaiSlots(before), readYoKaiSlots(edited)));

  lines.push(
    ...diffInventory(
      "Food/Items",
      readInventory(before, INVENTORIES.bag),
      readInventory(edited, INVENTORIES.bag),
    ),
    ...diffInventory(
      "Equipment",
      readInventory(before, INVENTORIES.equipment),
      readInventory(edited, INVENTORIES.equipment),
    ),
    ...diffInventory(
      "Soul bag",
      readInventory(before, INVENTORIES.souls),
      readInventory(edited, INVENTORIES.souls),
    ),
  );

  const s0 = new Map(readYoKaiSouls(before).map((s) => [s.paramId, s]));
  const soulLines: string[] = [];
  for (const s of readYoKaiSouls(edited)) {
    const old = s0.get(s.paramId);
    if (!old) {
      soulLines.push(`${s.name} (new)`);
    } else if (old.white !== s.white || old.red !== s.red || old.gold !== s.gold) {
      soulLines.push(`${s.name} ${old.white}/${old.red}/${old.gold}→${s.white}/${s.red}/${s.gold}`);
    }
  }
  if (soulLines.length) lines.push(`Yo-kai souls (white/red/gold): ${nameList(soulLines)}`);

  return lines;
}
