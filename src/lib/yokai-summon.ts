/** Which yo-kai the game lets you own more than once. Summonable yo-kai
 *  (the konkatsu list) can be matched again and again; every other yo-kai is
 *  unique, so a second copy would be something the game never produces. */
import { KONKATSU_LIST } from "./konkatsu-list";

/** Some konkatsu models carry a form suffix ("y03030000_friend"). */
const SUMMONABLE_MODELS = new Set(KONKATSU_LIST.map((k) => k.model.replace(/_.*$/, "")));

/** `icon` is the roster's chara id (the yo-kai icon file name). */
export const isSummonable = (icon: string): boolean => SUMMONABLE_MODELS.has(icon);
