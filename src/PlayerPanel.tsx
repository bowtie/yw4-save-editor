/** Player tab: wallet, crank-a-kai attempts and protagonist names. */
import { useState } from "react";
import { Card, CardContent, InputGroupInput, InputGroupRoot } from "@heroui/react";
import {
  CRANK_MAX,
  readMoneySpent,
  readPlayer,
  writeCrank,
  writeMoney,
  writeName,
} from "./lib/editor";
import type { ParsedSave } from "./lib/save-format";
import { GameIcon, NameField, Portrait, RollStepper } from "./ui";
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

const U32_MAX = 0xffffffff;

function playtime(seconds: number): string {
  return `${Math.floor(seconds / 3600)}h${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`;
}

function Tile({
  title,
  icon,
  aside,
  children,
  className,
}: {
  title: string;
  icon?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2.5 p-3.5 @container">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {icon && <GameIcon folder="Items" name={icon} className="size-5 object-contain" />}
          {title}
          {aside && (
            <span className="ml-auto flex items-center gap-1.5 font-normal normal-case tracking-normal">
              {aside}
            </span>
          )}
        </p>
        {children}
      </CardContent>
    </Card>
  );
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

export function PlayerPanel({ parsed }: { parsed: ParsedSave }) {
  const [info, setInfo] = useState(() => readPlayer(parsed));
  const [moneySpent] = useState(() => readMoneySpent(parsed));
  const bump = () => setInfo(readPlayer(parsed));

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <Tile
          title="Protagonist names"
          className="col-span-full"
          aside={
            <>
              <ClockIcon size={13} />
              Played {playtime(info.playTimeSeconds)}
            </>
          }
        >
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
            {info.names.map((name, i) => (
              <label
                key={i}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-secondary/50 p-1.5 transition-colors focus-within:border-accent hover:border-accent/50"
                title={NAME_LABELS[i] ?? `Slot ${i}`}
              >
                <Portrait name={NAME_LABELS[i] ?? ""} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-xs text-muted">{REAL_NAMES[i]}</span>
                  <NameField
                    label={NAME_LABELS[i] ?? `Name slot ${i}`}
                    value={name}
                    maxBytes={36}
                    onCommit={(v) => {
                      writeName(parsed, i, v);
                      bump();
                    }}
                  />
                </div>
              </label>
            ))}
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
                readOnly
                type="text"
                className="w-0 min-w-0 flex-1 text-right font-mono"
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
