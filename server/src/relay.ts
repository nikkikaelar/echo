import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

// In-memory connection map: userId -> ws
const clients = new Map<string, WebSocket>();

function safeSend(ws: WebSocket, obj: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

type HelloMsg = { t: 'hello'; userId: string };
type RelayMsg = { t: 'relay'; to: string; data: string };
type ClientMsg = HelloMsg | RelayMsg;
type AckMsg    = { t: 'ack'; userId: string };
type ErrMsg    = { t: 'err'; error: string };
type ServerMsg = AckMsg | ErrMsg | { t: 'msg'; from: string; data: string };

// ultra-light token bucket per remote address
const buckets = new Map<string, { t: number; tokens: number }>();
function allow(key: string, rate = 8, burst = 16) {
  const now = Date.now() / 1000;
  const b = buckets.get(key) ?? { t: now, tokens: burst };
  const tokens = Math.min(burst, b.tokens + (now - b.t) * rate);
  const ok = tokens >= 1;
  buckets.set(key, { t: now, tokens: ok ? tokens - 1 : tokens });
  return ok;
}

function isHello(x: any): x is HelloMsg {
  return x && x.t === 'hello' && typeof x.userId === 'string' && x.userId.length <= 64;
}
function isRelay(x: any): x is RelayMsg {
  return x && x.t === 'relay' && typeof x.to === 'string' && typeof x.data === 'string'
    && x.to.length <= 64 && x.data.length <= 8192; // cap size
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[relay] listening on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const rlKey = (req.socket.remoteAddress ?? 'unknown');
  let userId: string | null = null;

  ws.on('message', (raw) => {
    if (!allow(rlKey)) return; // best-effort drop
    let msg: unknown;
    try { msg = JSON.parse(String(raw)); } catch { return; }

    if (isHello(msg)) {
      userId = msg.userId;
      clients.set(userId, ws);
      safeSend(ws, { t: 'ack', userId } as AckMsg);
      return;
    }
    if (isRelay(msg)) {
      if (!userId) { safeSend(ws, { t: 'err', error: 'not_authenticated' } as ErrMsg); return; }
      const dest = clients.get(msg.to);
      if (!dest) { safeSend(ws, { t: 'err', error: 'recipient_offline' } as ErrMsg); return; }
      safeSend(dest, { t: 'msg', from: userId, data: msg.data } satisfies ServerMsg);
      return;
    }
    safeSend(ws, { t: 'err', error: 'unknown_type' } satisfies ServerMsg);
  });

  ws.on('close', () => {
    if (userId && clients.get(userId) === ws) {
      clients.delete(userId);
    }
  });

  ws.on('error', () => { /* noop */ });
});
