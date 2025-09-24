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

type ServerMsg =
  | { t: 'ack'; userId: string }
  | { t: 'msg'; from: string; data: string }
  | { t: 'err'; error: string };

const wss = new WebSocketServer({ port: PORT });
console.log(`[relay] listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  let userId: string | null = null;

  ws.on('message', (buf) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(buf));
    } catch (e) {
      return safeSend(ws, { t: 'err', error: 'bad_json' } satisfies ServerMsg);
    }

    if (msg.t === 'hello') {
      if (!msg.userId || typeof msg.userId !== 'string') {
        return safeSend(ws, { t: 'err', error: 'missing_userId' } satisfies ServerMsg);
      }
      userId = msg.userId;
      clients.set(userId, ws);
      safeSend(ws, { t: 'ack', userId } satisfies ServerMsg);
      return;
    }

    if (msg.t === 'relay') {
      if (!userId) {
        return safeSend(ws, { t: 'err', error: 'hello_first' } satisfies ServerMsg);
      }
      const dest = clients.get(msg.to);
      if (!dest) {
        return safeSend(ws, { t: 'err', error: 'recipient_offline' } satisfies ServerMsg);
      }
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

  ws.on('error', () => {/* noop */});
});
