import { ASSETS, ASSET_IDS } from "./registry";

/**
 * Detecting tokens that impersonate a known one.
 *
 * A token's symbol is whatever its deployer typed. Nothing stops a contract
 * from calling itself USDT, and on a single page of Tether's own transfers
 * there were four that did — through a Cyrillic Ѕ and Т, an accented Ú and a
 * dotted Ḍ. They render as "USDT" to a reader and sort next to the real thing
 * in any list keyed on the symbol.
 *
 * So the symbol is folded down to the letters it is pretending to be, and the
 * result is compared against the assets this app knows. A match on the folded
 * symbol without a match on the contract address is the impersonation.
 */

/**
 * Cyrillic and Greek letters that render as Latin ones in almost every font.
 * Only the confusable pairs are listed; a general transliteration would fold
 * legitimate non-Latin symbols into false matches.
 */
const CONFUSABLES: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C",
  Т: "T", Х: "X", Ѕ: "S", І: "I", Ј: "J", Ү: "Y", Ԁ: "D",
  Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K", Μ: "M", Ν: "N",
  Ο: "O", Ρ: "P", Τ: "T", Υ: "Y", Χ: "X",
};

/**
 * Folds a symbol to the Latin letters it presents as.
 *
 * NFKD splits an accented character into its base letter plus a combining mark,
 * which the following strip removes — that is what turns `Ú` into `U` and `Ḍ`
 * into `D`. The confusable table then handles the letters that are not accents
 * at all but separate alphabets.
 */
export function foldSymbol(symbol: string): string {
  return symbol
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split("")
    .map((character) => CONFUSABLES[character] ?? character)
    .join("")
    .toUpperCase()
    .trim();
}

export interface Impersonation {
  /** The symbol as the contract reports it, lookalike characters intact. */
  symbol: string;
  contract: string;
  /** The known asset it is presenting as. */
  imitates: string;
  transfers: number;
}

/** Contract addresses of every token this app knows, lowercased. */
function knownContracts(): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of ASSET_IDS) {
    const asset = ASSETS[id];
    if (asset.contract) map.set(asset.contract.toLowerCase(), asset.symbol);
  }
  return map;
}

/**
 * Picks out transfers whose token folds to a known symbol from an unknown
 * contract.
 *
 * A token this app has never heard of is not reported. The claim being made is
 * narrow and checkable — "this calls itself USDT and is not USDT" — and it only
 * holds where the real USDT is known well enough to say so.
 */
export function findImpersonations(
  transfers: { symbol: string | null | undefined; contract: string | null | undefined }[],
): Impersonation[] {
  const known = knownContracts();
  const knownSymbols = new Set(known.values());
  const found = new Map<string, Impersonation>();

  for (const transfer of transfers) {
    const contract = transfer.contract?.toLowerCase();
    const symbol = transfer.symbol;
    if (!contract || !symbol) continue;
    if (known.has(contract)) continue;

    const folded = foldSymbol(symbol);
    if (!knownSymbols.has(folded)) continue;
    // An exact match on an unknown contract is still an impersonation, but a
    // fold that changed nothing means the deployer simply reused a plain string
    // rather than reaching for lookalike characters. Both are reported; the
    // distinction lives in the symbol shown next to it.
    const existing = found.get(contract);
    if (existing) {
      existing.transfers += 1;
      continue;
    }
    found.set(contract, { symbol, contract, imitates: folded, transfers: 1 });
  }

  return [...found.values()].sort((a, b) => b.transfers - a.transfers);
}
