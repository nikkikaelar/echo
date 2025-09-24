import { sodium } from './sodium';

export async function seal(plaintext: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const s = await sodium();
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const aad = s.from_string('v1');
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, aad, null, nonce, key);
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return out;
}

export async function open(payload: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const s = await sodium();
  const nlen = s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = payload.slice(0, nlen);
  const ct = payload.slice(nlen);
  const aad = s.from_string('v1');
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, aad, nonce, key);
}
