/** EXP curves, recovered from the native requirement getter
 *  recovered from the native requirement getter):
 *
 *    threshold(L) = trunc(rate × L³)
 *    required(L → L+1) = threshold(L+1) − threshold(L)
 *
 *  One rate per ExperienceCurve class, from `game_param.cfg.bin`
 *  (`CGameSystemGlobalParam.expNext_param`). Protagonists are class 5 with
 *  their own table entry (`expNext_param_human`), which happens to hold the
 *  same 1.18. Exponent 3.0 (native constant 0x11A08E4), level cap 99. Stored
 *  EXP is progress within the current level. */

/** expNext_param[0..6]: one growth rate per ExperienceCurve class. */
export const EXP_RATES = [1.0, 0.73, 0.82, 0.91, 1.09, 1.18, 1.27] as const;

export const HUMAN_EXP_RATE = EXP_RATES[5];
export const LEVEL_CAP = 99;

/** Cumulative threshold at a level boundary: trunc(rate × L³) — the native
 *  getter converts with vcvttsd2si, i.e. truncation, not rounding. */
function threshold(level: number, rate: number): number {
  return Math.trunc(rate * level ** 3);
}

/** EXP needed to advance from `level` to `level + 1`. */
export function expToNext(level: number, rate: number = HUMAN_EXP_RATE): number {
  return threshold(level + 1, rate) - threshold(level, rate);
}

/** The level/EXP pair reached by carrying one step across a level boundary:
 *  levelling up starts the new level at 0 EXP, levelling down starts the lower
 *  level at its requirement.  Returns null at the cap or the first level. */
export function carryLevelStep(
  level: number,
  delta: 1 | -1,
  rate: number = HUMAN_EXP_RATE,
): { level: number; xp: number } | null {
  const next = Math.max(1, Math.min(LEVEL_CAP, level + delta));
  if (next === level) return null;
  return { level: next, xp: delta > 0 ? 0 : expToNext(next, rate) };
}
