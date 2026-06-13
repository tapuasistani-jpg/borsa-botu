import WebSocket from "ws";

const WS_URL =
  "wss://data.tradingview.com/socket.io/websocket?type=web_chart";

function wrapMessage(payload: object): string {
  const body = JSON.stringify(payload);
  return `~m~${body.length}~m~${body}`;
}

function parseMessages(raw: string): object[] {
  const results: object[] = [];
  const parts = raw.split(/~m~\d+~m~/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.startsWith("~h~")) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // heartbeat veya gecersiz paket
    }
  }

  return results;
}

export interface TradingViewSession {
  ws: WebSocket;
  quoteSession: string;
  chartSession: string;
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

export function connectTradingView(timeoutMs = 8000): Promise<TradingViewSession> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, {
      headers: {
        Origin: "https://www.tradingview.com",
      },
    });

    const quoteSession = randomId("qs");
    const chartSession = randomId("cs");
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.terminate();
        reject(new Error("TradingView baglantisi zaman asimina ugradi."));
      }
    }, timeoutMs);

    ws.on("open", () => {
      ws.send(wrapMessage({ m: "set_auth_token", p: ["unauthorized_user_token"] }));
      ws.send(wrapMessage({ m: "set_locale", p: ["en", "US"] }));
      ws.send(wrapMessage({ m: "chart_create_session", p: [chartSession, ""] }));
      ws.send(wrapMessage({ m: "quote_create_session", p: [quoteSession] }));
      ws.send(wrapMessage({ m: "quote_set_fields", p: [
            quoteSession,
            "ch",
            "chp",
            "lp",
            "lp_time",
            "volume",
            "description",
            "short_name",
          ],
        })
      );

      settled = true;
      clearTimeout(timer);
      resolve({ ws, quoteSession, chartSession });
    });

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

export function send(ws: WebSocket, method: string, params: unknown[]) {
  ws.send(wrapMessage({ m: method, p: params }));
}

export function collectMessages(
  ws: WebSocket,
  timeoutMs: number,
  onPacket: (packet: Record<string, unknown>) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const onMessage = (data: WebSocket.RawData) => {
      const text = data.toString();
      if (/~h~/.test(text)) {
        ws.send(text);
        return;
      }

      for (const packet of parseMessages(text)) {
        onPacket(packet as Record<string, unknown>);
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
    };

    ws.on("message", onMessage);
    ws.on("error", onError);
  });
}

export function closeSession(session: TradingViewSession) {
  try {
    session.ws.removeAllListeners();
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.close();
    } else {
      session.ws.terminate();
    }
  } catch {
    // ignore
  }
}

export { wrapMessage, parseMessages };
