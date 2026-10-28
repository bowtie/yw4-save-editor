/** chara_base battle-row tribe enum (see yokai-base.ts) → display name, the
 *  emblem's key in icons/Tribes, and the emblem's main color (picked from the
 *  art, used to tint per-yo-kai UI such as EXP bars). */
export interface Tribe {
  name: string;
  emblem: string;
  color: string;
}

const TRIBES: (Tribe | undefined)[] = [
  undefined,
  { name: "Goriki", emblem: "race_Goriki", color: "#c4504f" },
  { name: "Onnen", emblem: "race_Onnen", color: "#9a7bc0" },
  { name: "Mononoke", emblem: "race_Mononoke", color: "#f2d84f" },
  { name: "Tsukumono", emblem: "race_Tsukumono", color: "#d4893a" },
  { name: "Uwanosora", emblem: "race_Uwanosora", color: "#6b9bd2" },
  { name: "Omamori", emblem: "race_Omamori", color: "#98bf4e" },
  { name: "Mikakunin", emblem: "race_Mikakunin", color: "#a4a9ae" },
  { name: "Mikado", emblem: "race_Mikado", color: "#7c4fae" },
  { name: "Izana", emblem: "race_Izana", color: "#2a62b4" },
  { name: "Oni", emblem: "race_Oni", color: "#c8215f" },
  // The art set names these two by their romanized Japanese names.
  { name: "Wicked", emblem: "race_Kaima", color: "#5b6aa8" },
  { name: "Shinma", emblem: "race_Sinma", color: "#b8aa4e" },
];

export function tribeInfo(tribe: number | undefined): Tribe | undefined {
  return tribe === undefined ? undefined : TRIBES[tribe];
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** crc32 of an ASCII model name, the key yokai-base.ts tables use. */
export function modelParamId(model: string): number {
  let c = 0xffffffff;
  for (let i = 0; i < model.length; i++)
    c = CRC_TABLE[(c ^ model.charCodeAt(i)) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
