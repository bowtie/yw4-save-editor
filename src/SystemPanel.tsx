/** System tab: graphics, camera, audio and interface options from the
 *  SYSTEM save's CSystemSaveData record. Values write in place (same byte
 *  lengths); ranges marked unconfirmed come from storage bounds plus
 *  observed values, not from decompiled menu code. */
import { useState } from "react";
import { Button, Card, CardContent, ScrollShadow } from "@heroui/react";
import {
  readSystemSettings,
  writeSystemSetting,
  SYSTEM_SETTINGS,
  type SystemSettingDef,
  type SystemSettings,
} from "./lib/system-settings";
import type { ParsedSave } from "./lib/save-format";
import { ValidatedNumber } from "./ui";
import { DownloadIcon } from "./icons";

const GROUP_LABELS: Record<SystemSettingDef["group"], string> = {
  graphics: "Graphics",
  camera: "Camera",
  audio: "Audio",
  interface: "Interface",
};

function SettingRow({
  settings,
  def,
  parsed,
  onEdited,
}: {
  settings: SystemSettings;
  def: SystemSettingDef;
  parsed: ParsedSave;
  onEdited: () => void;
}) {
  const entry = settings.byName.get(def.name);
  if (!entry) {
    // The game omits fields it has never written; don't invent slots.
    return null;
  }
  const cap = Math.min(def.max, entry.byteLength === 1 ? 0xff : 0xffff);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 hover:bg-surface-hover">
      <span
        className={`min-w-0 flex-1 truncate text-sm ${def.hiddenInMenu ? "italic" : ""}`}
        title={
          def.hiddenInMenu
            ? `${def.name} (the game writes this but hides it from its options menu)`
            : def.name
        }
      >
        {def.label}
        {def.hiddenInMenu && <span className="ml-1.5 text-xs text-muted">·hidden</span>}
      </span>
      {/* Labels covering the full range render as a select; anything wider
          (or unconfirmed) stays a validated number field. */}
      {def.labels && def.labels.length - 1 >= cap ? (
        <select
          aria-label={def.label}
          className="min-w-0 shrink-0 rounded-xl border border-border-secondary bg-field px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          value={String(entry.value)}
          onChange={(e) => {
            writeSystemSetting(parsed, entry, Number(e.target.value));
            onEdited();
          }}
        >
          {def.labels.map((label, v) => (
            <option key={v} value={String(v)}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <ValidatedNumber
          ariaLabel={def.label}
          className={`shrink-0 text-sm ${def.labels ? "w-20" : "w-24"} font-mono`}
          value={entry.value}
          min={def.min}
          max={cap}
          onCommit={(v) => {
            writeSystemSetting(parsed, entry, v);
            onEdited();
          }}
        />
      )}
    </div>
  );
}

export function SystemPanel({
  parsed,
  onRequestDownload,
}: {
  parsed: ParsedSave;
  onRequestDownload: () => void;
}) {
  const [settings, setSettings] = useState(() => readSystemSettings(parsed));
  const rerender = () => setSettings(readSystemSettings(parsed));

  const groups = SYSTEM_SETTINGS.map((d) => d.group);
  const groupOrder = [...new Set(groups)];
  const present = new Set(settings.entries.map((e) => e.def.name));

  return (
    <div className="@container flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        {groupOrder.map((group) => {
          const defs = SYSTEM_SETTINGS.filter((d) => d.group === group);
          if (!defs.some((d) => present.has(d.name))) return null;
          return (
            <Card key={group}>
              <CardContent className="flex flex-col gap-2 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {GROUP_LABELS[group]}
                </p>
                <ScrollShadow className="flex flex-col gap-0.5">
                  {defs.map((d) => (
                    <SettingRow
                      key={d.name}
                      settings={settings}
                      def={d}
                      parsed={parsed}
                      onEdited={rerender}
                    />
                  ))}
                </ScrollShadow>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Values write into the SYSTEM save's options record in place. Ranges marked selectable are as
        the game stores them; numeric bounds without labels are storage-derived and may be wider
        than the in-game menu allows. Engine-only extras (SSR sample counts, TAA/FXAA tuning, HDR
        tonemap) live in game data, not in the save.
      </p>

      <div className="flex justify-end">
        <Button size="sm" variant="primary" onPress={onRequestDownload}>
          <DownloadIcon size={15} /> Download SYSTEM save
        </Button>
      </div>
    </div>
  );
}
