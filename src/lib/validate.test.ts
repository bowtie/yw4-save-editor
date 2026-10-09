import { describe, expect, it } from "vitest";
import { parseSave, type ParsedSave, type Yw4Section } from "./save-format";
import { buildSkeleton } from "./test-skeleton";
import { assertEditableLayout } from "./validate";

const switchSave = () => parseSave(buildSkeleton("switch"));
const ps4Save = () => parseSave(buildSkeleton("ps4"));

/** Clone a parsed save, dropping/altering structure without touching bytes. */
function withSections(parsed: ParsedSave, mutate: (s: Yw4Section[]) => void): ParsedSave {
  const sections = parsed.sections.map((s) => ({ ...s, records: [...s.records] }));
  mutate(sections);
  return { data: parsed.data, sections };
}

describe("editable-layout gate", () => {
  it("accepts switch and ps4 skeletons", () => {
    expect(() => assertEditableLayout(switchSave())).not.toThrow();
    expect(() => assertEditableLayout(ps4Save())).not.toThrow();
  });

  it("rejects single-section files (HEADERSAVE-style)", () => {
    const parsed = switchSave();
    expect(() => assertEditableLayout(withSections(parsed, (s) => s.splice(1)))).toThrow(
      /too few sections/,
    );
  });

  it("rejects wrong section types", () => {
    const parsed = switchSave();
    expect(() =>
      assertEditableLayout(withSections(parsed, (s) => void (s[0].type = 0x1007))),
    ).toThrow(/Unexpected section layout/);
  });

  it("rejects wrong section idents", () => {
    const parsed = switchSave();
    expect(() =>
      assertEditableLayout(withSections(parsed, (s) => void (s[2].ident = 0x12345678))),
    ).toThrow(/Unexpected section idents/);
  });

  it("rejects a different game version's data-region size", () => {
    const parsed = switchSave();
    // Simulate a future version with 4096 extra bytes of bulk data.
    const bigger = { data: new Uint8Array(parsed.data.length + 4096), sections: parsed.sections };
    bigger.data.set(parsed.data);
    expect(() => assertEditableLayout(bigger)).toThrow(/Unsupported save version/);
    expect(() => assertEditableLayout(bigger)).toThrow(/1011312/);
  });

  it("rejects truncated saves", () => {
    const parsed = switchSave();
    const cut = {
      data: parsed.data.subarray(0, parsed.data.length - 100),
      sections: parsed.sections,
    };
    expect(() => assertEditableLayout(cut)).toThrow(/Unsupported save version/);
  });

  it("rejects saves missing a required record", () => {
    const parsed = switchSave();
    expect(() =>
      assertEditableLayout(
        withSections(parsed, (s) => {
          const sec0 = s[0];
          sec0.records = sec0.records.filter((r) => r.key !== 0xb7df13e4);
        }),
      ),
    ).toThrow(/missing required records.*money/i);
  });
});
