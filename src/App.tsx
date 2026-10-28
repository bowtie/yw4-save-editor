/** The editor app: masthead, drop card, save-slot picker, tabs, panels.
 *
 *  All edits happen on the parsed copy held in memory; the file on disk is
 *  never touched, and edits leave through an explicit download that first
 *  shows exactly which byte regions changed.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, Modal, ScrollShadow, Tabs, toast } from "@heroui/react";
import { SaveFolderDrop } from "./dropzone";
import { PlayerPanel } from "./PlayerPanel";
import { InventoryPanel } from "./InventoryPanel";
import { SoulsPanel } from "./SoulsPanel";
import { PartyPanel } from "./PartyPanel";
import { YokaiPanel } from "./YokaiPanel";
import { DownloadIcon } from "./icons";
import { useOverlayState } from "./ui";
import { WATCH_UP_ICON } from "./dropzone";
import { PlatformBadge } from "./platforms";
import { classifyAll, sniffDataBinSlots, type DroppedFile } from "./lib/file-selection";
import { detectSide, parseSave, type ParsedSave } from "./lib/save-format";
import { assertEditableLayout } from "./lib/validate";
import { describeChanges, type ChangeGroup } from "./lib/change-report";
import { makeZip } from "./lib/zip";
import { summarizeEdits } from "./lib/edit-summary";

interface EditableSave {
  platform: "switch" | "ps4";
  slot: string;
  fileName: string;
  file: File;
  /** Slot inferred from the file contents, not from a folder name. */
  guessed?: boolean;
}

/** A pending action that would throw away unsaved edits, plus its prompt. */
interface PendingDiscard {
  title: string;
  body: string;
  confirm: string;
  run: () => void;
}

type TabId = "player" | "party" | "yokai" | "inventory" | "souls";

const TABS: { id: TabId; label: string }[] = [
  { id: "player", label: "Player" },
  { id: "party", label: "Characters" },
  { id: "yokai", label: "Yo-kai" },
  { id: "inventory", label: "Inventory" },
  { id: "souls", label: "Souls" },
];

export default function Editor() {
  const [saves, setSaves] = useState<EditableSave[]>([]);
  const [notes, setNotes] = useState<{ text: string; warn?: boolean }[]>([]);
  const [selectedSave, setSelectedSave] = useState(0);
  const [parsed, setParsed] = useState<ParsedSave | null>(null);
  const [tab, setTab] = useState<TabId>("player");
  const [version, setVersion] = useState(0); // bumped after every load
  const [changes, setChanges] = useState<ChangeGroup[] | null>(null);
  const confirmState = useOverlayState();
  /** "Discard unsaved edits?" prompt; holds the action it guards. */
  const discardState = useOverlayState();
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null);
  /** Bytes exactly as loaded — the diff baseline for the download preview. */
  const originalRef = useRef<Uint8Array | null>(null);
  /** The two real saves; HEADERSAVE and SYSTEM (options) are not edited. */
  const SLOT_LABELS: Record<string, string> = {
    USERDATA00: "User Save",
    AUTOSAVE: "Auto Save",
  };

  /** "Switch · User Save", marked when the slot was guessed from contents. */
  const slotTitle = (save: EditableSave) =>
    `${save.platform === "switch" ? "Switch" : "PS4"} · ${SLOT_LABELS[save.slot] ?? save.slot}${save.guessed ? " (detected)" : ""}`;

  const [loading, setLoading] = useState(false);

  const handleFiles = useCallback(async (dropped: DroppedFile[]) => {
    setLoading(true);
    try {
      await readDropped(dropped);
    } finally {
      setLoading(false);
    }
  }, []);

  const readDropped = async (dropped: DroppedFile[]) => {
    const { switchSlots, ps4Slots, notes: foundNotes } = classifyAll(dropped);
    const notes: { text: string; warn?: boolean }[] = foundNotes.map((text) => ({ text }));
    const guessedSlots = new Set<string>();
    if (!switchSlots.USERDATA00 && !ps4Slots.USERDATA00) {
      // Bare data.bin drops carry no slot folder name; sniff the contents.
      const sniffed = await sniffDataBinSlots(dropped);
      Object.assign(switchSlots, sniffed);
      for (const slot of Object.keys(sniffed)) {
        if (!SLOT_LABELS[slot]) continue;
        guessedSlots.add(slot);
        notes.push({
          text: `No slot folder name, so this was identified as ${SLOT_LABELS[slot]} from its contents.`,
        });
      }
    }

    const found: EditableSave[] = [];
    for (const [slot, entry] of Object.entries(switchSlots)) {
      if (SLOT_LABELS[slot] && entry) {
        found.push({
          platform: "switch",
          slot,
          fileName: entry.file.name,
          file: entry.file,
          guessed: guessedSlots.has(slot),
        });
      }
    }
    for (const [slot, entry] of Object.entries(ps4Slots)) {
      if (SLOT_LABELS[slot] && entry) {
        found.push({
          platform: "ps4",
          slot,
          fileName: entry.file.name,
          file: entry.file,
        });
      }
    }
    if (found.length === 0) {
      toast.danger("No editable save found", {
        description: "Drop a save folder with USERDATA00/data.bin, or a PS4 savedata folder.",
      });
      return;
    }

    // Flag files whose contents disagree with the folder they came from.
    await Promise.all(
      found.map(async (save) => {
        try {
          const parsed = parseSave(new Uint8Array(await save.file.arrayBuffer()));
          const side = detectSide(parsed);
          if (side && side !== save.platform) {
            const sideName = side === "ps4" ? "PS4" : "Switch";
            if (save.guessed) {
              // No folder to go by: the file's own layout is the best evidence.
              save.platform = side;
            } else {
              notes.push({
                text: `${save.fileName} sits in a ${save.platform === "ps4" ? "PS4" : "Switch"} folder but its contents look like a ${sideName} save.`,
                warn: true,
              });
            }
          }
        } catch {
          /* unreadable: loadSave reports it when the slot is opened */
        }
      }),
    );

    // The manual save is what people come to edit: list it first and open it
    // by default (stable sort keeps Switch/PS4 order within each slot).
    found.sort((a, b) => Number(b.slot === "USERDATA00") - Number(a.slot === "USERDATA00"));
    setSaves([...found]);
    setNotes(notes);
    setSelectedSave(0);
    await loadSave(found[0]);
  };

  const loadSave = async (save: EditableSave | undefined, { keepTab = false } = {}) => {
    if (!save) return;
    try {
      const data = new Uint8Array(await save.file.arrayBuffer());
      const next = parseSave(data);
      // Refuse unsupported layouts before any panel can write to them.
      assertEditableLayout(next);
      originalRef.current = data.slice();
      setParsed(next);
      if (!keepTab) setTab("player");
      setVersion((v) => v + 1);
    } catch (err) {
      setParsed(null);
      originalRef.current = null;
      toast.danger(`Could not open save: ${(err as Error).message}`);
    }
  };

  const onPickSave = async (index: number) => {
    setSelectedSave(index);
    await loadSave(saves[index]);
  };

  /** Re-read the dropped file, dropping every edit. */
  const resetEdits = () => {
    void loadSave(saves[selectedSave], { keepTab: true });
  };

  const reset = () => {
    setSaves([]);
    setNotes([]);
    setSelectedSave(0);
    setParsed(null);
    originalRef.current = null;
    setChanges(null);
  };

  const hasEdits = (): boolean => {
    const differs = (a: Uint8Array | null, b: Uint8Array | null) => {
      if (!a || !b || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
      return false;
    };
    return differs(originalRef.current, parsed?.data ?? null);
  };

  /** Run an action that throws away the in-memory edits, asking first when
   *  there are any (no edits: runs straight away). */
  const guardDiscard = (action: PendingDiscard) => {
    if (!hasEdits()) {
      action.run();
      return;
    }
    setPendingDiscard(action);
    discardState.open();
  };

  // Panels edit parsed.data in place without telling the app, so watch the
  // bytes to drive the unsaved-changes indicator and the Download button.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setDirty(hasEdits()), 400);
    setDirty(hasEdits());
    return () => window.clearInterval(id);
  });

  // Closing the tab with unsaved edits silently discards them — intervene.
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (hasEdits()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  });

  /** Open the diff preview; the modal's confirm button performs the download. */
  const requestDownload = () => {
    if (!parsed || !originalRef.current) return;
    setChanges(describeChanges(parsed, originalRef.current));
    confirmState.open();
  };

  const download = () => {
    const saveFile = saves[selectedSave];
    const data = parsed?.data;
    const original = originalRef.current;
    if (!saveFile || !data || !original) return;
    // Ship the untouched original beside the edit, so a backup always exists
    // and the edited file can't silently overwrite the only copy.
    const zip = makeZip([
      { name: `edited/${saveFile.fileName}`, data },
      { name: `original-backup/${saveFile.fileName}`, data: original },
    ]);
    const blob = new Blob([zip.slice().buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yw4-save-edited.zip";
    a.click();
    URL.revokeObjectURL(url);
    confirmState.close();
    toast.success("Downloaded yw4-save-edited.zip", {
      description: `Copy edited/${saveFile.fileName} into your save folder. original-backup/ holds your untouched file.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
      <header className="mb-4 flex items-center gap-3 sm:mb-6 sm:gap-4">
        <img src={WATCH_UP_ICON} alt="" className="size-10 shrink-0 object-contain sm:size-12" />
        <h1 className="text-xl font-bold sm:text-2xl leading-tight tracking-tight">
          Yo-kai Watch 4++ Save Editor
        </h1>
      </header>

      <main className="flex flex-col gap-4">
        {!parsed && (
          <Card className="p-0">
            <CardContent className="p-3 sm:p-3.5">
              <SaveFolderDrop onFiles={handleFiles} busy={loading} />
            </CardContent>
          </Card>
        )}

        {parsed && saves[selectedSave] && (
          <Card className="p-0">
            <CardContent className="flex flex-col gap-3 p-3 sm:p-3.5">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {saves.length === 1 ? (
                    <span className="rounded-lg bg-surface-secondary px-3 py-1 text-sm font-medium">
                      {slotTitle(saves[0])}
                    </span>
                  ) : (
                    saves.map((save, i) => (
                      <Button
                        key={`${save.platform}-${save.slot}`}
                        size="sm"
                        variant={i === selectedSave ? "primary" : "outline"}
                        aria-label={`${slotTitle(save)} (${save.fileName})`}
                        onPress={() => {
                          if (i === selectedSave) return;
                          guardDiscard({
                            title: "Switch saves and discard your edits?",
                            body: `Your edits to ${SLOT_LABELS[saves[selectedSave].slot] ?? saves[selectedSave].slot} will be lost. Download first to keep them.`,
                            confirm: "Discard and switch",
                            run: () => void onPickSave(i),
                          });
                        }}
                      >
                        {slotTitle(save)}
                      </Button>
                    ))
                  )}
                  <PlatformBadge
                    platform={saves[selectedSave].platform}
                    size={28}
                    className="ml-auto"
                  />
                </div>
                {notes.length > 0 && (
                  <div className="flex flex-col gap-0.5 text-xs">
                    {notes.map((note, i) => (
                      <p key={i} className={note.warn ? "text-warning" : "text-muted"}>
                        {note.warn ? "⚠ " : ""}
                        {note.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <Tabs
                selectedKey={tab}
                onSelectionChange={(key) => setTab(key as TabId)}
                aria-label="Editor sections"
              >
                <Tabs.ListContainer>
                  <Tabs.List>
                    {TABS.map((t) => (
                      <Tabs.Tab
                        key={t.id}
                        id={t.id}
                        className="whitespace-nowrap px-2 text-[13px] sm:px-3 sm:text-sm"
                      >
                        <Tabs.Indicator />
                        {t.label}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
                {TABS.map((t) => (
                  <Tabs.Panel key={t.id} id={t.id} className="p-0 pt-3">
                    {t.id === "player" && <PlayerPanel key={version} parsed={parsed} />}
                    {t.id === "party" && <PartyPanel key={version} parsed={parsed} />}
                    {t.id === "yokai" && <YokaiPanel key={version} parsed={parsed} />}
                    {t.id === "inventory" && <InventoryPanel key={version} parsed={parsed} />}
                    {t.id === "souls" && <SoulsPanel key={version} parsed={parsed} />}
                  </Tabs.Panel>
                ))}
              </Tabs>

              <div className="sticky bottom-2 z-20 flex items-center justify-end gap-1 rounded-xl border border-border bg-surface/90 p-2 shadow-lg backdrop-blur">
                <span
                  role="status"
                  className="mr-auto flex items-center gap-2 pl-1 text-xs text-muted"
                  aria-label={dirty ? "Edited, not downloaded yet" : "No edits yet"}
                >
                  <span
                    className={`size-2 rounded-full ${dirty ? "bg-warning" : "bg-border-secondary"}`}
                  />
                  <span className="hidden sm:inline">
                    {dirty ? "Edited · not downloaded yet" : "No edits yet"}
                  </span>
                  {dirty && <span className="sm:hidden">Edited</span>}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    guardDiscard({
                      title: "Load another save?",
                      body: "Your edits will be lost. Download first to keep them.",
                      confirm: "Discard and load another",
                      run: reset,
                    })
                  }
                >
                  <span className="hidden sm:inline">Load another save</span>
                  <span className="sm:hidden">Load</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Discard all edits and re-read the dropped save"
                  onPress={() =>
                    guardDiscard({
                      title: "Reset all edits?",
                      body: "Every change on every tab goes back to the file you dropped in.",
                      confirm: "Reset edits",
                      run: resetEdits,
                    })
                  }
                >
                  <span className="hidden sm:inline">Reset edits</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
                <Button size="sm" variant="primary" isDisabled={!dirty} onPress={requestDownload}>
                  <DownloadIcon size={15} />
                  <span className="hidden sm:inline">Download edited save</span>
                  <span className="sm:hidden">Download</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Mounted only while open: HeroUI's DialogTrigger ignores programmatic
          isOpen flips after mount, so closing must unmount the overlay. */}
      {confirmState.isOpen && (
        <Modal state={confirmState}>
          <Modal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Modal.Container className="pointer-events-auto flex max-h-[85vh] w-full max-w-lg min-h-0 flex-col">
              <Modal.Dialog
                aria-label="Review changes before download"
                className="flex min-h-0 flex-col"
              >
                <Modal.Header>
                  <Modal.Heading>Review changes</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="min-h-0 overflow-y-auto">
                  <DownloadPreview
                    parsed={parsed}
                    original={originalRef.current}
                    changes={changes}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button size="sm" variant="ghost" onPress={confirmState.close}>
                    Keep editing
                  </Button>
                  <Button size="sm" variant="primary" onPress={download}>
                    <DownloadIcon size={15} /> Download
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {discardState.isOpen && pendingDiscard && (
        <Modal state={discardState}>
          <Modal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <Modal.Container className="pointer-events-auto w-full max-w-md">
              <Modal.Dialog aria-label={pendingDiscard.title}>
                <Modal.Header>
                  <Modal.Heading>{pendingDiscard.title}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm text-muted">{pendingDiscard.body}</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button size="sm" variant="ghost" onPress={discardState.close}>
                    Keep editing
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={() => {
                      discardState.close();
                      pendingDiscard.run();
                    }}
                  >
                    {pendingDiscard.confirm}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}

function DownloadPreview({
  parsed,
  original,
  changes,
}: {
  parsed: ParsedSave | null;
  original: Uint8Array | null;
  changes: ChangeGroup[] | null;
}) {
  if (!parsed || !original || !changes) return null;
  const totalBytes = changes.reduce((n, g) => n + g.bytes, 0);
  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted">
        No edits detected. The edited save in the zip will be identical to the file you dropped in.
      </p>
    );
  }
  const summary = summarizeEdits(original, parsed);
  return (
    <div className="flex flex-col gap-3">
      {summary.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {summary.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-accent">
                •
              </span>
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        The zip contains your edited save plus an untouched copy of the original as a backup; the
        file on disk is never modified.
      </p>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">
          Technical detail: {changes.length} byte region{changes.length === 1 ? "" : "s"} ·{" "}
          {totalBytes.toLocaleString()} bytes
        </summary>
        <ScrollShadow className="mt-2 max-h-48 rounded-xl border border-border bg-surface-secondary/50 p-2">
          <ul className="flex flex-col gap-1">
            {changes.map((group, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{group.label}</span>
                <span className="shrink-0 font-mono">
                  {group.bytes} byte{group.bytes === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </ScrollShadow>
      </details>
    </div>
  );
}
