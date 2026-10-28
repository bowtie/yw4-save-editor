/** Yo-kai tab: your yo-kai (400 slots, ID2 != 0) with an Add yo-kai button
 *  that opens the game's full Ukiukipedia roster (180 yo-kai + 16 boss +
 *  17 special, both forms each).  Picking one claims the first free slot.
 */

import { useEffect, useRef, useState } from "react";
import { Button, Input, ScrollShadow, toast } from "@heroui/react";
import { clearYoKaiSlot, readYoKaiSlots, writeSlot, type PartySlot } from "./lib/party";
import { yokaiNameFor } from "./lib/yokai";
import { nameForParam } from "./lib/characters";
import { PLAYABLE_YOKAI, type PlayableYokai } from "./lib/yokai-playable";
import { yokaiExpRate } from "./lib/yokai-curve";
import { yokaiTribe } from "./lib/yokai-base";
import { modelParamId, tribeInfo } from "./lib/tribes";
import { EXP_RATES, LEVEL_CAP, expToNext } from "./lib/exp-curve";
import { YOKAI_MOVES } from "./lib/yokai-moves";
import type { ParsedSave } from "./lib/save-format";
import { ExpStepper, GameIcon, LabeledHint, NameField, RollStepper, removeWithUndo } from "./ui";
import { PlusIcon, SearchIcon, TrashIcon } from "./icons";

export function YokaiPanel({ parsed }: { parsed: ParsedSave }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [, force] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected !== null)
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  const rerender = () => force((v) => v + 1);

  const allSlots = readYoKaiSlots(parsed);
  const owned = allSlots.filter((s) => s.exists);
  const slot: PartySlot | undefined =
    selected !== null ? allSlots.find((s) => s.index === selected && s.exists) : undefined;

  const rosterById = new Map(PLAYABLE_YOKAI.map((y) => [y.id, y]));
  const movesById = new Map(YOKAI_MOVES);
  /** Individuals per species already in the roster; the game stores
   *  individuals (party sets reference handles), so duplicates are legal,
   *  but they deserve a badge and a warning so copies are deliberate. */
  const ownedCount = new Map<number, number>();
  for (const s of owned) ownedCount.set(s.speciesId, (ownedCount.get(s.speciesId) ?? 0) + 1);

  /** Display name: roster name first, official ParamID name, wiki fallback. */
  const speciesFor = (s: PartySlot): string =>
    rosterById.get(s.speciesId)?.name ??
    nameForParam(s.speciesId) ??
    yokaiNameFor(s.speciesId) ??
    `Unknown 0x${s.speciesId.toString(16).toUpperCase()}`;

  const species = slot ? speciesFor(slot) : null;
  const iconFor = (s: PartySlot): string => rosterById.get(s.speciesId)?.icon ?? "";
  /** Tribe tints the EXP bar the color of its emblem. The tribe table keys
   *  on crc32 of the model name, not the slot's species signature. */
  const tribe =
    slot && iconFor(slot) ? tribeInfo(yokaiTribe(modelParamId(iconFor(slot)))) : undefined;
  /** This species' growth rate (per-species ExperienceCurve class). */
  const expRate = slot ? yokaiExpRate(slot.speciesId, EXP_RATES) : EXP_RATES[0];

  /** The add picker offers only the 180 collectible yo-kai — boss and
   *  special dictionary entries are battle-only (no learnsets, not
   *  befriendable), so they are not addable. */
  const playable = PLAYABLE_YOKAI.filter(
    (y) => y.section === "yokai" && y.name.toLowerCase().includes(search.toLowerCase()),
  );
  const matching = owned.filter((s) => speciesFor(s).toLowerCase().includes(search.toLowerCase()));

  const claimFirstFree = (): number | null => {
    const free = allSlots.find((s) => !s.exists);
    return free ? free.index : null;
  };

  const addYoKai = (y: PlayableYokai) => {
    const index = claimFirstFree();
    if (index === null) {
      toast.warning("All 400 yo-kai slots are full", {
        description: "Remove a yo-kai first, or edit an existing one.",
      });
      return;
    }
    const copies = ownedCount.get(y.id) ?? 0;
    if (copies > 0) {
      toast.warning(`${y.name} is already in your roster (×${copies})`, {
        description:
          "A second one was added anyway, since the game allows duplicates. Remove one if this was an accident.",
      });
    }
    // Prefill the move slots from the form's learnset (skipping the passive
    // first slot — the game equips only active moves and manages them by
    // level afterwards).
    const moves = (movesById.get(y.id) ?? []).slice(1, 7);
    writeSlot(parsed, "yokai", index, { speciesId: y.id, level: 1, skills: moves });
    // Stay in the roster picker so several yo-kai can be added in a row.
    rerender();
    if (copies === 0) {
      toast.success(`Added ${y.name} (slot ${index + 1}).`, {
        description: "Press Back to edit it, or keep adding.",
      });
    }
  };

  const removeYoKai = (s: PartySlot) => {
    const name = speciesFor(s);
    removeWithUndo(
      parsed,
      `Removed ${name} from slot ${s.index + 1}.`,
      () => clearYoKaiSlot(parsed, s.index),
      rerender,
    );
    setSelected(null);
  };

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Your yo-kai · {owned.length}
            </p>
            {adding ? (
              <Button
                className="ml-auto"
                size="sm"
                variant="outline"
                onPress={() => {
                  setAdding(false);
                  // The roster search must not leak into the owned-list
                  // filter (one shared field serves both modes).
                  setSearch("");
                }}
              >
                Back
              </Button>
            ) : (
              <Button
                className="ml-auto"
                size="sm"
                variant="primary"
                onPress={() => {
                  setAdding(true);
                  setSearch("");
                  setSelected(null);
                }}
              >
                <PlusIcon size={14} /> Add yo-kai
              </Button>
            )}
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
            <Input
              aria-label={adding ? "Search the yo-kai roster" : "Search your yo-kai"}
              placeholder={adding ? "Search the roster…" : "Search your yo-kai…"}
              className="w-full ps-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollShadow className="max-h-[50dvh] rounded sm:max-h-96-xl border border-border bg-surface-secondary/50 p-2">
            <div className="flex flex-col gap-0.5">
              {adding
                ? playable.map((y) => {
                    const copies = ownedCount.get(y.id) ?? 0;
                    return (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => addYoKai(y)}
                        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-hover"
                      >
                        <GameIcon
                          folder="Yokai"
                          name={y.icon}
                          className="size-8 shrink-0 rounded-lg bg-surface-secondary object-contain p-0.5"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{y.name}</span>
                        {copies > 0 ? (
                          <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
                            Owned ×{copies}
                          </span>
                        ) : null}
                        <span className="shrink-0 font-mono text-xs text-muted">No.{y.no}</span>
                      </button>
                    );
                  })
                : matching.map((s) => (
                    <button
                      key={s.index}
                      type="button"
                      onClick={() => setSelected(s.index)}
                      aria-pressed={selected === s.index}
                      className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors ${
                        selected === s.index ? "bg-accent-soft" : "hover:bg-surface-hover"
                      }`}
                    >
                      <GameIcon
                        folder="Yokai"
                        name={iconFor(s)}
                        className="size-8 shrink-0 rounded-lg bg-surface-secondary object-contain p-0.5"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{speciesFor(s)}</span>
                      <span className="shrink-0 font-mono text-xs text-muted">Lv {s.level}</span>
                    </button>
                  ))}
              {adding && playable.length === 0 && (
                <p className="p-2 text-center text-xs text-muted">No yo-kai match.</p>
              )}
              {!adding && owned.length === 0 && (
                <p className="p-2 text-center text-xs text-muted">
                  No yo-kai yet. Press Add yo-kai.
                </p>
              )}
            </div>
          </ScrollShadow>
        </div>

        <div
          ref={detailRef}
          className={`flex flex-col gap-3 rounded-xl border border-border bg-surface-secondary/50 p-3 ${!slot ? "hidden @md:flex" : ""}`}
        >
          {!slot && (
            <p className="p-4 text-center text-sm text-muted">
              Select a yo-kai to edit it, or press Add yo-kai.
            </p>
          )}

          {slot && (
            <>
              <div className="flex items-center gap-3">
                <GameIcon
                  folder="Yokai"
                  name={iconFor(slot)}
                  className="size-14 shrink-0 rounded-xl bg-surface-secondary object-contain p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{species}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    {tribe && (
                      <GameIcon
                        folder="Tribes"
                        name={tribe.emblem}
                        alt={`${tribe.name} tribe`}
                        className="size-4 shrink-0 object-contain"
                      />
                    )}
                    {tribe ? `${tribe.name} · ` : ""}Slot {slot.index + 1}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  className="shrink-0 text-danger"
                  aria-label={`Remove ${species}`}
                  onPress={() => removeYoKai(slot)}
                >
                  <TrashIcon size={15} />
                </Button>
              </div>

              <LabeledHint label="Given name">
                <NameField
                  label="Given name"
                  value={slot.name}
                  maxBytes={24}
                  onCommit={(v) => patch({ name: v })}
                />
              </LabeledHint>

              {/* A div, not a <label>: clicking a label's text would press the
                    stepper's first button (−) as its labelled control. */}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="w-9 whitespace-nowrap">Level</span>
                <RollStepper
                  className="min-w-0 flex-1"
                  value={slot.level}
                  step={1}
                  min={1}
                  max={LEVEL_CAP}
                  ariaLabel="Level"
                  onCommit={(v) => patch({ level: v })}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="w-9 whitespace-nowrap">EXP</span>
                <div className="min-w-0 flex-1">
                  <ExpStepper
                    xp={slot.xp}
                    toNext={expToNext(Math.min(slot.level, LEVEL_CAP - 1), expRate)}
                    maxed={slot.level >= LEVEL_CAP}
                    accent={tribe?.color}
                    onCommit={(v) => patch({ xp: v })}
                  />
                </div>
              </div>

              <p className="text-xs text-muted">
                {slot.level >= LEVEL_CAP ? (
                  <>Max level reached. The game stores EXP as 0 from here on.</>
                ) : (
                  <>
                    EXP is progress within the level: {slot.xp.toLocaleString("en-US")} /{" "}
                    {expToNext(slot.level, expRate).toLocaleString("en-US")} on this species' curve.
                  </>
                )}
              </p>

              <p className="text-xs text-muted">
                Moves are learned and equipped automatically as a yo-kai levels up. HP, Yo-kai
                points, the power gauge and the "+" bonuses all come from level and equipment, and
                the game manages those, so here you edit the name, level and EXP.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function patch(p: Parameters<typeof writeSlot>[3]) {
    if (!slot) return;
    // Same guarantees as the Characters tab: at the level cap the game stops
    // tracking EXP (stored as 0); below it, EXP never exceeds the species'
    // current-level requirement, including when the level drops.
    if ((p.level ?? slot.level) >= LEVEL_CAP) {
      p = { ...p, xp: 0 };
    } else {
      const cap = expToNext(p.level ?? slot.level, expRate);
      if (p.xp !== undefined) p = { ...p, xp: Math.min(p.xp, cap) };
      else if (slot.xp > cap) p = { ...p, xp: cap };
    }
    writeSlot(parsed, "yokai", slot.index, p);
    rerender();
  }
}
