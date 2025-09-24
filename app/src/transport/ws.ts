export type Incoming =
  | { t: 'ack'; userId: string }
  | { t: 'msg'; from: string; data: string }
  | { t: 'err'; error: string };

export type Outgoing =
  | { t: 'hello'; userId: string }
  | { t: 'relay'; to: string; data: string };

export function connect(userId: string, onMessage: (m: Incoming) => void) {
  const url = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:8787';
  const ws = new WebSocket(url);
  ws.addEventListener('open', () => {
    const hello: Outgoing = { t: 'hello', userId };
    ws.send(JSON.stringify(hello));
  });
  ws.addEventListener('message', (ev) => {
    try { onMessage(JSON.parse(String(ev.data)) as Incoming); } catch {}
  });
  return {
    send(to: string, dataB64: string) {
      const msg: Outgoing = { t: 'relay', to, data: dataB64 };
      ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
    }
  };
}
