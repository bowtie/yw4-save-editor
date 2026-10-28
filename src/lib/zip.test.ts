import { describe, expect, it } from "vitest";
import { crc32Bytes, makeZip } from "./zip";

describe("zip writer", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32Bytes(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a readable store-only archive", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([9, 8]);
    const zip = makeZip([
      { name: "edited/data.bin", data: a },
      { name: "original-backup/data.bin", data: b },
    ]);
    const v = new DataView(zip.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    // end-of-central-directory record: signature, 2 entries
    const eocd = zip.length - 22;
    expect(v.getUint32(eocd, true)).toBe(0x06054b50);
    expect(v.getUint16(eocd + 10, true)).toBe(2);
    // the central directory starts where the EOCD says, and holds the CRC
    const cdOffset = v.getUint32(eocd + 16, true);
    expect(v.getUint32(cdOffset, true)).toBe(0x02014b50);
    expect(v.getUint32(cdOffset + 16, true)).toBe(crc32Bytes(a));
    // stored payload sits right after the first local header
    const nameLen = "edited/data.bin".length;
    expect(Array.from(zip.slice(30 + nameLen, 30 + nameLen + 3))).toEqual([1, 2, 3]);
  });
});
