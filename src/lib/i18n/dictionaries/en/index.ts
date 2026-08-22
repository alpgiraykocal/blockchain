import { aml } from "./aml";
import { ui } from "./ui";

/** The English dictionary. Its type defines `Dictionary`, so this object is the
 *  contract every other locale is checked against. */
export const en = { ui, aml };
