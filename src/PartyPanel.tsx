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
import { LockIcon } from "./icons";

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

  return (
    <Card
      className={acquired ? "overflow-hidden" : "overflow-hidden border-dashed"}
      style={{ border: "1px solid rgb(255 255 255 / 0.06)" }}
    >
      <CardContent className="flex flex-col gap-2.5 p-3 @container">
        <div className="flex items-center gap-3">
          <Portrait name={spriteName} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{displayName}</p>
            </div>
            {acquired ? (
              <RollStepper
                value={slot.level}
                step={1}
                max={LEVEL_CAP}
                ariaLabel="Level"
                onCommit={(v) => onCommit(slot.index, { level: v })}
              />
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted">
                <LockIcon size={13} />
                Not acquired yet.
              </p>
            )}
          </div>
        </div>
        {acquired && (
          <ExpStepper
            xp={slot.xp}
            toNext={expToNext(Math.min(slot.level, LEVEL_CAP - 1))}
            maxed={slot.level >= LEVEL_CAP}
            accent={accent}
            onCommit={(v) => onCommit(slot.index, { xp: v })}
          />
        )}
        {!acquired && (
          <p className="text-[11px] leading-tight text-muted opacity-80">
            This slot fills in when the character joins your party in-game. The editor never writes
            to it.
          </p>
        )}
      </CardContent>
    </Card>
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
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
        {DISPLAY_ORDER.map((i) => slots[i]).map((slot) => (
          <CharacterTile key={slot.index} slot={slot} onCommit={commit} />
        ))}
      </div>
    </div>
  );
}
