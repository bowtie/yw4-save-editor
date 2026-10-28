/** Save-folder drop zone: drag-and-drop or click-to-browse.
 *
 * Browsers only populate `webkitRelativePath` for the click-to-browse folder
 * input, never for dropped files — and Switch saves (USERDATA00/data.bin)
 * can't be identified without their folder path. So dropped directories are
 * traversed manually through the entries API.
 */
import { useRef, useState, type DragEvent } from "react";
import type { DroppedFile } from "./lib/file-selection";
import { PlatformBadge } from "./platforms";

/** Watchface-with-arrow app icon, cropped from the game's icon_app atlas. */
export const WATCH_UP_ICON = new URL("icons/watch-up.webp", document.baseURI).href;

// readEntries returns at most 100 entries per call; loop until it comes back empty.
async function collectEntry(
  entry: FileSystemEntry,
  dir: string,
  out: DroppedFile[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    out.push({ file, relativePath: dir + entry.name });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children: FileSystemEntry[] = [];
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      children.push(...batch);
    }
    for (const child of children) await collectEntry(child, `${dir}${entry.name}/`, out);
  }
}

export function SaveFolderDrop({
  onFiles,
  busy = false,
}: {
  onFiles: (files: DroppedFile[]) => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const dt = event.dataTransfer;
    if (!dt) return;

    // Rebuild the folder structure the browser flattens away.
    const entries = Array.from(dt.items ?? [])
      .map((item) => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => entry !== null);

    if (entries.length > 0) {
      const files: DroppedFile[] = [];
      try {
        for (const entry of entries) await collectEntry(entry, "", files);
      } catch {
        /* unreadable entry: keep whatever was collected */
      }
      if (files.length > 0) onFiles(files);
    } else {
      // Plain files (no directory structure to recover).
      const files = Array.from(dt.files).map((file) => ({
        file,
        relativePath: file.name,
      }));
      if (files.length > 0) onFiles(files);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop or pick your save folder"
      aria-busy={busy}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center sm:p-8 transition-colors ${
        over ? "border-accent bg-accent-soft/20" : "border-border-secondary hover:border-accent/60"
      }`}
    >
      <img src={WATCH_UP_ICON} alt="" className="mx-auto mb-3 size-14 object-contain" />
      <p className="font-semibold">Drop your save folder here</p>
      <p className="mt-1 text-sm text-muted">
        One folder is enough. The platform is detected automatically. Your download includes a
        backup of the original.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
          <PlatformBadge platform="switch" size={26} /> Nintendo Switch
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
          <PlatformBadge platform="ps4" size={26} /> PlayStation 4
        </span>
      </div>
      <span className="mt-4 inline-block text-sm text-accent" role={busy ? "status" : undefined}>
        {busy ? "Reading save…" : "Browse folder…"}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).map((file) => ({
            file,
            relativePath: file.webkitRelativePath || file.name,
          }));
          if (files.length > 0) onFiles(files);
          e.target.value = ""; // let the same folder be picked again after an edit
        }}
      />
    </div>
  );
}
