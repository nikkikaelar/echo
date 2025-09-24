import React, { useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { connect } from './transport/ws';
import { generateKeypair, deriveSharedKey, toB64, fromB64, utf8 } from './crypto/sodium';
import { seal, open } from './crypto/envelope';

function useLocalStorage(key: string, initial: string) {
  const [v, setV] = useState(() => localStorage.getItem(key) ?? initial);
  useEffect(() => { localStorage.setItem(key, v); }, [key, v]);
  return [v, setV] as const;
}

export default function App() {
  const [userId, setUserId] = useLocalStorage('userId', nanoid(8));
  const [peerId, setPeerId] = useLocalStorage('peerId', '');
  const [peerPubB64, setPeerPubB64] = useLocalStorage('peerPub', '');
  const [message, setMessage] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const myKeysRef = useRef<{ pub: Uint8Array; sec: Uint8Array } | null>(null);
  const sharedKeyRef = useRef<Uint8Array | null>(null);

  useEffect(() => { (async () => {
    // Load / generate keypair once
    let pubB64 = localStorage.getItem('pub');
    let secB64 = localStorage.getItem('sec');
    if (!pubB64 || !secB64) {
      const kp = await generateKeypair();
      pubB64 = await toB64(kp.publicKey);
      secB64 = await toB64(kp.secretKey);
      localStorage.setItem('pub', pubB64);
      localStorage.setItem('sec', secB64);
    }
    myKeysRef.current = { pub: await fromB64(pubB64), sec: await fromB64(secB64) };
  })(); }, []);

  // compute/refresh shared key when peer public key changes
  useEffect(() => { (async () => {
    if (!peerPubB64 || !myKeysRef.current) { sharedKeyRef.current = null; return; }
    try {
      const theirPub = await fromB64(peerPubB64.trim());
      sharedKeyRef.current = await deriveSharedKey(myKeysRef.current.sec, theirPub);
    } catch {
      sharedKeyRef.current = null;
    }
  })(); }, [peerPubB64]);

  // Connect WS
  const ws = useMemo(() => connect(userId, async (incoming) => {
    if (incoming.t === 'ack') {
      setLog((L) => [
        `[relay] connected as ${incoming.userId}`,
        ...L,
      ]);
    } else if (incoming.t === 'err') {
      setLog((L) => [`[relay:err] ${incoming.error}`, ...L]);
    } else if (incoming.t === 'msg') {
      if (!sharedKeyRef.current) {
        setLog((L) => [`[from ${incoming.from}] <cannot decrypt; set peer key>`, ...L]);
        return;
      }
      try {
        const payload = await fromB64(incoming.data);
        const pt = await open(payload, sharedKeyRef.current);
        setLog((L) => [`[from ${incoming.from}] ${new TextDecoder().decode(pt)}`, ...L]);
      } catch {
        setLog((L) => [`[from ${incoming.from}] <decrypt failed>`, ...L]);
      }
    }
  }), [userId]);

  async function send() {
    if (!peerId) { setLog((L) => ['[ui] set recipient ID', ...L]); return; }
    if (!sharedKeyRef.current) { setLog((L) => ['[ui] set valid peer public key', ...L]); return; }
    const pt = await utf8(message);
    const sealed = await seal(pt, sharedKeyRef.current);
    const b64 = await toB64(sealed);
    ws.send(peerId.trim(), b64);
    setLog((L) => [`[to ${peerId}] ${message}`, ...L]);
    setMessage('');
  }

  return (
    <div className="frame">
      <div className="title">Sentinel — E2E Chat (MVP)</div>
      <div className="rule"></div>
      <div className="subtitle">Educational only. Verify peer keys out-of-band. Relay sees metadata.</div>

      <section className="grid">
        <div className="box">
          <h3>Your Identity</h3>
          <label>User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />

          <label>Your Public Key (share this)</label>
          <textarea readOnly value={localStorage.getItem('pub') || ''} />
        </div>
        <div className="box">
          <h3>Peer</h3>
          <label>Recipient User ID</label>
          <input value={peerId} onChange={(e) => setPeerId(e.target.value)} />

          <label>Peer Public Key (paste here)</label>
          <textarea value={peerPubB64} onChange={(e) => setPeerPubB64(e.target.value)} />
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <label>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="actions">
          <button onClick={send}>Send</button>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Log</h3>
        <div className="log">
          {log.map((l, i) => (<div key={i}>{l}</div>))}
        </div>
      </section>
    </div>
  );
}
