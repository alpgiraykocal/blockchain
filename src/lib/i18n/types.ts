import { en } from "./dictionaries/en";

/**
 * The translation contract, derived from the English dictionary rather than
 * hand-written beside it. One definition instead of two means a new key cannot
 * be added to the copy and forgotten in the type - or the reverse.
 */
export type Dictionary = typeof en;
