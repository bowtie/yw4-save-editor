/** Souls tab: the soul bag inventory on the left, the per-yo-kai
 *  white / red / gold soul counters on the right. The per-yo-kai list
 *  shows every matchable species; ones the save has no ledger row for
 *  sit faded with a + that creates the row. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Input, ScrollShadow, toast } from "@heroui/react";
import {
  addYoKaiSoulRow,
  clearSlot,
  giveItem,
  INVENTORIES,
  readInventory,
  readYoKaiSouls,
  setQuantity,
  setYoKaiSoul,
  type Slot,
  type YokaiSoulSlot,
} from "./lib/editor";
import { ITEMS, itemByCrc } from "./lib/item-data";
import { ITEM_GROUPS } from "./lib/item-order";
import { SOULS_CATALOG } from "./lib/souls-catalog";
import { nameForParam } from "./lib/characters";
import { eraBaseName, eraDisplayName, eraNameCounts } from "./lib/era-names";
import {
  KONKATSU_LIST,
  konkatsuSpeciesParamId,
  konkatsuTradeMoney,
  type KonkatsuEntry,
} from "./lib/konkatsu-list";
import { konkatsuCandidatesBySpecies, type KonkatsuCandidate } from "./lib/konkatsu-candidates";
import { STAT_KEYS, STAT_LABELS, yokaiStatsAtLevel } from "./lib/yokai-stats";
import { tribeInfo } from "./lib/tribes";
import type { ParsedSave } from "./lib/save-format";
import { GameIcon, RarityStars, RollStepper, removeWithUndo, SubTabs, Tile, ItemIcon } from "./ui";
import { SOUL_ART } from "./lib/soul-art";
import { yokaiRank, yokaiTribe } from "./lib/yokai-base";
import { PlusIcon, SearchIcon, TrashIcon } from "./icons";

const def = INVENTORIES.souls;

/** Keepsake items named by the summon list, looked up in the item catalog so
 *  they can show the same icon the inventory uses. */
const normName = (name: string) => name.replace(/[’‘]/g, "'").toLowerCase();
const ITEM_BY_NAME = new Map(ITEMS.map((item) => [normName(item[1]), item]));

/** Soul item -> art path ("Tribes/<emblem>" for general souls, ark chara id
 *  for yo-kai tier souls). */
const artByCrc = new Map(SOUL_ART);
/** General (sol*) souls: tribe emblems and family orbs, no game rarity. */
const GENERAL_SOULS = new Set(SOULS_CATALOG.filter((s) => s.general).map((s) => s.signature >>> 0));

const TIERS = [
  { which: "white", dot: "bg-foreground" },
  { which: "red", dot: "bg-danger" },
  { which: "gold", dot: "bg-warning" },
] as const;

/** chara_base battle-row rank enum: 1 E .. 6 S. */
const RANK_LETTERS = ["", "E", "D", "C", "B", "A", "S"] as const;

const TIER_LABELS = { white: "White", red: "Red", gold: "Gold" } as const;

function rawSummonName(entry: KonkatsuEntry): string {
  const paramId = konkatsuSpeciesParamId(entry.paramId);
  return (paramId === undefined ? null : nameForParam(paramId)) ?? entry.name;
}

const NAME_COUNTS = eraNameCounts(KONKATSU_LIST.map(rawSummonName));

/** Display name: plain, with the era added only where another entry shares the name. */
function summonName(entry: KonkatsuEntry): string {
  const raw = rawSummonName(entry);
  return eraDisplayName(raw, (NAME_COUNTS.get(eraBaseName(raw)) ?? 0) > 1);
}

/** The current board's rolled individuals as one compact grid: level and
 *  price on the left, the six base stats across with the candidate's own
 *  growth roll beneath each. Labels are shown once, in the header row. */
/** Text color for a growth roll, by zone: low, mid, high. */
function rollZone(roll: number): string {
  if (roll >= 14) return "text-warning";
  if (roll >= 8) return "text-success";
  return "text-muted";
}

const CANDIDATE_COLS = "grid grid-cols-[4.75rem_repeat(6,minmax(0,1fr))] items-center gap-x-1";

function CandidateList({
  entry,
  candidates,
}: {
  entry: KonkatsuEntry;
  candidates: KonkatsuCandidate[];
}) {
  return (
    <div className="text-xs tabular-nums">
      <div className={`${CANDIDATE_COLS} border-b border-border pb-1 text-[10px] text-muted`}>
        <span />
        {STAT_KEYS.map((key) => (
          <span key={key} className="text-center font-semibold uppercase tracking-wider">
            {STAT_LABELS[key]}
          </span>
        ))}
      </div>
      {candidates.map((candidate) => {
        const stats = yokaiStatsAtLevel(candidate.paramId, candidate.level);
        return (
          <div
            key={candidate.slot}
            className={`${CANDIDATE_COLS} border-b border-border/40 py-1 last:border-0`}
          >
            <div className="flex flex-col leading-tight">
              <span className="flex items-baseline gap-1">
                <span className="text-sm font-semibold">Lv {candidate.level}</span>
                {candidate.isRare && (
                  <span className="text-[9px] font-semibold uppercase text-warning">Rare</span>
                )}
              </span>
              <span className="flex items-center gap-0.5 text-muted">
                <GameIcon folder="Items" name="Y Coin" className="size-3 shrink-0 object-contain" />
                {konkatsuTradeMoney(entry, candidate.level, candidate.isRare).toLocaleString(
                  "en-US",
                )}
              </span>
            </div>
            {STAT_KEYS.map((key, i) => {
              const roll = candidate.growth[i] ?? 0;
              return (
                <span key={key} className="flex flex-col items-center leading-tight">
                  <span className="font-semibold">{stats ? stats[key] + roll : "–"}</span>
                  <span className={`text-[11px] font-bold ${rollZone(roll)}`}>
                    {roll > 0 ? `+${roll}` : " "}
                  </span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Yo-kai souls: a searchable list on the left (icon, name, current
 *  white/red/gold counts at a glance) and the selected yo-kai's details on
 *  the right, the same list + detail layout as the Yo-kai tab. Species the
 *  save has no ledger row for sit faded; their detail offers Start. */
function LedgerView({
  parsed,
  soulsByParam,
  candidatesBySpecies,
  onEdited,
  lead,
}: {
  parsed: ParsedSave;
  soulsByParam: Map<number, YokaiSoulSlot>;
  candidatesBySpecies: Map<number, KonkatsuCandidate[]>;
  onEdited: () => void;
  lead: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [startedOnly, setStartedOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    () =>
      (KONKATSU_LIST.find((m) => soulsByParam.has(m.paramId)) ?? KONKATSU_LIST[0])?.model ?? null,
  );
  const detailRef = useRef<HTMLDivElement>(null);
  // Single-column layouts stack the detail under the list: bring it into view.
  const mounted = useRef(false);
  useEffect(() => {
    // Skip the initial default selection: only follow the user's own picks.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (selected) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  const shown = KONKATSU_LIST.filter(
    (m) =>
      summonName(m).toLowerCase().includes(search.toLowerCase()) &&
      (!startedOnly || soulsByParam.has(m.paramId)),
  );
  const match = KONKATSU_LIST.find((m) => m.model === selected);
  const displayName = match ? summonName(match) : "";
  const soul = match ? soulsByParam.get(match.paramId) : undefined;
  const tribe = match ? tribeInfo(yokaiTribe(match.paramId)) : undefined;
  const rank = match ? yokaiRank(match.paramId) : undefined;
  const keepsake = match?.item ? ITEM_BY_NAME.get(normName(match.item)) : undefined;
  const speciesParamId = match ? konkatsuSpeciesParamId(match.paramId) : undefined;
  const candidates =
    speciesParamId === undefined ? [] : (candidatesBySpecies.get(speciesParamId) ?? []);

  return (
    <div className="@container flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {lead}
        <Button
          variant={startedOnly ? "primary" : "secondary"}
          aria-pressed={startedOnly}
          onPress={() => setStartedOnly((v) => !v)}
        >
          Started only
        </Button>
      </div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
        <Input
          aria-label="Search yo-kai souls"
          placeholder="Search yo-kai…"
          className="h-9 w-full ps-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 pt-1 @md:grid-cols-2 @md:grid-rows-[minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-2 @md:relative @md:min-h-[26rem]">
          <ScrollShadow className="min-h-0 flex-1 max-h-[50dvh] pr-1 @md:absolute @md:inset-0 @md:max-h-none">
            <div className="flex flex-col gap-0.5">
              {shown.map((m) => {
                const row = soulsByParam.get(m.paramId);
                return (
                  <button
                    key={m.model}
                    type="button"
                    onClick={() => setSelected(m.model)}
                    aria-pressed={selected === m.model}
                    className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors ${
                      selected === m.model ? "bg-accent-soft" : "hover:bg-surface-hover"
                    }`}
                  >
                    <GameIcon
                      folder="Yokai"
                      name={m.model}
                      className={`size-8 shrink-0 rounded-lg bg-surface-secondary object-contain p-0.5 ${
                        row ? "" : "opacity-50"
                      }`}
                    />
                    <span className={`min-w-0 flex-1 truncate text-sm ${row ? "" : "text-muted"}`}>
                      {summonName(m)}
                    </span>
                    {row ? (
                      <span className="hidden shrink-0 items-center gap-2 font-mono text-xs text-muted @md:flex">
                        {TIERS.map(({ which, dot }) => (
                          <span
                            key={which}
                            className="flex items-center gap-1 tabular-nums"
                            title={`${TIER_LABELS[which]} souls`}
                            aria-label={`${row[which]} ${which} souls`}
                          >
                            <span className={`size-1.5 rounded-full ${dot}`} />
                            {row[which].toLocaleString("en-US")}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {shown.length === 0 && (
                <p className="p-2 text-center text-xs text-muted">No yo-kai match.</p>
              )}
            </div>
          </ScrollShadow>
        </div>

        <div
          ref={detailRef}
          className={`flex flex-col gap-5 @md:border-l @md:border-border @md:pl-6 @md:overflow-y-auto ${
            candidates.length > 0 ? "@md:justify-start" : "@md:justify-center"
          } ${!match ? "hidden @md:flex" : ""}`}
        >
          {!match && (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center">
              <p className="text-sm font-medium">
                {soulsByParam.size} of {KONKATSU_LIST.length} yo-kai started
              </p>
              <p className="text-xs text-muted">
                Pick a yo-kai on the left to edit its white, red and gold souls.
              </p>
            </div>
          )}
          {match && (
            <>
              <div className="flex items-center gap-3">
                <GameIcon
                  folder="Yokai"
                  name={match.model}
                  className="size-14 shrink-0 rounded-xl bg-surface-secondary object-contain p-0.5"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{displayName}</p>
                  <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                    {tribe && (
                      <GameIcon
                        folder="Tribes"
                        name={tribe.emblem}
                        alt=""
                        className="size-5 shrink-0 object-contain"
                      />
                    )}
                    {tribe?.name}
                    {rank !== undefined && (
                      <>
                        <GameIcon
                          folder="Tribes"
                          name={`rank_${RANK_LETTERS[rank]}`}
                          alt=""
                          className="ml-1 size-5 shrink-0 object-contain"
                        />
                        Rank {RANK_LETTERS[rank]}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {soul ? (
                <div className="flex flex-col gap-3">
                  {TIERS.map(({ which, dot }) => (
                    <div key={which} className="flex items-center gap-2 text-xs text-muted">
                      <span className="flex w-12 shrink-0 items-center gap-1.5">
                        <span className={`size-2 rounded-full ${dot}`} />
                        {TIER_LABELS[which]}
                      </span>
                      <RollStepper
                        className="min-w-0 flex-1"
                        value={soul[which]}
                        step={1}
                        max={0xffff}
                        ariaLabel={`${displayName} ${which} souls`}
                        onCommit={(v) => {
                          setYoKaiSoul(parsed, soul.index, which, v);
                          onEdited();
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-xs text-muted">
                    This save has no souls for {displayName} yet.
                  </p>
                  <Button
                    variant="primary"
                    onPress={() => {
                      try {
                        addYoKaiSoulRow(parsed, match.paramId, { white: 1, red: 0, gold: 0 });
                        onEdited();
                      } catch (err) {
                        toast.warning(String((err as Error).message ?? err));
                      }
                    }}
                  >
                    <PlusIcon size={15} /> Start {displayName} souls
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Soul summon candidates
                </span>
                {candidates.length > 0 ? (
                  <CandidateList entry={match} candidates={candidates} />
                ) : (
                  <p className="text-xs text-muted">No current board candidates.</p>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Summon cost
                </span>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                  {match.souls.map(({ tier, count }) => (
                    <span key={tier} className="flex items-center gap-2 tabular-nums">
                      <span
                        className={`size-2.5 rounded-full ${TIERS.find((t) => t.which === tier)!.dot}`}
                      />
                      {count} {TIER_LABELS[tier].toLowerCase()}
                    </span>
                  ))}
                  <span
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-1 tabular-nums"
                    title="Base price plus the per-level surcharge. Rare candidates multiply the surcharge by 10."
                  >
                    <GameIcon
                      folder="Items"
                      name="Y Coin"
                      className="size-5 shrink-0 object-contain"
                    />
                    {match.money.toLocaleString("en-US")}
                    {match.moneyAdd > 0 && (
                      <span className="text-muted">
                        + {match.moneyAdd.toLocaleString("en-US")}/level
                      </span>
                    )}
                  </span>
                  {match.item && (
                    <span className="flex items-center gap-2">
                      <ItemIcon
                        name={keepsake?.[1] ?? match.item}
                        category={keepsake?.[2] ?? "consumable"}
                        className="size-5 shrink-0 object-contain"
                      />
                      {match.item}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SoulBagList({
  parsed,
  onEdited,
  lead,
  onGiveAll,
}: {
  parsed: ParsedSave;
  onEdited: () => void;
  lead: ReactNode;
  onGiveAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const owned = new Map<number, Slot>(readInventory(parsed, def).map((s) => [s.crc, s]));
  /** Game display order, from item_config's ITEM_SOUL_INFO sort index. */
  const soulRank = new Map(
    (ITEM_GROUPS.find((g) => g.id === "souls")?.order ?? []).map((crc, i) => [crc, i]),
  );
  const catalog = (ITEM_GROUPS.find((g) => g.id === "souls")?.order ?? [])
    .filter((crc) => GENERAL_SOULS.has(crc >>> 0) || owned.has(crc))
    .map((crc) => ({ crc, name: itemByCrc(crc)?.name, rarity: itemByCrc(crc)?.rarity ?? 1 }))
    .filter((i): i is { crc: number; name: string; rarity: number } => !!i.name)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (soulRank.get(a.crc) ?? 1e9) - (soulRank.get(b.crc) ?? 1e9));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {lead}
        <Button variant="primary" onPress={onGiveAll}>
          <span className="hidden sm:inline">Give every soul ×99</span>
          <span className="sm:hidden">Give all ×99</span>
        </Button>
      </div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
        <Input
          aria-label="Search souls"
          placeholder="Search souls…"
          className="h-9 w-full ps-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ScrollShadow className="min-h-0 flex-1 max-h-[50dvh] pr-1 sm:max-h-[max(24rem,calc(100dvh-26rem))]">
        <div className="flex flex-col gap-0.5">
          {catalog.map((item) => {
            const slot = owned.get(item.crc);
            const art = artByCrc.get(item.crc) ?? "";
            const general = GENERAL_SOULS.has(item.crc >>> 0);
            return (
              <div
                key={item.crc}
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-surface-hover"
              >
                {(() => {
                  // art paths are "Folder/Name" (Yokai/<model>,
                  // Tribes/<emblem|rank gem>)
                  const slash = art.indexOf("/");
                  const folder = slash === -1 ? "Ark" : art.slice(0, slash);
                  const name = slash === -1 ? art : art.slice(slash + 1);
                  // rank gems draw small inside the standard tile; faces fill it
                  const isRank = art.startsWith("Tribes/rank_");
                  return <GameIcon folder={folder} name={name} inset={isRank ? 6 : 0} />;
                })()}
                {/* art paths: Yokai/<model> for yo-kai/boss/bearer/god souls,
                    Tribes/<emblem|rank gem> for tribe souls and petites */}
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className={`truncate text-sm ${slot ? "" : "text-muted"}`}>
                    {item.name}
                  </span>
                  {/* General souls carry no rarity in the game's own lists —
                      the stars were our item-table import, not game data. */}
                  {!general && <RarityStars rarity={item.rarity} />}
                </span>
                {slot ? (
                  <>
                    <RollStepper
                      className="w-24"
                      value={slot.quantity}
                      step={1}
                      max={0xffff}
                      ariaLabel={`${item.name} quantity`}
                      onCommit={(v) => {
                        setQuantity(parsed, def, slot.index, v);
                        onEdited();
                      }}
                    />
                    <Button
                      size="md"
                      variant="secondary"
                      isIconOnly
                      aria-label={`Remove ${item.name}`}
                      className="text-muted hover:text-danger"
                      onPress={() => {
                        removeWithUndo(
                          parsed,
                          `Removed ${item.name}.`,
                          () => clearSlot(parsed, def, slot.index),
                          onEdited,
                        );
                      }}
                    >
                      <TrashIcon size={15} />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="md"
                    variant="secondary"
                    isIconOnly
                    aria-label={`Give ${item.name}`}
                    className="text-muted"
                    onPress={() => {
                      giveItem(parsed, def, item.crc, 99);
                      onEdited();
                    }}
                  >
                    <PlusIcon size={15} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollShadow>
    </div>
  );
}

export function SoulsPanel({ parsed }: { parsed: ParsedSave }) {
  const [view, setView] = useState<"bag" | "ledger">("bag");
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);
  const souls = readYoKaiSouls(parsed);
  const soulsByParam = new Map(souls.map((s) => [s.paramId, s]));
  const candidatesBySpecies = useMemo(() => konkatsuCandidatesBySpecies(parsed), [parsed]);

  const giveAll = () => {
    // All 34 general souls: sol* items are konkatsu equipment crafting
    // materials (the bag's legit residents); wisp currency is not an item.
    const owned = new Map(readInventory(parsed, def).map((slot) => [slot.crc, slot]));
    let changed = 0;
    for (const crc of GENERAL_SOULS) {
      const slot = owned.get(crc);
      if (slot) {
        // already owned: top the stack up to a full 99
        if (slot.quantity < 99) {
          setQuantity(parsed, def, slot.index, 99);
          changed++;
        }
      } else if (giveItem(parsed, def, crc, 99) !== null) {
        changed++;
      }
    }
    rerender();
    if (changed > 0) toast.success(`Filled ${changed} soul${changed === 1 ? "" : "s"} to 99.`);
    else toast.warning("Every general soul is already at 99.");
  };

  const lead = (
    <SubTabs
      label="Soul sections"
      value={view}
      onChange={(id) => setView(id as "bag" | "ledger")}
      tabs={[
        { id: "bag", label: "Soul bag" },
        { id: "ledger", label: "Yo-kai souls" },
      ]}
    />
  );

  return (
    <Tile>
      {view === "bag" ? (
        <SoulBagList parsed={parsed} onEdited={rerender} lead={lead} onGiveAll={giveAll} />
      ) : (
        <LedgerView
          parsed={parsed}
          soulsByParam={soulsByParam}
          candidatesBySpecies={candidatesBySpecies}
          onEdited={rerender}
          lead={lead}
        />
      )}
    </Tile>
  );
}
