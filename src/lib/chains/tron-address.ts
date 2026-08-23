import { createHash } from "node:crypto";

/**
 * Tron addresses in their two forms.
 *
 * The same account is written two ways. Everything a person sees is
 * Base58Check — `TMuA6Yqf…`, 34 characters, always leading `T`. Everything
 * inside a raw transaction is hex — `4182dd6b…`, a 0x41 version byte followed
 * by twenty address bytes. TronGrid's TRC-20 endpoint answers in the first
 * form and its raw transaction endpoint in the second, so a native transfer
 * cannot be attributed to a counterparty without converting.
 *
 * Base58Check is checksummed, which is the point of it: a mistyped address
 * fails to decode rather than resolving to somebody else's account. That
 * property is only worth having if the checksum is actually verified, so
 * `fromHex` computes one and `looksLikeTronAddress` checks it.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Mainnet accounts are version 0x41, which is what renders as a leading `T`. */
const VERSION_BYTE = 0x41;

function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

/** Double SHA-256, first four bytes — the Base58Check checksum. */
function checksum(payload: Buffer): Buffer {
  return sha256(sha256(payload)).subarray(0, 4);
}

function base58Encode(bytes: Buffer): string {
  // Leading zero bytes carry no value but do carry meaning, so they are
  // preserved as leading '1's rather than being lost to the bigint conversion.
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

  let value = BigInt(`0x${bytes.toString("hex") || "0"}`);
  let out = "";
  const base = 58n;
  while (value > 0n) {
    const remainder = Number(value % base);
    out = ALPHABET[remainder] + out;
    value /= base;
  }
  return "1".repeat(leadingZeros) + out;
}

function base58Decode(text: string): Buffer | null {
  let value = 0n;
  for (const character of text) {
    const index = ALPHABET.indexOf(character);
    if (index < 0) return null;
    value = value * 58n + BigInt(index);
  }
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const body = Buffer.from(hex, "hex");

  let leadingOnes = 0;
  while (leadingOnes < text.length && text[leadingOnes] === "1") leadingOnes++;
  return Buffer.concat([Buffer.alloc(leadingOnes), body]);
}

/**
 * Converts a raw hex account to the Base58Check form a person reads.
 *
 * Returns null rather than a wrong answer: an address that cannot be converted
 * is dropped from a report, which is recoverable, where a silently mangled one
 * would attribute value to an account that does not exist.
 */
export function fromHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{42}$/.test(clean)) return null;

  const payload = Buffer.from(clean, "hex");
  if (payload[0] !== VERSION_BYTE) return null;

  return base58Encode(Buffer.concat([payload, checksum(payload)]));
}

/** True when the string is a Base58Check address whose checksum verifies. */
export function looksLikeTronAddress(value: string): boolean {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return false;
  const decoded = base58Decode(value);
  if (!decoded || decoded.length !== 25) return false;

  const payload = decoded.subarray(0, 21);
  if (payload[0] !== VERSION_BYTE) return false;
  return checksum(payload).equals(decoded.subarray(21));
}
