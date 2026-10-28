/** Game-art image helpers and small shared bits for the panels. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupRoot,
  InputGroupSuffix,
  Modal,
  Tabs,
  toast,
} from "@heroui/react";
import { SlotText } from "slot-text/react";
import { play } from "cuelume";
import { MinusIcon, PlusIcon } from "./icons";
import type { ItemCategory } from "./lib/item-data";
import type { StatKey } from "./lib/yokai-stats";

/** Category → art folder inside the deployed `icons/` tree. */
const CATEGORY_FOLDERS: Record<ItemCategory, string> = {
  consumable: "Items",
  key: "Items",
  equipment: "Equipments",
  soul: "Yokai",
  yokaisoul: "Yokai",
};

/** URL of an icon under `icons/<Folder>/<Name>.webp`; names are encoded. */
export function artUrl(folder: string, name: string): string {
  return new URL(`icons/${folder}/${encodeURIComponent(name)}.webp`, document.baseURI).href;
}

/* ── Sprite-sheet backed icons ──────────────────────────────────────────────
 *  Each art folder ships as one packed sheet.webp + sheet.json manifest
 *  GameIcon resolves names against the
 *  manifest and draws the right region with CSS background positioning, so a
 *  whole folder costs a single request instead of one per icon. */

interface SpritePage {
  w: number;
  h: number;
  file: string;
  icons: Record<string, [number, number, number, number]>;
}

interface SpriteManifest {
  pages: SpritePage[];
}

const manifestCache = new Map<string, Promise<SpriteManifest | null>>();

function loadManifest(folder: string): Promise<SpriteManifest | null> {
  let p = manifestCache.get(folder);
  if (!p) {
    p = fetch(new URL(`icons/${folder}/sheet.json`, document.baseURI).href, {
      cache: "no-cache",
    })
      .then((r) => (r.ok ? (r.json() as Promise<SpriteManifest>) : null))
      .catch(() => null);
    manifestCache.set(folder, p);
  }
  return p;
}

function sheetUrl(folder: string, file: string): string {
  return new URL(`icons/${folder}/${file}`, document.baseURI).href;
}

/** Display pixel size from a Tailwind `size-<n>` class (n × 0.25rem). */
function displayPx(className: string): number {
  const m = /(?:^|\s)size-(\d+)(?:$|\s)/.exec(className);
  return (m ? Number(m[1]) : 8) * 4;
}

/** A tile icon drawn from the folder's sprite sheet; swaps itself for a
 *  blank tile when the manifest has no art for the name (or falls back to
 *  the loose file if the sheet itself is unavailable). */
export function GameIcon({
  folder,
  name,
  alt = "",
  className = "size-8 shrink-0 rounded-lg bg-surface-secondary object-contain p-0.5",
  inset = 0,
}: {
  folder: string;
  name: string;
  alt?: string;
  className?: string;
  /** Shrink the art by this many px per side inside the box (the tile
   *  background still fills the box). 0 = art fills the box. */
  inset?: number;
}) {
  const [manifest, setManifest] = useState<SpriteManifest | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadManifest(folder).then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, [folder]);

  if (manifest === undefined) return <span className={className} aria-hidden />;
  if (manifest === null) {
    // sheet unavailable — legacy per-file fallback
    return <LooseIcon folder={folder} name={name} alt={alt} className={className} />;
  }
  // Boss "friend form" models (y03030000_friend) share the base model's art;
  // fall back when the sheet lacks the suffixed key.
  const key = manifest.pages.some((pg) => name in pg.icons) ? name : name.replace(/_[a-z]+$/, "");
  const page = manifest.pages.find((pg) => key in pg.icons);
  if (!page) return <span className={className} aria-hidden />;
  const rect = page.icons[key];

  const px = displayPx(className);
  const inner = Math.max(1, px - inset * 2);
  const scale = inner / Math.max(rect[2], rect[3]);
  const [x, y, w, h] = rect;
  // contain-scale the whole page, then offset so the icon's own cell sits
  // centered in the box (same visual as object-contain on a loose file).
  const bgW = page.w * scale;
  const bgH = page.h * scale;
  const posX = (px - w * scale) / 2 - x * scale;
  const posY = (px - h * scale) / 2 - y * scale;
  return (
    <span
      className={className}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        backgroundImage: `url(${JSON.stringify(sheetUrl(folder, page.file))})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${posX}px ${posY}px`,
      }}
    />
  );
}

/** Legacy per-file icon used when a folder has no sprite sheet. */
function LooseIcon({
  folder,
  name,
  alt,
  className,
}: {
  folder: string;
  name: string;
  alt: string;
  className: string;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className={className} aria-hidden />;
  return (
    <img
      src={artUrl(folder, name)}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setOk(false)}
    />
  );
}

/** Item catalog icon (category decides the folder). */
export function ItemIcon({
  name,
  category,
  className,
}: {
  name: string;
  category: ItemCategory;
  className?: string;
}) {
  return <GameIcon folder={CATEGORY_FOLDERS[category]} name={name} className={className} />;
}

/** Item rarity as the game's list UI shows it: 1-4 gold stars, 5 pink. */
export function RarityStars({ rarity }: { rarity: number }) {
  const stars = Math.max(1, Math.min(5, rarity));
  const filled = stars >= 5 ? "text-[#f263ad]" : "text-warning";
  return (
    <span
      className="shrink-0 text-[11px] leading-none tracking-widest"
      title={`${stars}-star`}
      aria-label={`${stars}-star rarity`}
    >
      <span className={filled}>{"★".repeat(stars)}</span>
      <span className="text-muted opacity-40">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

/* ── Protagonist dot sprites ──────────────────────────────────────────────── */

/** Protagonist idle sprites in two sizes cut from the game's 16_icon_minichr
 *  art (sheets built by hand; backdrop keyed, frames measured into
 *  players.json). Each variant renders 1:1 in a tile sized to its sprite —
 *  dot art only stays crisp at integer ratios. */
interface PlayerCell {
  a: [number, number, number, number];
  b: [number, number, number, number];
  /** Union content bbox of both frames, absolute sheet coords — the art is
   *  not centered inside its cell (bottom-flush, ±1px drifts), so tiles seat
   *  this box rather than the cell rectangle. */
  box: [number, number, number, number];
}

type PlayerVariant = "2x" | "1x";

const PLAYER_VARIANTS: Record<PlayerVariant, { url: string; tile: number }> = {
  "2x": { url: new URL("icons/players/sheet_2x.png", document.baseURI).href, tile: 72 },
  "1x": { url: new URL("icons/players/sheet_1x.png", document.baseURI).href, tile: 36 },
};

/** Full sheet dimensions, for background-size math when upscaling. */
const SHEET_SIZE: Record<PlayerVariant, { w: number; h: number }> = {
  "2x": { w: 70, h: 360 },
  "1x": { w: 35, h: 180 },
};

let playerManifest: Promise<Record<PlayerVariant, Record<string, PlayerCell>>> | null = null;
function loadPlayerManifest() {
  playerManifest ??= fetch(new URL("icons/players/players.json", document.baseURI).href, {
    cache: "no-cache",
  })
    .then((r) => {
      if (!r.ok) throw new Error("player sheet manifest missing");
      return r.json() as Promise<Record<PlayerVariant, { chars: Record<string, PlayerCell> }>>;
    })
    .then((j) => ({ "2x": j["2x"].chars, "1x": j["1x"].chars }));
  return playerManifest;
}

function usePlayerCell(name: string, variant: PlayerVariant): PlayerCell | null {
  const [cell, setCell] = useState<PlayerCell | null>(null);
  useEffect(() => {
    let alive = true;
    loadPlayerManifest()
      .then((m) => {
        if (alive) setCell(m[variant][name] ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [name, variant]);
  return cell;
}

export function PlayerSprite({
  name,
  variant = "2x",
  scale = 1,
  frame = true,
}: {
  name: string;
  variant?: PlayerVariant;
  /** Integer magnification of the sheet art — fractional scales wobble. */
  scale?: number;
  /** false = bare sprite (no tile backdrop), sized to frame A; the parent
   *  supplies the backdrop. Feet stay planted across the idle flip. */
  frame?: boolean;
}) {
  const cell = usePlayerCell(name, variant);
  const { url, tile } = PLAYER_VARIANTS[variant];
  const sheet = SHEET_SIZE[variant];
  if (!cell) {
    return (
      <span
        className="relative inline-block shrink-0 rounded-lg bg-surface-secondary"
        style={{ width: tile * scale, height: tile * scale }}
        aria-hidden
      />
    );
  }
  // Seat the content box, not the cell rectangle. The box is frame A's art
  // extent relative to its cell; frame B sits at the same offset inside its
  // own cell, so both layers render at the SAME position and the idle swap
  // can't move the sprite.
  const [ax, ay] = cell.a;
  const [bx, by, bw, bh] = cell.box ?? [ax, ay, cell.a[2], cell.a[3]];
  const layer = (f: "a" | "b", left: number, top: number) => {
    const [x, y, w, h] = cell[f];
    return (
      <span
        key={f}
        className={`absolute player-idle-${f}`}
        style={{
          width: w * scale,
          height: h * scale,
          left,
          top,
          backgroundImage: `url(${url})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
          backgroundPosition: `${-x * scale}px ${-y * scale}px`,
          imageRendering: "pixelated",
        }}
      />
    );
  };
  if (!frame) {
    // Bare sprite: the box itself is the element, so the parent's centering
    // centers the art. Cell rects are shifted so the box lands at (0, 0).
    return (
      <span
        className="relative inline-block shrink-0"
        style={{ width: bw * scale, height: bh * scale }}
        aria-hidden
      >
        {layer("a", -bx * scale, -by * scale)}
        {layer("b", -bx * scale, -by * scale)}
      </span>
    );
  }
  const left = ((tile - bw) / 2 - bx) * scale;
  const top = ((tile - bh) / 2 - by) * scale;
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-lg bg-surface-secondary"
      style={{ width: tile * scale, height: tile * scale }}
      aria-hidden
    >
      {layer("a", left, top)}
      {layer("b", left, top)}
    </span>
  );
}

/* ── Protagonist portrait badges ──────────────────────────────────────────── */

/** Accent tints for the six protagonists — badge gradients, borders and EXP
 *  bar fills all key off these. Shin is Shin Shimomachi (EN: Jack Cobbler);
 *  denim blue after his hair and striped shirt. */
export const PLAYER_ACCENTS: Record<string, string> = {
  Nate: "#e5484d",
  Katie: "#e93d82",
  Summer: "#f76b15",
  Touma: "#14b8a6",
  Akinori: "#8e4ec6",
  Shin: "#4a7ebb",
};

/** The rounded accent-tinted portrait badge; shared by the Player tab cards
 *  and the Player name rows so both pages present protagonists identically. */
export function Portrait({
  name,
  size = 72,
  fill = false,
}: {
  name: string;
  size?: number;
  /** Stretch to the row's full height (width stays `size`), so a taller
   *  row has no empty band above and below the badge. */
  fill?: boolean;
}) {
  const accent = PLAYER_ACCENTS[name] ?? "#3e63dd";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl border-2 ${
        fill ? "self-stretch" : "self-center"
      }`}
      style={{
        width: size,
        height: fill ? undefined : size,
        minHeight: size,
        background: `linear-gradient(180deg, ${accent}36, ${accent}0a)`,
        borderColor: `color-mix(in oklab, ${accent} 40%, #0d0a0c)`,
      }}
    >
      <PlayerSprite name={name} variant="2x" scale={1} frame={false} />
    </div>
  );
}

/* ── Rolling stepper ─────────────────────────────────────────────────────── */

/** The shared −/+ stepper used for money, character stats and crank attempts:
 *  tap for ±step, HOLD to accelerate — the step scales ×10 every half second
 *  the button stays down, so any magnitude is a short hold away. Rolling
 *  slot-text display with a cuelume tick per commit; click the number to type
 *  an exact value. Clamped to [min, max]. */
export function RollStepper({
  value,
  step,
  max,
  min = 0,
  onCommit,
  onOverflow,
  onUnderflow,
  className,
  ariaLabel,
  bare = false,
  disabled = false,
}: {
  value: number;
  step: number;
  max: number;
  min?: number;
  onCommit: (v: number) => void;
  /** Called instead of committing when + is pressed at max (e.g. EXP
   *  rolling into the next level).  The button stays enabled. */
  onOverflow?: () => void;
  /** Called instead of committing when − is pressed at min. */
  onUnderflow?: () => void;
  className?: string;
  ariaLabel: string;
  /** Transparent field chrome, for mounting the stepper over a progress bar. */
  bare?: boolean;
  /** Locked: no buttons, no click-to-edit, muted display. */
  disabled?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  // Latest committed value; repeated commits during a hold build on it
  // without waiting for the parent to re-render.
  const running = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const lastPointer = useRef(0);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const commit = (next: number) => {
    if (next === running.current) return;
    setDirection(next > running.current ? "up" : "down");
    play("tick");
    running.current = next;
    onCommit(next);
  };

  const endHold = () => {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    window.removeEventListener("pointerup", endHold);
    window.removeEventListener("pointercancel", endHold);
  };

  /** A press at the boundary rolls over instead of clamping, when the parent
   *  supplied a carry handler.  Returns true when it was consumed. */
  const overflowAt = (dir: 1 | -1): boolean => {
    if (dir > 0 && value >= max && onOverflow) {
      setDirection("up");
      play("tick");
      onOverflow();
      return true;
    }
    if (dir < 0 && value <= min && onUnderflow) {
      setDirection("down");
      play("tick");
      onUnderflow();
      return true;
    }
    return false;
  };

  const beginHold = (dir: 1 | -1) => {
    endHold();
    if (overflowAt(dir)) return;
    running.current = value;
    lastPointer.current = Date.now();
    commit(clamp(value + dir * step));
    const startedAt = lastPointer.current;
    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);
    holdTimer.current = window.setInterval(() => {
      const heldMs = Date.now() - startedAt;
      if (heldMs < 400) return;
      const mult = Math.min(10 ** Math.floor((heldMs - 400) / 500), 1e9);
      commit(clamp(running.current + dir * step * mult));
    }, 100);
  };

  useEffect(() => endHold, []);

  const btn = "flex size-5 items-center justify-center rounded-small p-0 text-muted";
  const holdButton = (dir: 1 | -1, glyph: React.ReactNode) => (
    <button
      type="button"
      className={btn}
      disabled={dir > 0 ? value >= max && !onOverflow : value <= min && !onUnderflow}
      onPointerDown={() => {
        lastPointer.current = Date.now();
        beginHold(dir);
      }}
      // The click after a held pointer is redundant; a keyboard Enter/Space
      // has no pointerdown, so it still counts as a single step.
      onClick={() => {
        if (Date.now() - lastPointer.current < 600) return;
        if (overflowAt(dir)) return;
        running.current = value;
        commit(clamp(value + dir * step));
      }}
      aria-label={`${dir > 0 ? "Add" : "Remove"} ${step} ${ariaLabel}`}
    >
      {glyph}
    </button>
  );

  return (
    <InputGroupRoot
      className={className ?? "w-full"}
      style={bare ? { background: "transparent", border: "none", boxShadow: "none" } : undefined}
    >
      {!disabled && (
        <InputGroupPrefix className="flex items-center px-1">
          {holdButton(-1, <MinusIcon size={12} />)}
        </InputGroupPrefix>
      )}
      {editing ? (
        <InputGroupInput
          autoFocus
          type="number"
          aria-label={ariaLabel}
          style={bare ? { background: "transparent" } : undefined}
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
          aria-label={`Edit ${ariaLabel}`}
          className="w-0 min-w-0 flex-1 text-center font-mono text-sm"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setEditing(true);
          }}
        >
          <span className={disabled ? "text-muted" : undefined}>
            <SlotText
              text={value.toLocaleString("en-US")}
              options={{
                direction,
                duration: 180,
                stagger: 24,
                // No bounce: the default springy overshoot stacks two half
                // digits in a cell mid-roll, which reads as a broken number.
                bounce: 0,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            />
          </span>
        </button>
      )}
      {!disabled && (
        <InputGroupSuffix className="flex items-center px-1">
          {holdButton(1, <PlusIcon size={12} />)}
        </InputGroupSuffix>
      )}
    </InputGroupRoot>
  );
}

/** EXP stepper drawn over a progress bar filled in the given accent; shared
 *  by the Player tab and Yo-kai so both edit level progress the same way. At the
 *  level cap the bar locks and shows MAX (the game stores EXP as 0 there).
 *  Stepping past the last point of a level carries into the next level when
 *  the caller supplies `onLevelUp`; stepping down from 0 EXP carries into the
 *  previous one via `onLevelDown`. */
export function ExpStepper({
  xp,
  toNext,
  maxed,
  accent = "#3e63dd",
  onCommit,
  onLevelUp,
  onLevelDown,
  disabled = false,
}: {
  xp: number;
  /** EXP needed to clear the current level (the stepper's max). */
  toNext: number;
  /** At the level cap: bar hidden, stepper locked at 0. */
  maxed: boolean;
  accent?: string;
  onCommit: (v: number) => void;
  /** Carry the stepper's + past the level's last point into the next level. */
  onLevelUp?: () => void;
  /** Carry the stepper's − at 0 EXP into the previous level. */
  onLevelDown?: () => void;
  /** Locked entirely (e.g. a character not in the party yet): no bar. */
  disabled?: boolean;
}) {
  return (
    <div
      className="relative flex h-[36px] min-w-0 items-center overflow-hidden"
      style={{
        background: "#1c1c20",
        border: "1px solid rgb(255 255 255 / 0.14)",
        borderRadius: 12,
      }}
    >
      {!maxed && !disabled && (
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${Math.min(100, (xp / toNext) * 100)}%`,
            background: `linear-gradient(180deg, ${accent}59, ${accent}14)`,
            borderRadius: 12,
            transition: "width 450ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}
      {maxed && !disabled && (
        <span className="absolute right-2 z-20 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
          Max
        </span>
      )}
      <RollStepper
        bare
        disabled={maxed || disabled}
        className="relative z-10 min-w-0 flex-1"
        value={maxed ? 0 : xp}
        step={1}
        max={toNext}
        ariaLabel="EXP"
        onCommit={onCommit}
        onOverflow={maxed ? undefined : onLevelUp}
        onUnderflow={onLevelDown}
      />
    </div>
  );
}

/** Minimal overlay-state object satisfying HeroUI's Modal `state` prop. */
export function useOverlayState(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  return useMemo(
    () => ({
      isOpen,
      setOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
    }),
    [isOpen],
  );
}

const ERROR_RING = "border-danger focus:border-danger";

/**
 * Text field for in-game names: commits every input that fits both the game's
 * character limit and the slot's byte budget (names are UTF-8 in the save, so
 * multibyte characters count against the budget), and flags overlong input
 * inline without writing it. Only text typed here is flagged, so a name the
 * save already holds is never shown as an error.
 */
export function NameField({
  label,
  value,
  maxBytes,
  maxChars,
  onCommit,
  className = "w-full",
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  maxBytes: number;
  /** The game's own naming limit, in characters. */
  maxChars?: number;
  onCommit: (v: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value;
  const sizeOf = (v: string) => ({
    bytes: new TextEncoder().encode(v).length,
    chars: [...v].length,
  });
  const fits = (v: string) => {
    const { bytes, chars } = sizeOf(v);
    return bytes <= maxBytes && (maxChars === undefined || chars <= maxChars);
  };
  const { bytes, chars } = sizeOf(shown);
  const invalid = text !== null && !fits(text);

  return (
    <div className="min-w-0 flex-1">
      <Input
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={`${className} ${invalid ? ERROR_RING : ""}`}
        value={shown}
        disabled={disabled}
        placeholder={placeholder}
        title={
          maxChars === undefined ? `Max ${maxBytes} bytes (UTF-8)` : `Max ${maxChars} characters`
        }
        onChange={(e) => {
          setText(e.target.value);
          if (fits(e.target.value)) onCommit(e.target.value);
        }}
        onBlur={() => setText(null)}
      />
      {invalid && (
        <p className="mt-0.5 text-xs text-danger">
          {maxChars !== undefined && chars > maxChars
            ? `${chars}/${maxChars} characters, ${chars - maxChars} too many.`
            : `${bytes}/${maxBytes} bytes, ${bytes - maxBytes} too many. Some characters count as more than one.`}
        </p>
      )}
    </div>
  );
}

/** Inline label + control row used across the panels. */
export function LabeledHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="w-[4.5rem] shrink-0 whitespace-nowrap">{label}</span>
      {children}
    </label>
  );
}

/** Run a removal and offer a real Undo: the toast restores the exact bytes
 *  from just before the removal (removals only rewrite bytes in place). */
export function removeWithUndo(
  parsed: { data: Uint8Array },
  message: string,
  apply: () => void,
  refresh: () => void,
): void {
  const snapshot = parsed.data.slice();
  apply();
  refresh();
  toast.success(message, {
    actionProps: {
      children: "Undo",
      onPress: () => {
        parsed.data.set(snapshot);
        refresh();
      },
    },
  });
}

/** Compact section switcher that sits inside a toolbar row (so a tab needs
 *  one row of chrome, not a tab bar plus a toolbar). */
export function SubTabs({
  label,
  value,
  onChange,
  tabs,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  tabs: { id: string; label: string; count?: number }[];
  /** Show the state only: the pills can't be clicked, a separate control
   *  changes the selection. */
  readOnly?: boolean;
}) {
  return (
    <Tabs
      aria-label={label}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      className={`w-auto shrink-0 self-start ${readOnly ? "pointer-events-none select-none" : ""}`}
    >
      <Tabs.ListContainer>
        <Tabs.List>
          {tabs.map((t) => (
            <Tabs.Tab key={t.id} id={t.id} className="whitespace-nowrap">
              <Tabs.Indicator />
              {t.label}
              {t.count !== undefined && (
                <span className="ml-2 rounded-full bg-foreground/10 px-1.5 text-[11px] font-medium tabular-nums">
                  {t.count}
                </span>
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}

/** The shared section panel: a bordered card with a small uppercase title,
 *  used by every tab so spacing and grouping look the same everywhere. */
export function Tile({
  title,
  icon,
  aside,
  children,
  className,
}: {
  title?: string;
  icon?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex min-h-0 flex-1 flex-col p-0 ${className ?? ""}`}>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3.5 @container">
        {(title || icon || aside) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {icon && <GameIcon folder="Items" name={icon} className="size-5 object-contain" />}
            {title}
            {aside && (
              <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap font-normal normal-case tracking-normal">
                {aside}
              </span>
            )}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/** "Are you sure?" dialog for removals that are hard to take back. Mounted
 *  only while open, like the app's other dialogs: closing unmounts it. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Keep",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const state = useMemo(
    () => ({
      isOpen: true,
      setOpen: (open: boolean) => {
        if (!open) onCancel();
      },
      open: () => {},
      close: onCancel,
      toggle: () => {},
    }),
    [onCancel],
  );
  return (
    <Modal state={state}>
      <Modal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <Modal.Container className="pointer-events-auto w-full max-w-md">
          <Modal.Dialog aria-label={title}>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted">{body}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant="danger" onPress={onConfirm}>
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ── Art preloading ──────────────────────────────────────────────────────── */

// Held for the page's lifetime so the browser keeps the decoded sheets.
const preloadedImages: HTMLImageElement[] = [];

function preloadImage(url: string): void {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  preloadedImages.push(img);
}

function preloadSheets(folders: string[]): void {
  for (const folder of folders) {
    void loadManifest(folder).then((m) => {
      for (const page of m?.pages ?? []) preloadImage(sheetUrl(folder, page.file));
    });
  }
}

/** Start fetching the game art as soon as the app loads, while the person is
 *  still on the drop screen, so icons are already there when the editor opens
 *  instead of popping in tab by tab. The equipment sheet (the biggest, and only
 *  needed on one Inventory tab) waits for an idle moment. */
export function preloadArt(): void {
  preloadSheets(["Yokai", "Items", "Tribes"]);
  preloadImage(PLAYER_VARIANTS["2x"].url);
  loadPlayerManifest().catch(() => {});
  const idle: (cb: () => void) => void =
    "requestIdleCallback" in window
      ? (cb) => window.requestIdleCallback(cb)
      : (cb) => window.setTimeout(cb, 1500);
  idle(() => preloadSheets(["Equipments"]));
}

/** One color per base stat for the detail-pane bars. */
export const STAT_COLORS: Record<StatKey, string> = {
  hp: "#ef647f",
  str: "#f0994d",
  spr: "#a98bf0",
  def: "#5fa8e8",
  res: "#55c496",
  yp: "#e6c94f",
};
