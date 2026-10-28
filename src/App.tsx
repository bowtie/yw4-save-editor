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

interface EditableSave {
  platform: "switch" | "ps4";
  slot: string;
  fileName: string;
  file: File;
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
  const [notes, setNotes] = useState<string[]>([]);
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

  const handleFiles = useCallback(async (dropped: DroppedFile[]) => {
    const { switchSlots, ps4Slots, notes: foundNotes } = classifyAll(dropped);
    const notes = [...foundNotes];
    if (!switchSlots.USERDATA00 && !ps4Slots.USERDATA00) {
      // Bare data.bin drops carry no slot folder name; sniff the contents.
      const sniffed = await sniffDataBinSlots(dropped);
      Object.assign(switchSlots, sniffed);
      if (switchSlots.USERDATA00) {
        notes.push("data.bin identified by its contents (no slot folder name).");
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
            notes.push(`${save.fileName} looks like a ${side === "ps4" ? "PS4" : "Switch"} save.`);
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
    void loadSave(found[0]);
  }, []);

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
    if (!saveFile || !data) return;
    const blob = new Blob([data.slice().buffer as ArrayBuffer], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = saveFile.fileName;
    a.click();
    URL.revokeObjectURL(url);
    confirmState.close();
    toast.success(`Saved ${saveFile.fileName} to your downloads.`, {
      description: "Copy it back into your save folder (keep a backup of the original).",
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center gap-4">
        <img src={WATCH_UP_ICON} alt="" className="size-12 shrink-0 object-contain" />
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          Yo-kai Watch 4++ Save Editor
        </h1>
      </header>

      <main className="flex flex-col gap-4">
        {!parsed && (
          <Card>
            <CardContent className="p-3.5">
              <SaveFolderDrop onFiles={handleFiles} />
            </CardContent>
          </Card>
        )}

        {parsed && saves[selectedSave] && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-3.5">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {saves.map((save, i) => (
                    <Button
                      key={`${save.platform}-${save.slot}`}
                      size="sm"
                      variant={i === selectedSave ? "primary" : "outline"}
                      aria-label={`${save.platform === "switch" ? "Switch" : "PS4"} ${SLOT_LABELS[save.slot] ?? save.slot} (${save.fileName})`}
                      onPress={() => {
                        if (i === selectedSave) return;
                        guardDiscard({
                          title: "Switch saves and discard your edits?",
                          body: `Your unsaved edits to ${SLOT_LABELS[saves[selectedSave].slot] ?? saves[selectedSave].slot} will be lost. Download first to keep them.`,
                          confirm: "Discard and switch",
                          run: () => void onPickSave(i),
                        });
                      }}
                    >
                      {save.platform === "switch" ? "Switch" : "PS4"}{" "}
                      {SLOT_LABELS[save.slot] ?? save.slot}
                    </Button>
                  ))}
                  <PlatformBadge
                    platform={saves[selectedSave].platform}
                    size={28}
                    className="ml-auto"
                  />
                </div>
                {notes.length > 0 && (
                  <div className="flex flex-col text-xs text-muted">
                    {notes.map((note, i) => (
                      <p key={i}>{note}</p>
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
                      <Tabs.Tab key={t.id} id={t.id}>
                        <Tabs.Indicator />
                        {t.label}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
                {TABS.map((t) => (
                  <Tabs.Panel key={t.id} id={t.id}>
                    {t.id === "player" && <PlayerPanel key={version} parsed={parsed} />}
                    {t.id === "party" && <PartyPanel key={version} parsed={parsed} />}
                    {t.id === "yokai" && <YokaiPanel key={version} parsed={parsed} />}
                    {t.id === "inventory" && <InventoryPanel key={version} parsed={parsed} />}
                    {t.id === "souls" && <SoulsPanel key={version} parsed={parsed} />}
                  </Tabs.Panel>
                ))}
              </Tabs>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    guardDiscard({
                      title: "Load another save?",
                      body: "Your unsaved edits will be lost. Download first to keep them.",
                      confirm: "Discard and load another",
                      run: reset,
                    })
                  }
                >
                  Load another save
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
                  Reset edits
                </Button>
                <Button size="sm" variant="primary" onPress={requestDownload}>
                  <DownloadIcon size={15} /> Download edited save
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
        No edits detected. The download will be identical to the file you dropped in.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {changes.length} region{changes.length === 1 ? "" : "s"} changed ·{" "}
        {totalBytes.toLocaleString()} bytes total. The download contains your edits; the original
        file on disk is untouched.
      </p>
      <ScrollShadow className="max-h-64 rounded-xl border border-border bg-surface-secondary/50 p-2">
        <ul className="flex flex-col gap-1 text-sm">
          {changes.map((group, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{group.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {group.bytes} byte{group.bytes === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </ScrollShadow>
    </div>
  );
}
