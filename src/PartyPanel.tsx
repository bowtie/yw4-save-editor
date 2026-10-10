/** Characters tab: all six main-character slots as tiles in a responsive
 *  grid — a chunky accent-tinted portrait plus level and EXP rolling-slot
 *  steppers. Slots the player has not unlocked in-game are read-only:
 *  writing to them would plant a character the save never had. */

import { useState } from "react";
import { Card, CardContent } from "@heroui/react";
import { readParty, writeSlot, type PartySlot } from "./lib/party";
import type { ParsedSave } from "./lib/save-format";
import { ExpStepper, Portrait, PLAYER_ACCENTS, RollStepper } from "./ui";
import { nameForParam } from "./lib/characters";
import { expToNext, LEVEL_CAP } from "./lib/exp-curve";

const SPRITE_NAMES = ["Nate", "Summer", "Touma", "Akinori", "Katie", "Shin"];

/** The game's name table only says "Shin" — his full name is Shin
 *  Shimomachi (EN localization of the character: Jack Cobbler). */
const FULL_NAMES: Record<string, string> = {
  Shin: "Shin Shimomachi",
};

function CharacterTile({
  slot,
  onCommit,
}: {
  slot: PartySlot;
  onCommit: (index: number, patch: Parameters<typeof writeSlot>[3]) => void;
}) {
  const acquired = slot.exists && slot.speciesId !== 0;
  const gameName = nameForParam(slot.speciesId)?.replace(/\s*\([^)]*\)\s*$/, "");
  const spriteName = SPRITE_NAMES[slot.index] ?? "";
  const resolvedName = slot.name || gameName || spriteName;
  const displayName = FULL_NAMES[resolvedName] || resolvedName || `Character ${slot.index + 1}`;
  const accent = PLAYER_ACCENTS[spriteName] ?? "#3e63dd";

  // Same bordered box as the Player tab's name rows; unacquired slots get a
  // dashed border, a greyed portrait and no inputs.
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-xl border bg-surface-secondary/50 p-1.5 pr-2.5 ${
        acquired ? "border-border" : "border-dashed border-border"
      }`}
    >
      <div className={acquired ? "self-center" : "self-center opacity-50 grayscale"}>
        <Portrait name={spriteName} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm font-semibold">{displayName}</p>
        {acquired ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="w-7 shrink-0">Lv</span>
              <RollStepper
                className="min-w-0 flex-1"
                value={slot.level}
                step={1}
                max={LEVEL_CAP}
                ariaLabel="Level"
                onCommit={(v) => onCommit(slot.index, { level: v })}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="w-7 shrink-0">EXP</span>
              <div className="min-w-0 flex-1">
                <ExpStepper
                  xp={slot.xp}
                  toNext={expToNext(Math.min(slot.level, LEVEL_CAP - 1))}
                  maxed={slot.level >= LEVEL_CAP}
                  accent={accent}
                  onCommit={(v) => onCommit(slot.index, { xp: v })}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">Not in your party yet</p>
        )}
      </div>
    </div>
  );
}

/** Grid order matches the Player page's protagonist rows (Nate, Katie,
 *  Summer, Touma, Akinori, Shin); the save's party slots themselves are
 *  stored in join order, with Katie's slot fifth. */
const DISPLAY_ORDER = [0, 4, 1, 2, 3, 5];

export function PartyPanel({ parsed }: { parsed: ParsedSave }) {
  const [slots, setSlots] = useState(() => readParty(parsed));

  // Unacquired slots (ID2 == 0) must never be written: the game would load a
  // character the player never recruited. The tiles hide their inputs, but
  // the commit path refuses them too. EXP is clamped to the current level's
  // requirement on every write (and when the level drops), so the save can
  // never hold progress the game wouldn't allow.
  const commit = (index: number, patch: Parameters<typeof writeSlot>[3]) => {
    const slot = slots.find((s) => s.index === index);
    if (!slot || !slot.exists || slot.speciesId === 0) return;
    // At the level cap the game stops tracking EXP (LVMAX), so the slot's
    // xp is zeroed; below it, xp is clamped to the current level's
    // requirement so the save can never hold progress the game wouldn't allow.
    if ((patch.level ?? slot.level) >= LEVEL_CAP) {
      patch = { ...patch, xp: 0 };
    } else {
      const cap = expToNext(patch.level ?? slot.level);
      if (patch.xp !== undefined) patch = { ...patch, xp: Math.min(patch.xp, cap) };
      else if (slot.xp > cap) patch = { ...patch, xp: cap };
    }
    writeSlot(parsed, "party", index, patch);
    setSlots(readParty(parsed));
  };

  return (
    <div className="@container">
      <Card>
        <CardContent className="flex flex-col gap-2.5 p-3.5 @container">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Main characters
          </p>
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
            {DISPLAY_ORDER.map((i) => slots[i]).map((slot) => (
              <CharacterTile key={slot.index} slot={slot} onCommit={commit} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
