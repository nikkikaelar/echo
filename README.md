# Sentinel  E2E Secure Messenger (MVP)

![](https://i.imgur.com/zsLK6Fh.png)

Minimal endtoend encrypted chat for educational use. Two browser clients exchange public keys (manual/QR), derive a shared key via X25519, and encrypt messages with XChaCha20Poly1305. A dumb WebSocket relay forwards opaque ciphertextno plaintext or keys touch the server.

> **NOT FOR PRODUCTION.** This is a learning artifact to show correct primitives and a documented threat model.

## TL;DR
- Client: React + libsodiumwrappers
- Crypto: X25519 (ECDH)  BLAKE2b KDF  XChaCha20Poly1305 AEAD
- Server: Node `ws` relay (no storage)

## Quickstart
1. **Server**
   ```bash
   cd server
   npm i
   npm run dev
   # listens on ws://localhost:8787
   ```
2. **App**
   ```bash
   cd ../app
   npm i
   npm run dev
   # open the printed local URL (e.g. http://localhost:5173)
   ```
3. Open **two** browser windows/tabs. Copy each tabs **User ID** and **Public Key** to the other. Set the other party as the recipient, type, send.

## How it works
- On first load, the client generates an X25519 keypair and stores it in `localStorage`.
- You paste your peers public key to establish a shared key (ECDH  BLAKE2b KDF, contexttagged).
- Messages are sealed with `XChaCha20Poly1305` (nonce + ciphertext), base64wrapped, and relayed via WebSocket to the recipient ID.
- The relay performs no crypto and cannot decrypt (but sees metadata like sender/recipient IDs and timing).

## Threat model (v0)
**Assumptions**
- Keys are generated with a trusted libsodium RNG in a noncompromised browser.
- Public keys are verified outofband (paste/QR). No automatic trust on first use.

**What this defends**
- Passive network observers (plaintext is never transmitted).
- Relay compromise w.r.t. message contents (ciphertext only).

**What it does NOT defend**
- **Metadata privacy** (relay sees IDs, timing, sizes).
- **Endpoint compromise** (malware/extension can read keys/messages).
- **Active MITM** during key exchange if you dont verify the peer key outofband.
- **Forward secrecy across sessions** (v0 uses static longlived keys; rotate manually per session for PFS).

## Legal & ethical use
- Educational/lab use on systems you control.
- You are responsible for **complying with local laws on cryptography and export controls**.
- Do not use to conceal illegal activity or violate organizational policies.
- No warranty; security is not guaranteed.

## Roadmap
- Ephemeral session keys (X25519 ephemeral + rekey per conversation) for PFS.
- Minimal deniability & doubleratchet.
- Message authentication with sender identity keys.
- Envelope versioning, attachments, and offline queueing.

## License
MIT (see `LICENSE`).
