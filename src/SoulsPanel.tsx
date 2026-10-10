/** Souls tab: the soul bag inventory on the left, the per-yo-kai
 *  white / red / gold soul counters on the right. The per-yo-kai list
 *  shows every matchable species; ones the save has no ledger row for
 *  sit faded with a + that creates the row. */
import { useState } from "react";
import { Button, Card, CardContent, Input, ScrollShadow, Tabs, toast } from "@heroui/react";
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
} from "./lib/editor";
import { itemByCrc } from "./lib/item-data";
import { ITEM_GROUPS } from "./lib/item-order";
import { SOULS_CATALOG } from "./lib/souls-catalog";
import { KONKATSU_LIST } from "./lib/konkatsu-list";
import type { ParsedSave } from "./lib/save-format";
import { GameIcon, RarityStars, RollStepper } from "./ui";
import { SOUL_ART } from "./lib/soul-art";
import { yokaiRank, yokaiTribe } from "./lib/yokai-base";
import { PlusIcon, SearchIcon, TrashIcon } from "./icons";

const def = INVENTORIES.souls;

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

/** chara_base battle-row tribe enum (see lib/yokai-base.ts). */
const TRIBE_NAMES = [
  "",
  "Goriki",
  "Onnen",
  "Mononoke",
  "Tsukumono",
  "Uwanosora",
  "Omamori",
  "Mikakunin",
  "Mikado",
  "Izana",
  "Oni",
  "Wicked",
  "Shinma",
] as const;

/** chara_base battle-row rank enum: 1 E .. 6 S. */
const RANK_LETTERS = ["", "E", "D", "C", "B", "A", "S"] as const;

function SoulBagList({ parsed, onEdited }: { parsed: ParsedSave; onEdited: () => void }) {
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
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
        <Input
          aria-label="Search souls"
          placeholder="Search souls…"
          className="ps-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ScrollShadow className="max-h-80 rounded-xl border border-border bg-surface-secondary/50 p-2">
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
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Remove ${item.name}`}
                      className="text-muted"
                      onPress={() => {
                        clearSlot(parsed, def, slot.index);
                        onEdited();
                      }}
                    >
                      <TrashIcon size={14} />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
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
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);
  const souls = readYoKaiSouls(parsed);
  const soulsByParam = new Map(souls.map((s) => [s.paramId, s]));

  const giveAll = () => {
    // All 34 general souls: sol* items are konkatsu equipment crafting
    // materials (the bag's legit residents); wisp currency is not an item.
    let added = 0;
    for (const crc of GENERAL_SOULS) {
      if (giveItem(parsed, def, crc, 99) !== null) added++;
    }
    rerender();
    if (added > 0) toast.success(`Added ${added} soul${added === 1 ? "" : "s"} to the bag.`);
    else toast.warning("Nothing to add.");
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 p-3.5">
        <Tabs aria-label="Soul sections">
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab key="bag" id="bag">
                <Tabs.Indicator />
                Soul bag
              </Tabs.Tab>
              <Tabs.Tab key="ledger" id="ledger">
                <Tabs.Indicator />
                Yo-kai souls
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel key="bag" id="bag">
            <div className="flex flex-col gap-2.5 pt-2.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Craft and summon materials
                </p>
                <Button size="sm" variant="outline" className="ml-auto" onPress={giveAll}>
                  Give every soul ×99
                </Button>
              </div>
              <SoulBagList parsed={parsed} onEdited={rerender} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel key="ledger" id="ledger">
            <ScrollShadow className="mt-2.5 max-h-96 rounded-xl border border-border bg-surface-secondary/50 p-2">
              <div className="flex flex-col gap-0.5">
                {KONKATSU_LIST.map((match) => {
                  const soul = soulsByParam.get(match.paramId);
                  const collected = soul !== undefined;
                  return (
                    <div
                      key={match.model}
                      className={`flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-hover ${
                        collected ? "" : "opacity-50"
                      }`}
                    >
                      <GameIcon
                        folder="Yokai"
                        name={match.model}
                        className="size-8 shrink-0 rounded-lg bg-surface-secondary object-contain p-0.5"
                      />
                      {(() => {
                        const tribe = yokaiTribe(match.paramId);
                        const rank = yokaiRank(match.paramId);
                        return (
                          <>
                            {tribe !== undefined && (
                              <span title={`${TRIBE_NAMES[tribe]} tribe`}>
                                <GameIcon
                                  folder="Tribes"
                                  name={`race_${TRIBE_NAMES[tribe]}`}
                                  className="block size-5 shrink-0 rounded object-contain"
                                />
                              </span>
                            )}
                            {rank !== undefined && (
                              <span title={`Rank ${RANK_LETTERS[rank]}`}>
                                <GameIcon
                                  folder="Tribes"
                                  name={`rank_${RANK_LETTERS[rank]}`}
                                  className="block size-5 shrink-0 object-contain"
                                />
                              </span>
                            )}
                          </>
                        );
                      })()}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${collected ? "" : "text-muted"}`}>
                          {match.name}
                        </p>
                        <p
                          title={`Summon: ${match.souls
                            .map((s) => s.count + " " + s.tier)
                            .join(" + ")} + ${match.money} money${
                            match.item ? ` + ${match.item}` : ""
                          }`}
                          className="flex items-center gap-1.5 text-[10px] text-muted opacity-80"
                        >
                          {match.souls.map(({ tier, count }) => {
                            const dot = TIERS.find((t) => t.which === tier)!;
                            return (
                              <span key={tier} className="flex items-center gap-0.5 tabular-nums">
                                <span className={`size-1.5 rounded-full ${dot.dot}`} />
                                {count}
                              </span>
                            );
                          })}
                          <span className="tabular-nums">
                            {match.money.toLocaleString("en-US")}
                          </span>
                          {match.item && <span className="truncate">+ {match.item}</span>}
                        </p>
                      </div>
                      {collected ? (
                        TIERS.map(({ which, dot }) => (
                          <div
                            key={which}
                            title={which}
                            className="flex items-center gap-1.5 text-xs text-muted"
                          >
                            <span className={`size-2 rounded-full ${dot}`} />
                            <RollStepper
                              className="w-24"
                              value={soul[which]}
                              step={1}
                              max={0xffff}
                              ariaLabel={`${match.name} ${which} souls`}
                              onCommit={(v) => {
                                setYoKaiSoul(parsed, soul.index, which, v);
                                rerender();
                              }}
                            />
                          </div>
                        ))
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Start ${match.name} souls`}
                          className="text-muted"
                          onPress={() => {
                            try {
                              addYoKaiSoulRow(parsed, match.paramId, { white: 1, red: 0, gold: 0 });
                              rerender();
                            } catch (err) {
                              toast.warning(String((err as Error).message ?? err));
                            }
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
          </Tabs.Panel>
        </Tabs>
      </CardContent>
    </Card>
  );
}
