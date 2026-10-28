/** Konkatsu match list, generated from the game's konkatsu_match_config
 *  Canonical game order.
 *  Summon cost per species: soul wisps + money, some also require a
 *  keepsake item. `paramId` is the soul-ledger BaseID, not a ParamID; use
 *  KONKATSU_SPECIES_PARAM_ID to reach the species' stat row. */
export interface KonkatsuEntry {
  name: string;
  model: string;
  /** Soul-ledger BaseID (crc32 of the model). */
  paramId: number;
  souls: { tier: "white" | "red" | "gold"; count: number }[];
  /** Base trade price: the price at level 1. */
  money: number;
  /** Added per level above 1; rare candidates multiply this by 10. */
  moneyAdd: number;
  item?: string;
}

export const KONKATSU_LIST: KonkatsuEntry[] = [
  {
    name: "Kantaro",
    model: "y01530000",
    paramId: 2923025309,
    souls: [{ tier: "gold", count: 1 }],
    money: 130,
    moneyAdd: 0,
  },
  {
    name: "Blazion",
    model: "y01040000",
    paramId: 1289002558,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 2000,
    moneyAdd: 100,
  },
  {
    name: "Jinta",
    model: "y01100000",
    paramId: 1913187163,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 2000,
    moneyAdd: 100,
  },
  {
    name: "Bancho",
    model: "y01110000",
    paramId: 1332265707,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 2000,
    moneyAdd: 120,
  },
  {
    name: "Hare-onna",
    model: "y01230000",
    paramId: 3007111973,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 2800,
    moneyAdd: 100,
    item: "Hare-onna's Cloud",
  },
  {
    name: "Uribou",
    model: "y01430000",
    paramId: 1701118008,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 2000,
    moneyAdd: 100,
    item: "Uribou's Fang",
  },
  {
    name: "Whisper",
    model: "y00010000",
    paramId: 574823162,
    souls: [{ tier: "gold", count: 1 }],
    money: 100,
    moneyAdd: 40,
    item: "Whisper's Hair Wax",
  },
  {
    name: "Kyunshi",
    model: "y01200000",
    paramId: 4103903733,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 940,
    moneyAdd: 80,
    item: "Kyunshi's Hairclip",
  },
  {
    name: "Mirapo",
    model: "y01480000",
    paramId: 313864489,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1000,
    moneyAdd: 80,
    item: "Mirapo Fragment",
  },
  {
    name: "Hot Pot",
    model: "y01470000",
    paramId: 2430969592,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 80,
  },
  {
    name: "Semicolon",
    model: "y01130000",
    paramId: 900239755,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 80,
  },
  {
    name: "Pakkun",
    model: "y01140000",
    paramId: 2273856923,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 890,
    moneyAdd: 60,
  },
  {
    name: "Hungramps",
    model: "y01180000",
    paramId: 1115201690,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Chief Tuna",
    model: "y01330000",
    paramId: 2019569792,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 80,
  },
  {
    name: "Charlie",
    model: "y01450000",
    paramId: 3928356248,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 80,
  },
  {
    name: "Blizzaria",
    model: "y02080000",
    paramId: 3100404130,
    souls: [
      { tier: "gold", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 6000,
    moneyAdd: 200,
    item: "Glacial Clip",
  },
  {
    name: "Illuminoct",
    model: "y02160010",
    paramId: 3585815847,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 5000,
    moneyAdd: 260,
    item: "Illuminoct's Shine",
  },
  {
    name: "Snartle",
    model: "y02180000",
    paramId: 1938864647,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 200,
  },
  {
    name: "Corptain",
    model: "y02280010",
    paramId: 3961518568,
    souls: [
      { tier: "gold", count: 1 },
      { tier: "gold", count: 2 },
    ],
    money: 5000,
    moneyAdd: 200,
    item: "Corptain's Flag",
  },
  {
    name: "Darkyubi",
    model: "y02380010",
    paramId: 658713165,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 5900,
    moneyAdd: 200,
    item: "Darkyubi's Comb",
  },
  {
    name: "Wobblewok",
    model: "y02560000",
    paramId: 1462847088,
    souls: [{ tier: "gold", count: 2 }],
    money: 5000,
    moneyAdd: 200,
  },
  {
    name: "Gargaros",
    model: "y02690000",
    paramId: 1408606991,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 160,
  },
  {
    name: "Ogralus",
    model: "y02700000",
    paramId: 2511934171,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 160,
  },
  {
    name: "Insomni",
    model: "y02070000",
    paramId: 983367283,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3000,
    moneyAdd: 160,
    item: "Insomni's Eyedrops",
  },
  {
    name: "Sgt. Burly",
    model: "y02150000",
    paramId: 2332065462,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3000,
    moneyAdd: 140,
    item: "Burly's Wristband",
  },
  {
    name: "Reuknight",
    model: "y02280000",
    paramId: 4110731433,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3000,
    moneyAdd: 140,
    item: "Reuknight's Flag",
  },
  {
    name: "Robonyan",
    model: "y02480000",
    paramId: 593308596,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3600,
    moneyAdd: 140,
    item: "Robonyan Oil",
  },
  {
    name: "Frostina",
    model: "y02060000",
    paramId: 134010819,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 2500,
    moneyAdd: 80,
  },
  {
    name: "Punkupine",
    model: "y02670000",
    paramId: 3972341102,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 2000,
    moneyAdd: 80,
    item: "Punkupine's Needles",
  },
  {
    name: "Whisper",
    model: "y00020000",
    paramId: 1709400106,
    souls: [{ tier: "gold", count: 1 }],
    money: 100,
    moneyAdd: 40,
    item: "Whisper's Notebook",
  },
  {
    name: "Blazion",
    model: "y02140000",
    paramId: 3059767046,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1000,
    moneyAdd: 60,
    item: "Blazion's Flame",
  },
  {
    name: "Baku",
    model: "y02350000",
    paramId: 3335053245,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 890,
    moneyAdd: 60,
    item: "Baku's Pillow",
  },
  {
    name: "Mirapo",
    model: "y02440000",
    paramId: 3870148277,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 1000,
    moneyAdd: 60,
  },
  {
    name: "Tattletell",
    model: "y02030000",
    paramId: 3474741427,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 960,
    moneyAdd: 60,
  },
  {
    name: "Hidabat",
    model: "y02050000",
    paramId: 1079815443,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 210,
    moneyAdd: 60,
  },
  {
    name: "Mochismo",
    model: "y02130000",
    paramId: 71338774,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Krystal Fox",
    model: "y02330000",
    paramId: 1233660445,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 80,
  },
  {
    name: "Mimikin",
    model: "y02430000",
    paramId: 1418533541,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Walkappa",
    model: "y02490000",
    paramId: 507314692,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Cornfused",
    model: "y02510000",
    paramId: 3843136096,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Rhyth",
    model: "y02650000",
    paramId: 2516930062,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 80,
  },
  {
    name: "Sorrypus",
    model: "y02680000",
    paramId: 1855294143,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Hungramps",
    model: "y02010000",
    paramId: 3051097043,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 80,
  },
  {
    name: "Dimmy",
    model: "y02020000",
    paramId: 4068241667,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Roughraff",
    model: "y02120000",
    paramId: 958440102,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 400,
    moneyAdd: 60,
  },
  {
    name: "Noko",
    model: "y02210000",
    paramId: 4162104024,
    souls: [{ tier: "gold", count: 1 }],
    money: 1000,
    moneyAdd: 100,
    item: "Noko's Shed Skin",
  },
  {
    name: "Manjimutt",
    model: "y02310000",
    paramId: 860387709,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 40,
  },
  {
    name: "Noway",
    model: "y02400000",
    paramId: 321740917,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Sandmeh",
    model: "y02420000",
    paramId: 1777152789,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Wiglin",
    model: "y02630000",
    paramId: 424000430,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Steppa",
    model: "y02640000",
    paramId: 2875549630,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Gyuuki",
    model: "y03170000",
    paramId: 1471620706,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 5000,
    moneyAdd: 200,
    item: "Gyuuki's Eyeball",
  },
  {
    name: "Yamanba",
    model: "y03090000",
    paramId: 601574310,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 2000,
    moneyAdd: 80,
  },
  {
    name: "Zashiki-warashi",
    model: "y03080000",
    paramId: 515596822,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1000,
    moneyAdd: 100,
    item: "Zashiki-warashi's Mirror",
  },
  {
    name: "Kappa",
    model: "y03140000",
    paramId: 269966514,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 1000,
    moneyAdd: 60,
  },
  {
    name: "Narigama",
    model: "y03180000",
    paramId: 3588731315,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 500,
    moneyAdd: 60,
  },
  {
    name: "Blobgoblin",
    model: "y03200000",
    paramId: 1661176028,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 300,
    moneyAdd: 60,
  },
  {
    name: "Blizzaria",
    model: "y01050000",
    paramId: 1907668878,
    souls: [{ tier: "gold", count: 3 }],
    money: 6000,
    moneyAdd: 200,
  },
  {
    name: "Kyubi",
    model: "y01060000",
    paramId: 907332958,
    souls: [{ tier: "gold", count: 3 }],
    money: 5900,
    moneyAdd: 200,
  },
  {
    name: "Venoct",
    model: "y01300000",
    paramId: 1069566544,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 260,
  },
  {
    name: "Little Charrmer",
    model: "y02100000",
    paramId: 1138815430,
    souls: [{ tier: "gold", count: 3 }],
    money: 5300,
    moneyAdd: 200,
  },
  {
    name: "Shogunyan",
    model: "y02170000",
    paramId: 4055903702,
    souls: [{ tier: "gold", count: 3 }],
    money: 6400,
    moneyAdd: 280,
  },
  {
    name: "Arachnus",
    model: "y02190000",
    paramId: 1324389303,
    souls: [{ tier: "gold", count: 3 }],
    money: 5900,
    moneyAdd: 200,
  },
  {
    name: "Toadal Dude",
    model: "y02290000",
    paramId: 3362054425,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 200,
  },
  {
    name: "Silver Lining",
    model: "y02300000",
    paramId: 237523149,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 300,
  },
  {
    name: "Deadcool",
    model: "y02580000",
    paramId: 3892443153,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 240,
  },
  {
    name: "Gilgaros",
    model: "y02620000",
    paramId: 606442014,
    souls: [{ tier: "gold", count: 3 }],
    money: 5860,
    moneyAdd: 160,
  },
  {
    name: "Orcanos",
    model: "y02710000",
    paramId: 2832808811,
    souls: [{ tier: "gold", count: 3 }],
    money: 5960,
    moneyAdd: 160,
  },
  {
    name: "Azure Dragon",
    model: "y01070000",
    paramId: 192210158,
    souls: [{ tier: "gold", count: 2 }],
    money: 3000,
    moneyAdd: 160,
  },
  {
    name: "Shirokuma",
    model: "y02660000",
    paramId: 3517265118,
    souls: [{ tier: "gold", count: 1 }],
    money: 2460,
    moneyAdd: 80,
    item: "Shirokuma's Milk Bottle",
  },
  {
    name: "Tamamo",
    model: "y03120000",
    paramId: 2673322258,
    souls: [{ tier: "gold", count: 2 }],
    money: 6000,
    moneyAdd: 200,
  },
  {
    name: "Damona",
    model: "y02080010",
    paramId: 2715244771,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Goldenyan",
    model: "y02480010",
    paramId: 977672949,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Komashura",
    model: "y02720000",
    paramId: 4017701307,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Shadow Venoct",
    model: "y02160020",
    paramId: 4271269604,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Sighborg Y",
    model: "y02730000",
    paramId: 3524880395,
    souls: [{ tier: "gold", count: 1 }],
    money: 2000,
    moneyAdd: 100,
  },
  {
    name: "Kiborikkuma",
    model: "y01520000",
    paramId: 2472147501,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 4900,
    moneyAdd: 100,
  },
  {
    name: "Spoilerina",
    model: "y02570000",
    paramId: 1783721920,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 4800,
    moneyAdd: 100,
  },
  {
    name: "Cruncha",
    model: "y02740010",
    paramId: 2032305498,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 6400,
    moneyAdd: 100,
  },
  {
    name: "Hornaplenty",
    model: "y02750010",
    paramId: 1145220330,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 6400,
    moneyAdd: 100,
  },
  {
    name: "Beetall",
    model: "y02740000",
    paramId: 1614394395,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 3200,
    moneyAdd: 70,
  },
  {
    name: "Rhinormous",
    model: "y02750000",
    paramId: 1566154155,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 3200,
    moneyAdd: 70,
  },
  {
    name: "Kappa",
    model: "y02770000",
    paramId: 664391371,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 2800,
    moneyAdd: 70,
  },
  {
    name: "Hamham",
    model: "y01390000",
    paramId: 852502561,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1860,
    moneyAdd: 40,
  },
  {
    name: "Lava Lord",
    model: "y02760010",
    paramId: 65197626,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 2390,
    moneyAdd: 40,
  },
  {
    name: "Choky",
    model: "y01280000",
    paramId: 3303854644,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 2200,
    moneyAdd: 30,
  },
  {
    name: "Happierre",
    model: "y02250000",
    paramId: 227806232,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1130,
    moneyAdd: 30,
  },
  {
    name: "Swelton",
    model: "y02520000",
    paramId: 2729566384,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1290,
    moneyAdd: 30,
  },
  {
    name: "Mad Mountain",
    model: "y02760000",
    paramId: 452585339,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1240,
    moneyAdd: 30,
  },
  {
    name: "Kawauso",
    model: "y03150000",
    paramId: 762803458,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 1110,
    moneyAdd: 30,
  },
  {
    name: "Dismarelda",
    model: "y02040000",
    paramId: 2101118115,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 880,
    moneyAdd: 20,
  },
  {
    name: "Nosirs",
    model: "y02500000",
    paramId: 3631330256,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 530,
    moneyAdd: 20,
  },
  {
    name: "McKraken",
    model: "y02780000",
    paramId: 2781436186,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Damona",
    model: "y01050010",
    paramId: 1756333775,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Frostail",
    model: "y01060010",
    paramId: 789576735,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 5900,
    moneyAdd: 200,
  },
  {
    name: "Shadow Venoct",
    model: "y01300010",
    paramId: 651918097,
    souls: [{ tier: "gold", count: 1 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Shogunyan",
    model: "y01310000",
    paramId: 44065760,
    souls: [{ tier: "gold", count: 3 }],
    money: 6400,
    moneyAdd: 280,
  },
  {
    name: "Arachnus",
    model: "y01320000",
    paramId: 1157634352,
    souls: [{ tier: "gold", count: 3 }],
    money: 5900,
    moneyAdd: 200,
  },
  {
    name: "Toadal Dude",
    model: "y01360000",
    paramId: 2961227760,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 200,
  },
  {
    name: "Komashura",
    model: "y01550000",
    paramId: 561587773,
    souls: [{ tier: "gold", count: 3 }],
    money: 5000,
    moneyAdd: 100,
  },
  {
    name: "Awevil",
    model: "y02090000",
    paramId: 2242658322,
    souls: [{ tier: "gold", count: 3 }],
    money: 4830,
    moneyAdd: 160,
  },
  {
    name: "Demuncher",
    model: "y02200000",
    paramId: 3312747368,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 4910,
    moneyAdd: 120,
    item: "Demuncher Beads",
  },
  {
    name: "Poofessor",
    model: "y02810000",
    paramId: 1502579134,
    souls: [
      { tier: "red", count: 4 },
      { tier: "gold", count: 2 },
    ],
    money: 5290,
    moneyAdd: 100,
  },
  {
    name: "Tidynator",
    model: "y01080000",
    paramId: 2300867391,
    souls: [{ tier: "gold", count: 2 }],
    money: 3600,
    moneyAdd: 140,
  },
  {
    name: "Papa Bolt",
    model: "y01090000",
    paramId: 3024378511,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3100,
    moneyAdd: 70,
  },
  {
    name: "Saya",
    model: "y01290000",
    paramId: 4186766212,
    souls: [{ tier: "gold", count: 2 }],
    money: 3800,
    moneyAdd: 70,
  },
  {
    name: "Dameboy",
    model: "y01610000",
    paramId: 1382937171,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 2820,
    moneyAdd: 70,
    item: "Dameboy's Gloves",
  },
  {
    name: "Signiton",
    model: "y02270000",
    paramId: 2002018168,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3140,
    moneyAdd: 70,
    item: "GHz Orb",
  },
  {
    name: "Lie-in Heart",
    model: "y02370000",
    paramId: 3154676957,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3440,
    moneyAdd: 70,
  },
  {
    name: "Smogmella",
    model: "y02550000",
    paramId: 277953696,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 2 },
    ],
    money: 3360,
    moneyAdd: 70,
    item: "Smogmella's Smoke",
  },
  {
    name: "Kukuri-hime",
    model: "y03100000",
    paramId: 3851942514,
    souls: [{ tier: "gold", count: 2 }],
    money: 2990,
    moneyAdd: 70,
  },
  {
    name: "Kakurenbo",
    model: "y01220000",
    paramId: 2388445845,
    souls: [{ tier: "gold", count: 2 }],
    money: 1960,
    moneyAdd: 40,
  },
  {
    name: "Itashikatanashi",
    model: "y01270000",
    paramId: 1186743781,
    souls: [
      { tier: "red", count: 3 },
      { tier: "gold", count: 1 },
    ],
    money: 1740,
    moneyAdd: 40,
    item: "Itashikatanashi's Sash",
  },
  {
    name: "Noko",
    model: "y01340000",
    paramId: 3393252496,
    souls: [{ tier: "gold", count: 1 }],
    money: 3000,
    moneyAdd: 100,
  },
  {
    name: "Doyapon",
    model: "y01420000",
    paramId: 1476733320,
    souls: [{ tier: "gold", count: 2 }],
    money: 1800,
    moneyAdd: 40,
  },
  {
    name: "B3-NK1",
    model: "y02470000",
    paramId: 2702031973,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 1900,
    moneyAdd: 40,
  },
  {
    name: "Drizzelda",
    model: "y02790000",
    paramId: 2561241258,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 1400,
    moneyAdd: 50,
  },
  {
    name: "Ray O'Light",
    model: "y02800000",
    paramId: 1693425678,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 3 },
      { tier: "gold", count: 3 },
    ],
    money: 1400,
    moneyAdd: 50,
  },
  {
    name: "Becchan",
    model: "y01640000",
    paramId: 2592963875,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 1060,
    moneyAdd: 30,
  },
  {
    name: "Shmoopie",
    model: "y02360000",
    paramId: 2171118957,
    souls: [
      { tier: "red", count: 2 },
      { tier: "gold", count: 1 },
    ],
    money: 960,
    moneyAdd: 30,
    item: "Swooning Heart",
  },
  {
    name: "Nekidspeed",
    model: "y02450000",
    paramId: 3687706373,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 890,
    moneyAdd: 30,
  },
  {
    name: "Count Zapaway",
    model: "y02460000",
    paramId: 2624427477,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 940,
    moneyAdd: 30,
  },
  {
    name: "Rocky Badboya",
    model: "y02530000",
    paramId: 2681325824,
    souls: [
      { tier: "white", count: 2 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 3 },
    ],
    money: 1970,
    moneyAdd: 20,
  },
  {
    name: "Daniel",
    model: "y01250000",
    paramId: 1014765189,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 520,
    moneyAdd: 20,
  },
  {
    name: "Slicenrice",
    model: "y02240000",
    paramId: 821306792,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 360,
    moneyAdd: 20,
  },
  {
    name: "Molar Petite",
    model: "y02340000",
    paramId: 4222154253,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 820,
    moneyAdd: 20,
  },
  {
    name: "Legsit",
    model: "y02820000",
    paramId: 506458990,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 590,
    moneyAdd: 20,
  },
  {
    name: "Snottle",
    model: "y02830000",
    paramId: 592435934,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 870,
    moneyAdd: 20,
  },
  {
    name: "Kezurin",
    model: "y01460000",
    paramId: 2911211336,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 320,
    moneyAdd: 10,
  },
  {
    name: "Wazzat",
    model: "y02410000",
    paramId: 776817093,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 340,
    moneyAdd: 10,
  },
  {
    name: "Azukiarai",
    model: "y03190000",
    paramId: 3901200387,
    souls: [
      { tier: "white", count: 1 },
      { tier: "red", count: 2 },
      { tier: "gold", count: 2 },
    ],
    money: 240,
    moneyAdd: 10,
  },
  {
    name: "Yamamba",
    model: "y03030000_friend",
    paramId: 1269625312,
    souls: [{ tier: "gold", count: 3 }],
    money: 4880,
    moneyAdd: 100,
  },
];

/** Canonical ParamID of every summonable species, keyed by its KONKATSU_LIST
 *  `paramId` (the soul-ledger BaseID). The match board stores candidates by
 *  ParamID, so this bridges the ledger row to the rolled candidates.
 *  Generated from konkatsu_match_config's charaID/charaParamID pair. */
export const KONKATSU_SPECIES_PARAM_ID: Record<number, number> = {
  2923025309: 2981463356, // Kantaro (y01530000)
  1289002558: 1398327455, // Blazion (y01040000)
  1913187163: 1837415930, // Jinta (y01100000)
  1332265707: 1357157450, // Bancho (y01110000)
  3007111973: 2897261956, // Hare-onna (y01230000)
  1701118008: 2062112409, // Uribou (y01430000)
  574823162: 1036995675, // Whisper (y00010000)
  4103903733: 3943747412, // Kyunshi (y01200000)
  313864489: 221865864, // Mirapo (y01480000)
  2430969592: 2406084697, // Hot Pot (y01470000)
  900239755: 707053354, // Semicolon (y01130000)
  2273856923: 2550405946, // Pakkun (y01140000)
  1115201690: 1576334907, // Hungramps (y01180000)
  2019569792: 1743545889, // Chief Tuna (y01330000)
  3928356248: 4121535289, // Charlie (y01450000)
  3100404130: 2806005507, // Blizzaria (y02080000)
  3585815847: 3392627590, // Illuminoct (y02160010)
  1938864647: 1813834918, // Snartle (y02180000)
  3961518568: 4086542153, // Corptain (y02280010)
  658713165: 953122028, // Darkyubi (y02380010)
  1462847088: 1220350161, // Wobblewok (y02560000)
  1408606991: 1283061166, // Gargaros (y02690000)
  2511934171: 2318746746, // Ogralus (y02700000)
  983367283: 621848786, // Insomni (y02070000)
  2332065462: 2492213271, // Sgt. Burly (y02150000)
  4110731433: 3934821896, // Reuknight (y02280000)
  593308596: 1020362005, // Robonyan (y02480000)
  134010819: 410026338, // Frostina (y02060000)
  3972341102: 4081667023, // Punkupine (y02670000)
  1709400106: 2054108811, // Whisper (y00020000)
  3059767046: 2850816423, // Blazion (y02140000)
  3335053245: 3645147420, // Baku (y02350000)
  3870148277: 4179726356, // Mirapo (y02440000)
  3474741427: 3499101714, // Tattletell (y02030000)
  1079815443: 1607531442, // Hidabat (y02050000)
  71338774: 466410935, // Mochismo (y02130000)
  1233660445: 1443134652, // Krystal Fox (y02330000)
  1418533541: 1258376196, // Mimikin (y02430000)
  507314692: 28398757, // Walkappa (y02490000)
  3843136096: 4204645569, // Cornfused (y02510000)
  2516930062: 2307463343, // Rhyth (y02650000)
  1855294143: 1897520158, // Sorrypus (y02680000)
  3051097043: 2857393522, // Hungramps (y02010000)
  4068241667: 3991938978, // Dimmy (y02020000)
  958440102: 648868871, // Roughraff (y02120000)
  4162104024: 3885563001, // Noko (y02210000)
  860387709: 751054812, // Manjimutt (y02310000)
  321740917: 211891924, // Noway (y02400000)
  1777152789: 1986094516, // Sandmeh (y02420000)
  424000430: 113896719, // Wiglin (y02630000)
  2875549630: 3035181343, // Steppa (y02640000)
  1471620706: 1211855043, // Gyuuki (y03170000)
  601574310: 1012342023, // Yamanba (y03090000)
  515596822: 20395191, // Zashiki-warashi (y03080000)
  269966514: 261818899, // Kappa (y03140000)
  3588731315: 3396069138, // Narigama (y03180000)
  1661176028: 2089803389, // Blobgoblin (y03200000)
  1907668878: 1849221423, // Blizzaria (y01050000)
  907332958: 697867263, // Kyubi (y01060000)
  1069566544: 541859057, // Venoct (y01300000)
  1138815430: 1550624615, // Little Charrmer (y02100000)
  4055903702: 3997989751, // Shogunyan (y02170000)
  1324389303: 1367131414, // Arachnus (y02190000)
  3362054425: 3622352824, // Toadal Dude (y02290000)
  237523149: 295962220, // Silver Lining (y02300000)
  3892443153: 4153257648, // Deadcool (y02580000)
  606442014: 1000981695, // Gilgaros (y02620000)
  2832808811: 3075829194, // Orcanos (y02710000)
  192210158: 351842895, // Azure Dragon (y01070000)
  3517265118: 3458818687, // Shirokuma (y02660000)
  2673322258: 2161901491, // Tamamo (y03120000)
  2715244771: 3193638466, // Damona (y02080010)
  977672949: 634014804, // Goldenyan (y02480010)
  4017701307: 4042594074, // Komashura (y02720000)
  4271269604: 3776589893, // Sh. Venoct (y02160020)
  3524880395: 3449110186, // Sighborg Y (y02730000)
  2472147501: 2362813580, // Kiborikkuma (y01520000)
  1783721920: 1977432417, // Spoilerina (y02570000)
  2032305498: 1722733563, // Cruncha (y02740010)
  1145220330: 1540291147, // Hornaplenty (y02750010)
  1614394395: 2142626490, // Beetall (y02740000)
  1566154155: 1121307402, // Rhinormous (y02750000)
  664391371: 940939370, // Kappa (y02770000)
  852502561: 761036416, // Hamham (y01390000)
  65197626: 477003931, // Lava Lord (y02760010)
  3303854644: 3680535701, // Chokki (y01280000)
  227806232: 303585977, // Happierre (y02250000)
  2729566384: 3174938129, // Swelton (y02520000)
  452585339: 91599322, // Mad Mountain (y02760000)
  762803458: 855319459, // Kawauso (y03150000)
  2101118115: 1655755266, // Dismarelda (y02040000)
  3631330256: 3355305329, // Nosirs (y02500000)
  2781436186: 3125088187, // McKraken (y02780000)
  1756333775: 1998835822, // Damona (y01050010)
  789576735: 813935294, // Frostail (y01060010)
  651918097: 962014640, // Sh. Venoct (y01300010)
  44065760: 489436481, // Shogunyan (y01310000)
  1157634352: 1519144849, // Arachnus (y01320000)
  2961227760: 2936858961, // Toadal Dude (y01360000)
  561587773: 1056272540, // Komashura (y01550000)
  2242658322: 2585794227, // Awevil (y02090000)
  3312747368: 3673740745, // Demuncher (y02200000)
  1502579134: 1174658847, // Poofessor (y02810000)
  2300867391: 2527602078, // Robonyan OO (y01080000)
  3024378511: 2882014254, // Papa Bolt (y01090000)
  4186766212: 3858804005, // Saya (y01290000)
  1382937171: 1306633458, // Dameboy (y01610000)
  2002018168: 1758988761, // Signiton (y02270000)
  3154676957: 2743392892, // Lie-in Heart (y02370000)
  277953696: 253585921, // Smogmella (y02550000)
  3851942514: 4196117715, // Kukuri-hime (y03100000)
  2388445845: 2446367796, // Kakurenbo (y01220000)
  1186743781: 1496322884, // Itashikatanashi (y01270000)
  3393252496: 3586964017, // Noko (y01340000)
  1476733320: 1200193321, // Doyapon (y01420000)
  2702031973: 3196185284, // B3-NK1 (y02470000)
  2561241258: 2267358731, // Drizzelda (y02790000)
  1693425678: 2070148783, // Ray O'Light (y02800000)
  2592963875: 2231446402, // Becchan (y01640000)
  2171118957: 2665804748, // Shmoopie (y02360000)
  3687706373: 3292641700, // Nekidspeed (y02450000)
  2624427477: 2212610932, // Count Zapaway (y02460000)
  2681325824: 2153619361, // Rocky Badboya (y02530000)
  1014765189: 602947620, // Daniel (y01250000)
  821306792: 796422921, // Slicenrice (y02240000)
  4222154253: 3827605676, // Molar Petite (y02340000)
  506458990: 27502031, // Legsit (y02820000)
  592435934: 1019448447, // Snottle (y02830000)
  2911211336: 2986990057, // Kezurin (y01460000)
  776817093: 834740068, // Wazzat (y02410000)
  3901200387: 4144746146, // Azukiarai (y03190000)
  1269625312: 1994851750, // Yamamba (y03030000_friend)
};

/** Canonical ParamID for a KONKATSU_LIST BaseID. */
export function konkatsuSpeciesParamId(baseId: number): number | undefined {
  return KONKATSU_SPECIES_PARAM_ID[baseId >>> 0];
}

/** Rare candidates multiply the level surcharge by this rate
 *  (option_config moneyRate_RareChara). */
export const RARE_MONEY_RATE = 10;

/** One candidate's trade price, mirroring GetTradeMoney in
 *  konkatsu_match_inc.lua: base money plus moneyAdd for every level above 1. */
export function konkatsuTradeMoney(entry: KonkatsuEntry, level: number, isRare: boolean): number {
  return entry.money + entry.moneyAdd * (level - 1) * (isRare ? RARE_MONEY_RATE : 1);
}
