import type { Dictionary } from "../i18n/types";

/**
 * The slice of the dictionary the AML engine is given.
 *
 * Narrowing it here rather than passing the whole dictionary keeps the boundary
 * honest: a detector can reach its own copy and nothing else, and the engine
 * never grows an accidental dependency on the navigation labels.
 */
export type AmlCopy = Dictionary["aml"];
