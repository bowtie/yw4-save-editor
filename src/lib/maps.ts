/** In-game map IDs with place names. IDs are CRC-32 of the map's folder
 *  name in gamedata/map (verified against the game dump); display names
 *  ported from the reference editor AYw4SaveEditor where it had them. */
export interface MapName {
  id: number;
  name: string;
  /** Internal map folder, for unnamed maps. */
  folder?: string;
}

export const MAP_NAMES: MapName[] = [
  {
    id: 102893875,
    name: "Adams Hause (Past)",
    folder: "t201i001",
  },
  {
    id: 935990190,
    name: "Adams House (Future)",
    folder: "t101i001",
  },
  {
    id: 1449785490,
    name: "Busters Hell Hole",
    folder: "t310i001",
  },
  {
    id: 2187366092,
    name: "Dandanzaka",
    folder: "t203",
  },
  {
    id: 2170557535,
    name: "Dark Springdale",
    folder: "t201last",
  },
  {
    id: 2413120839,
    name: "Enma Palace",
    folder: "d100g011",
  },
  {
    id: 178928158,
    name: "Enma Palace",
    folder: "t100i001",
  },
  {
    id: 2637507383,
    name: "Enma Palace",
    folder: "t300i001",
  },
  {
    id: 2587657195,
    name: "Enma tournament - oni arena",
    folder: "t300i401",
  },
  {
    id: 4260537042,
    name: "Gasha Land",
    folder: "t300i018",
  },
  {
    id: 422535471,
    name: "Ghost World",
    folder: "t100",
  },
  {
    id: 61899776,
    name: "Hells Kichen",
    folder: "t310",
  },
  {
    id: 145418661,
    name: "Houkenden",
    folder: "d100g006",
  },
  {
    id: 507684150,
    name: "Kasumidai",
    folder: "t104",
  },
  {
    id: 2670418057,
    name: "Kodama hause",
    folder: "t201i002",
  },
  {
    id: 2149986453,
    name: "Motomachi Shopping Area",
    folder: "t103",
  },
  {
    id: 4117216858,
    name: "Mount Wildwood",
    folder: "t202",
  },
  {
    id: 3334499983,
    name: "Mount Wildwood 2",
    folder: "t202last",
  },
  {
    id: 2025856298,
    name: "Reikenrin",
    folder: "d100g003",
  },
  {
    id: 1580135286,
    name: "Sakura High School",
    folder: "d105g001",
  },
  {
    id: 1840022999,
    name: "Sakura Motomachi",
    folder: "t301",
  },
  {
    id: 1819209696,
    name: "Sakura New Town",
    folder: "t201",
  },
  {
    id: 765975231,
    name: "Sakuragi Hills",
    folder: "t101ark",
  },
  {
    id: 2730839528,
    name: "Sakuragi Hills",
    folder: "t105ark",
  },
  {
    id: 2872289297,
    name: "Sakuragi Hills",
    folder: "t201ark",
  },
  {
    id: 3637714129,
    name: "Sakuragi Hills",
    folder: "t300ark",
  },
  {
    id: 1617918900,
    name: "Sakuragi Hills",
    folder: "t301ark",
  },
  {
    id: 1848136121,
    name: "Sakuragi Hills 2",
    folder: "t101",
  },
  {
    id: 1058174289,
    name: "Sakuragi hills 3",
    folder: "t102ark",
  },
  {
    id: 444148365,
    name: "Sakuragi Hills 4",
    folder: "t104ark",
  },
  {
    id: 1253959659,
    name: "Shop 1",
    folder: "t101i051",
  },
  {
    id: 220044603,
    name: "Shop 2",
    folder: "t102i051",
  },
  {
    id: 813544587,
    name: "Shop 3",
    folder: "t103i051",
  },
  {
    id: 2187159707,
    name: "Shop 4",
    folder: "t104i051",
  },
  {
    id: 2069233014,
    name: "Shop 5",
    folder: "t201i051",
  },
  {
    id: 26586646,
    name: "Shop 6",
    folder: "t203i051",
  },
  {
    id: 2662465369,
    name: "Snow Girl Shop",
    folder: "t300i201",
  },
  {
    id: 2530114566,
    name: "Soukenzan",
    folder: "d100g001",
  },
  {
    id: 1009861791,
    name: "Takashiro Manor",
    folder: "d301g001",
  },
  {
    id: 4146135043,
    name: "Tatsumi-kawabata - North",
    folder: "t102",
  },
  {
    id: 1766167968,
    name: "Tatsumi-kawabata - South",
    folder: "t105",
  },
  {
    id: 447460673,
    name: "The yo-kai world",
    folder: "t300",
  },
  {
    id: 4280982750,
    name: "Yo-kai Detective Agency Office",
    folder: "t104i001",
  },
  {
    id: 1641753707,
    name: "Yokai Sumo Ring",
    folder: "d100g013",
  },
  {
    id: 3827424800,
    name: "d100b020",
    folder: "d100b020",
  },
  {
    id: 2443425823,
    name: "d100g005",
    folder: "d100g005",
  },
  {
    id: 3960352614,
    name: "d102g001",
    folder: "d102g001",
  },
  {
    id: 2808868479,
    name: "t102b001",
    folder: "t102b001",
  },
  {
    id: 2840065980,
    name: "t102bst",
    folder: "t102bst",
  },
  {
    id: 1030105852,
    name: "t201bst",
    folder: "t201bst",
  },
  {
    id: 3112568831,
    name: "t202ark",
    folder: "t202ark",
  },
  {
    id: 20603034,
    name: "t203ark",
    folder: "t203ark",
  },
  {
    id: 1173208190,
    name: "t203b003",
    folder: "t203b003",
  },
  {
    id: 2540692087,
    name: "t203bst",
    folder: "t203bst",
  },
  {
    id: 1244965942,
    name: "t300b001",
    folder: "t300b001",
  },
  {
    id: 1317445180,
    name: "t300bst",
    folder: "t300bst",
  },
  {
    id: 2098618469,
    name: "t300i401_2",
    folder: "t300i401_2",
  },
  {
    id: 2002027910,
    name: "t301b001",
    folder: "t301b001",
  },
  {
    id: 4131060057,
    name: "t301bst",
    folder: "t301bst",
  },
  {
    id: 2171109267,
    name: "t310b001",
    folder: "t310b001",
  },
  {
    id: 683606621,
    name: "z01",
    folder: "z01",
  },
  {
    id: 309445087,
    name: "z01_battle",
    folder: "z01_battle",
  },
  {
    id: 1594010342,
    name: "z01_debug",
    folder: "z01_debug",
  },
  {
    id: 3528403694,
    name: "z01_debug_ark",
    folder: "z01_debug_ark",
  },
  {
    id: 4041326670,
    name: "z01_debugbst",
    folder: "z01_debugbst",
  },
  {
    id: 1557109738,
    name: "z01_debugg00",
    folder: "z01_debugg00",
  },
  {
    id: 136563894,
    name: "z01_dungeon",
    folder: "z01_dungeon",
  },
  {
    id: 164690946,
    name: "z01_world",
    folder: "z01_world",
  },
  {
    id: 1103374124,
    name: "z01_yw4_01",
    folder: "z01_yw4_01",
  },
  {
    id: 2949268992,
    name: "z01_yw4_03",
    folder: "z01_yw4_03",
  },
  {
    id: 2829550105,
    name: "z01_yw4_07",
    folder: "z01_yw4_07",
  },
];

export function mapNameFor(id: number): string | null {
  return MAP_NAMES.find((m) => m.id === id)?.name ?? null;
}
