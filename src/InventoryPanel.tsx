/** Inventory tab: every catalog item in one place, grouped the way the game
 *  orders them (Food / Items / Equipment) with tick-to-give, quantities and
 *  (for equipment) equipped flags.
 *
 *  Key items are deliberately absent: story keys/watches are not bag items —
 *  the save derives them from story-event flags, so they can neither be read
 *  as owned nor given via the acquisition log. See tools/lua/save_flag_notes.md. */
import { memo, useCallback, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupRoot,
  InputGroupSuffix,
  ScrollShadow,
  toast,
} from "@heroui/react";
import { SlotText } from "slot-text/react";
import { play } from "cuelume";
import {
  giveItem,
  INVENTORIES,
  readInventory,
  setQuantity,
  type InventoryDef,
  type Slot,
} from "./lib/editor";
import { itemByCrc, type ItemCategory, type ItemInfo } from "./lib/item-data";
import { ITEM_GROUPS } from "./lib/item-order";
import { ITEM_EXCLUSIVITY } from "./lib/item-exclusivity";
import type { ParsedSave } from "./lib/save-format";
import { ItemIcon, RarityStars } from "./ui";
import { MinusIcon, PlusIcon, SearchIcon } from "./icons";

const ROW_CAP = 400;
/** The game caps bag stacks at 99 (item_config ordinal 7). */
const STACK_MAX = 99;

/** Who an equipment item is exclusive to (empty for non-exclusive items). */
const EXCLUSIVE = new Map<number, string>(ITEM_EXCLUSIVITY);

function CheckTick({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox.Root isSelected={checked} onChange={onChange} aria-label={`Select ${label}`}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox.Root>
  );
}

/** HeroUI InputGroup stepper: [-][quantity][+], commits every in-range edit. */
export function QuantityStepper({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(1, Math.min(STACK_MAX, v));
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const step = (delta: 1 | -1) => {
    setDirection(delta > 0 ? "up" : "down");
    play("tick");
    onCommit(clamp(value + delta));
  };
  const stepProps = (label: string) => ({
    variant: "ghost" as const,
    size: "sm" as const,
    isIconOnly: true,
    "aria-label": label,
    className: "size-5 min-w-5 rounded-small p-0 text-muted",
  });
  return (
    <InputGroupRoot className="w-24">
      <InputGroupPrefix className="flex items-center px-1">
        <Button
          {...stepProps(`Remove one ${name}`)}
          isDisabled={value <= 1}
          onPress={() => step(-1)}
        >
          <MinusIcon size={12} />
        </Button>
      </InputGroupPrefix>
      {editing ? (
        <InputGroupInput
          autoFocus
          type="number"
          aria-label={`${name} quantity`}
          className="w-0 min-w-0 flex-1 text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={text ?? String(value)}
          onChange={(e) => {
            setText(e.target.value);
            const n = Math.floor(Number(e.target.value));
            if (e.target.value !== "" && Number.isInteger(n)) onCommit(clamp(n));
          }}
          onBlur={() => {
            setText(null);
            setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          aria-label={`Edit ${name} quantity`}
          className="w-0 min-w-0 flex-1 cursor-text text-center font-mono text-sm"
          onClick={() => setEditing(true)}
        >
          <SlotText text={String(value)} options={{ direction, duration: 180, stagger: 24 }} />
        </button>
      )}
      <InputGroupSuffix className="flex items-center px-1">
        <Button
          {...stepProps(`Add one ${name}`)}
          isDisabled={value >= STACK_MAX}
          onPress={() => step(1)}
        >
          <PlusIcon size={12} />
        </Button>
      </InputGroupSuffix>
    </InputGroupRoot>
  );
}

type GroupId = (typeof ITEM_GROUPS)[number]["id"];

/** Key items are story-flag derived, not bag items — not offered here.
 *  Souls are the souls-bag inventory, edited on the Souls tab. */
const BAG_GROUP_IDS: ReadonlySet<string> = new Set(["food", "items", "equipment"]);
const EDITABLE_GROUPS = ITEM_GROUPS.filter((g) => BAG_GROUP_IDS.has(g.id));

/** One catalog row, memoized on primitives so a quantity edit re-renders
 *  exactly this row instead of the whole list. */
const InventoryRow = memo(function InventoryRow({
  crc,
  info,
  category,
  quantity,
  slotIndex,
  owned,
  checked,
  exclusive,
  onTick,
  onQuantity,
}: {
  crc: number;
  info: ItemInfo;
  category: ItemCategory;
  quantity: number | null;
  slotIndex: number;
  owned: boolean;
  checked: boolean;
  exclusive?: string;
  onTick: (crc: number, checked: boolean) => void;
  onQuantity: (index: number, v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-surface-hover">
      <CheckTick checked={checked} label={info.name} onChange={(c) => onTick(crc, c)} />
      <ItemIcon name={info.name} category={category} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={`truncate text-sm ${owned ? "" : "text-muted"}`}>{info.name}</span>
        <RarityStars rarity={info.rarity} />
        {exclusive && (
          <span
            className="max-w-28 shrink truncate rounded-md border border-border bg-surface-secondary px-1.5 py-0.5 text-[10px] text-muted"
            title={`Exclusive to ${exclusive}`}
          >
            {exclusive} only
          </span>
        )}
      </span>
      {quantity !== null ? (
        <QuantityStepper
          name={info.name}
          value={quantity}
          onCommit={(v) => onQuantity(slotIndex, v)}
        />
      ) : (
        <span className="w-24 text-center text-xs text-muted">—</span>
      )}
    </div>
  );
});

export function InventoryPanel({ parsed }: { parsed: ParsedSave }) {
  const [groupId, setGroupId] = useState<GroupId>("food");
  const [search, setSearch] = useState("");
  const [ticked, setTicked] = useState<Record<string, Set<number>>>({});
  const [, force] = useState(0);
  const rerender = () => force((v) => v + 1);

  const group = EDITABLE_GROUPS.find((g) => g.id === groupId) ?? EDITABLE_GROUPS[0];
  const def: InventoryDef = group.id === "equipment" ? INVENTORIES.equipment : INVENTORIES.bag;

  const owned = new Map<number, Slot>(readInventory(parsed, def).map((s) => [s.crc, s]));
  const groupTicked = ticked[groupId] ?? new Set<number>();
  const catalog = group.order
    .map((crc) => ({ crc, info: itemByCrc(crc) }))
    .filter((i): i is { crc: number; info: ItemInfo } => !!i.info)
    .filter(({ info }) => info.name.toLowerCase().includes(search.toLowerCase()));
  const shown = catalog.slice(0, ROW_CAP);
  /** A ticked item needs filling when it is not owned or sits below a full
   *  stack; already-full items do not count toward the button. */
  const needsFill = (crc: number) => {
    const slot = owned.get(crc);
    return !slot || slot.quantity < STACK_MAX;
  };
  const giveCount = catalog.filter((i) => groupTicked.has(i.crc) && needsFill(i.crc)).length;

  const setGroupTicked = (next: Set<number>) => setTicked((t) => ({ ...t, [groupId]: next }));

  /** Ticks are explicit user intent only: nothing is pre-ticked and ownership
   *  does not tick rows for you. */
  const handleTick = useCallback(
    (crc: number, checked: boolean) => {
      setTicked((t) => {
        const next = new Set(t[groupId] ?? []);
        if (checked) next.add(crc);
        else next.delete(crc);
        return { ...t, [groupId]: next };
      });
    },
    [groupId],
  );

  const handleQuantity = useCallback(
    (index: number, v: number) => {
      setQuantity(parsed, def, index, v);
      force((n) => n + 1);
    },
    [parsed, def],
  );

  const giveTicked = () => {
    let filled = 0;
    let rejected = 0;
    for (const item of catalog) {
      if (!groupTicked.has(item.crc) || !needsFill(item.crc)) continue;
      const slot = owned.get(item.crc);
      if (slot) {
        // already owned: top the existing stack up to a full 99
        setQuantity(parsed, def, slot.index, STACK_MAX);
        filled++;
      } else if (giveItem(parsed, def, item.crc, STACK_MAX) !== null) {
        filled++;
      } else {
        rejected++;
      }
    }
    setGroupTicked(new Set());
    rerender();
    if (filled > 0) {
      toast.success(`Filled ${filled} item${filled === 1 ? "" : "s"} to 99.`);
      play("success");
    }
    if (rejected > 0) {
      toast.warning(
        `${def.label} is full. ${rejected} item${rejected === 1 ? "" : "s"} not added (max ${def.count}).`,
      );
    }
    if (filled === 0 && rejected === 0) toast.warning("Nothing to fill.");
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {EDITABLE_GROUPS.map((g) => (
          <Button
            key={g.id}
            size="sm"
            variant={g.id === groupId ? "primary" : "outline"}
            onPress={() => setGroupId(g.id)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
          <Input
            aria-label={`Search ${group.label}`}
            placeholder={`Search ${group.label.toLowerCase()}…`}
            className="w-52 ps-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onPress={() => setGroupTicked(new Set(catalog.map((i) => i.crc)))}
        >
          Select all
        </Button>
        <Button size="sm" variant="outline" onPress={() => setGroupTicked(new Set())}>
          Clear
        </Button>
        <Button size="sm" variant="primary" isDisabled={giveCount === 0} onPress={giveTicked}>
          Fill ticked ×99 · {giveCount}
        </Button>
        <span className="ml-auto font-mono text-xs text-muted">
          <SlotText text={`${owned.size}/${def.count}`} /> slots used
        </span>
      </div>

      <ScrollShadow className="max-h-96 rounded-xl border border-border bg-surface-secondary/50 p-2">
        <div className="flex flex-col gap-0.5">
          {shown.map(({ crc, info: item }) => {
            const slot = owned.get(crc);
            return (
              <InventoryRow
                key={crc}
                crc={crc}
                info={item}
                category={def.categories[0]}
                quantity={slot ? slot.quantity : null}
                slotIndex={slot?.index ?? -1}
                owned={owned.has(crc)}
                checked={groupTicked.has(crc)}
                exclusive={EXCLUSIVE.get(crc)}
                onTick={handleTick}
                onQuantity={handleQuantity}
              />
            );
          })}
          {catalog.length > shown.length && (
            <p className="p-2 text-center text-xs text-muted">
              {catalog.length - shown.length} more match
              {catalog.length - shown.length === 1 ? "" : "es"}. Narrow the search to see it.
            </p>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}

/** Small ghost button used by the souls bag list (give / remove). */
export function RowIconButton({
  kind,
  label,
  onPress,
}: {
  kind: "give" | "remove";
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      isIconOnly
      aria-label={label}
      className="text-muted"
      onPress={onPress}
    >
      {kind === "give" ? <PlusIcon size={15} /> : <TrashIconInline />}
    </Button>
  );
}

function TrashIconInline() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.6 7h14.8M9.6 7V5.4A1.4 1.4 0 0 1 11 4h2a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="M6.6 7l.7 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.7-11" />
    </svg>
  );
}
