// lib/crypto.ts
import sodium from "libsodium-wrappers";

const PREFIX = "v1.nacl"; // versioning for future rotation
const SEP = ":";

function getKey(): Uint8Array {
  const b64 = process.env.APP_ENC_KEY;
  if (!b64) throw new Error("APP_ENC_KEY missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("APP_ENC_KEY must decode to 32 bytes");
  return new Uint8Array(key);
}

export async function encryptToString(plaintext: string): Promise<string> {
  await sodium.ready;
  const key = getKey();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES); // 24 bytes
  const cipher = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    key
  );
  const nB64 = Buffer.from(nonce).toString("base64");
  const cB64 = Buffer.from(cipher).toString("base64");
  return [PREFIX, nB64, cB64].join(SEP);
}

export async function decryptFromString(payload: string): Promise<string> {
  await sodium.ready;
  const [prefix, nB64, cB64] = payload.split(SEP);
  if (prefix !== PREFIX) throw new Error("Unsupported payload version");
  const key = getKey();
  const nonce = new Uint8Array(Buffer.from(nB64, "base64"));
  const cipher = new Uint8Array(Buffer.from(cB64, "base64"));
  const msg = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  if (!msg) throw new Error("Decryption failed");
  return sodium.to_string(msg);
}
