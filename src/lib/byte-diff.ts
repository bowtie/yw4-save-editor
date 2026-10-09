/**
 * Byte-level diff between two buffers — the basis of the download diff
 * preview and the edit-isolation tests. The editor mutates its parsed copy
 * in place, so "what will change in the user's save" is exactly the byte
 * difference against the file as it was loaded.
 */

export interface ByteRange {
  /** Inclusive start offset. */
  start: number;
  /** Exclusive end offset. */
  end: number;
}

export interface ByteDiff {
  ranges: ByteRange[];
  /** Total differing bytes across all ranges. */
  changed: number;
  /** True when the two buffers have the same length. */
  sameLength: boolean;
}

/** Ranges of differing bytes between `a` and `b` (contiguous differing runs are merged). */
export function diffByteRanges(a: Uint8Array, b: Uint8Array): ByteDiff {
  const n = Math.min(a.length, b.length);
  const ranges: ByteRange[] = [];
  let changed = 0;
  let i = 0;
  while (i < n) {
    if (a[i] !== b[i]) {
      const start = i;
      while (i < n && a[i] !== b[i]) i++;
      ranges.push({ start, end: i });
      changed += i - start;
    } else {
      i++;
    }
  }
  return { ranges, changed, sameLength: a.length === b.length };
}

/** True when every byte of `within` [start, end) is covered by `ranges`. */
export function fullyCovered(ranges: ByteRange[], start: number, end: number): boolean {
  let at = start;
  for (const r of ranges) {
    if (r.start > at) return false; // gap before this range
    at = Math.max(at, r.end);
    if (at >= end) return true;
  }
  return at >= end;
}
