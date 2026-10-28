/** Player tab: one card per protagonist (name, level, EXP), then the wallet
 *  and crank-a-kai counters. A character the player has not met yet stays
 *  read-only: writing to their slot would plant a character the save never
 *  had, and their name is asked for in-game on recruitment. */
import { useState } from "react";
import { InputGroupInput, InputGroupRoot, Tooltip } from "@heroui/react";
import {
  CRANK_MAX,
  readMoneySpent,
  readPlayer,
  writeCrank,
  writeMoney,
  writeName,
} from "./lib/editor";
import { readParty, writeSlot } from "./lib/party";
import { expToNext, LEVEL_CAP } from "./lib/exp-curve";
import type { ParsedSave } from "./lib/save-format";
import { ExpStepper, NameField, PLAYER_ACCENTS, Portrait, RollStepper, Tile } from "./ui";
import { ClockIcon } from "./icons";

const NAME_LABELS = ["Nate", "Katie", "Summer", "Touma", "Akinori", "Shin"];

/** Full canon names shown above each editable given-name field. */
const REAL_NAMES = [
  "Nate Adams",
  "Katie Forester",
  "Summer Adams",
  "Touma Tsukinami",
  "Akinori Arihoshi",
  "Shin Shimomachi",
];

/** Name order above (Nate, Katie, Summer, Touma, Akinori, Shin) to the save's
 *  party slots, which are stored in join order with Katie's slot fifth. */
const PARTY_SLOT_FOR_NAME = [0, 4, 1, 2, 3, 5];

const U32_MAX = 0xffffffff;

function playtime(seconds: number): string {
  return `${Math.floor(seconds / 3600)}h${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`;
}

/** A div, not a <label>: clicking a label's text would press a stepper's
 *  first button (−) as its labelled control. */
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

/** A labelled field inside a protagonist card; the fixed label column keeps
 *  the name, level and EXP inputs aligned with each other. */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="w-9 shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function PlayerPanel({ parsed }: { parsed: ParsedSave }) {
  const [info, setInfo] = useState(() => readPlayer(parsed));
  const [moneySpent] = useState(() => readMoneySpent(parsed));
  const [party, setParty] = useState(() => readParty(parsed));
  /** Who already had a name when the save loaded. Decided once: clearing a
   *  name field must not make the character look unmet and lock the box. */
  const [namedAtLoad] = useState(() => readPlayer(parsed).names.map((n) => n !== ""));
  const bump = () => setInfo(readPlayer(parsed));

  const acquired = (i: number) => {
    const slot = party[PARTY_SLOT_FOR_NAME[i]];
    return !!slot && slot.exists && slot.speciesId !== 0;
  };
  /** Not recruited and never named: nothing here may be written. A name the
   *  game already set (Katie, Shin from chapter 3) stays editable, even if
   *  the player empties the field. */
  const notMetYet = (i: number) => !namedAtLoad[i] && !acquired(i);

  // EXP is clamped to the current level's requirement on every write (and
  // when the level drops), and zeroed at the cap, so the save can never hold
  // progress the game wouldn't allow.
  const commitSlot = (i: number, patch: Parameters<typeof writeSlot>[3]) => {
    const index = PARTY_SLOT_FOR_NAME[i];
    const slot = party[index];
    if (!slot || !acquired(i)) return;
    if ((patch.level ?? slot.level) >= LEVEL_CAP) {
      patch = { ...patch, xp: 0 };
    } else {
      const cap = expToNext(patch.level ?? slot.level);
      if (patch.xp !== undefined) patch = { ...patch, xp: Math.min(patch.xp, cap) };
      else if (slot.xp > cap) patch = { ...patch, xp: cap };
    }
    writeSlot(parsed, "party", index, patch);
    setParty(readParty(parsed));
  };

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <Tile
          title="Protagonists"
          className="col-span-full"
          aside={
            <>
              <ClockIcon size={13} />
              Played {playtime(info.playTimeSeconds)}
            </>
          }
        >
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @4xl:grid-cols-3">
            {info.names.map((name, i) => {
              const slot = party[PARTY_SLOT_FOR_NAME[i]];
              const here = acquired(i);
              const locked = notMetYet(i);
              const accent = PLAYER_ACCENTS[NAME_LABELS[i]] ?? "#3e63dd";
              return (
                <div
                  key={i}
                  className={`flex min-w-0 items-stretch gap-3 rounded-xl border bg-surface-secondary/50 p-3 ${
                    here ? "border-border" : "border-dashed border-border"
                  }`}
                >
                  <Tooltip delay={300}>
                    <Tooltip.Trigger
                      className={`flex self-stretch ${here ? "" : "opacity-50 grayscale"}`}
                    >
                      <Portrait name={NAME_LABELS[i] ?? ""} fill />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {REAL_NAMES[i]}
                      {here ? "" : " (not in your party yet)"}
                    </Tooltip.Content>
                  </Tooltip>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <FieldRow label="Name">
                      <NameField
                        label={`${NAME_LABELS[i]} given name`}
                        value={name}
                        maxBytes={36}
                        disabled={locked}
                        placeholder={REAL_NAMES[i]}
                        onCommit={(v) => {
                          if (locked) return;
                          writeName(parsed, i, v);
                          bump();
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Lv">
                      <RollStepper
                        className="min-w-0 flex-1"
                        value={here && slot ? slot.level : 0}
                        step={1}
                        max={LEVEL_CAP}
                        disabled={!here}
                        ariaLabel={`${NAME_LABELS[i]} level`}
                        onCommit={(v) => commitSlot(i, { level: v })}
                      />
                    </FieldRow>
                    <FieldRow label="EXP">
                      <div className="min-w-0 flex-1">
                        <ExpStepper
                          xp={here && slot ? slot.xp : 0}
                          toNext={here && slot ? expToNext(Math.min(slot.level, LEVEL_CAP - 1)) : 1}
                          maxed={here && !!slot && slot.level >= LEVEL_CAP}
                          disabled={!here}
                          accent={accent}
                          onCommit={(v) => commitSlot(i, { xp: v })}
                        />
                      </div>
                    </FieldRow>
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>

        <Tile title="Wallet" icon="Y Coin">
          <RollStepper
            value={info.money}
            step={1}
            max={U32_MAX}
            ariaLabel="Money"
            onCommit={(v) => {
              writeMoney(parsed, v);
              bump();
            }}
          />
          <Labeled label="Spent">
            <InputGroupRoot className="min-w-0 flex-1 opacity-70">
              <InputGroupInput
                aria-label="Money spent (read-only)"
                disabled
                tabIndex={-1}
                type="text"
                className="w-0 min-w-0 flex-1 select-none text-right font-mono"
                value={moneySpent.toLocaleString()}
              />
            </InputGroupRoot>
          </Labeled>
        </Tile>

        <Tile title="Crank-a-kai" icon="Crank-a-Coin">
          <Labeled label="Daily left">
            <RollStepper
              className="min-w-0 flex-1"
              value={info.crank[0]}
              step={1}
              max={info.crank[1]}
              ariaLabel="Daily crank attempts"
              onCommit={(v) => {
                writeCrank(parsed, 0, v);
                bump();
              }}
            />
          </Labeled>
          <Labeled label="Max pulls">
            <RollStepper
              className="min-w-0 flex-1"
              value={info.crank[1]}
              step={1}
              max={CRANK_MAX}
              ariaLabel="Max pulls per day"
              onCommit={(v) => {
                writeCrank(parsed, 1, v);
                // Daily attempts can never exceed the daily cap.
                if (info.crank[0] > v) writeCrank(parsed, 0, v);
                bump();
              }}
            />
          </Labeled>
        </Tile>
      </div>
    </div>
  );
}
