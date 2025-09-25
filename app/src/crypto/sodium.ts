import sodiumLib from 'libsodium-wrappers';

let ready = (async () => { await sodiumLib.ready; return sodiumLib; })();
export async function sodium() { return ready; }

export type Keypair = { publicKey: Uint8Array; secretKey: Uint8Array };

export async function generateKeypair(): Promise<Keypair> {
  const s = await sodium();
  const kp = s.crypto_kx_keypair(); // X25519
  return { publicKey: kp.publicKey, secretKey: kp.privateKey };
}

export async function deriveSharedKey(mySecret: Uint8Array, theirPublic: Uint8Array): Promise<Uint8Array> {
  const s = await sodium();
  // X25519 ECDH → BLAKE2b(32) with a fixed context tag
  const shared = s.crypto_scalarmult(mySecret, theirPublic); // 32 bytes
  const ctx = s.from_string("echo/v1/kdf");
  return s.crypto_generichash(32, shared, ctx);
}

export async function toB64(u8: Uint8Array): Promise<string> {
  const s = await sodium();
  return s.to_base64(u8, s.base64_variants.ORIGINAL);
}

export async function fromB64(b64: string): Promise<Uint8Array> {
  const s = await sodium();
  return s.from_base64(b64, s.base64_variants.ORIGINAL);
}

export async function utf8(s_: string): Promise<Uint8Array> {
  const s = await sodium();
  return s.from_string(s_);
}

export async function str(u8: Uint8Array): Promise<string> {
  const s = await sodium();
  return s.to_string(u8);
}
