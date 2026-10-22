import { DurableObject } from "cloudflare:workers";
import { PHONE_HTML } from "./phone.js";
import { START_HTML } from "./start.js";

// One Room per TV. The TV and any phones that scanned its QR code join the same
// room; phone key presses are relayed to the TV, and the TV tells phones which
// screen it is on so they can switch controller layout.

const ROOM_RE = /^[a-z0-9]{12,32}$/;
// Message types a phone may send to the TV: keys, launcher commands, and the
// TV Browser+ touchpad / keyboard / navigation messages.
const PHONE_TYPES = new Set(["k", "cmd", "mv", "tap", "scroll", "text", "key", "go", "nav", "zoom", "rtc", "ping"]);
// Message types the TV may send to phones: its screen, WebRTC setup for the
// direct phone↔TV link, and replies to latency pings.
const TV_TYPES = new Set(["rtc", "pong"]);

export class Room extends DurableObject {
  async fetch(request) {
    const role = new URL(request.url).searchParams.get("role") === "tv" ? "tv" : "phone";
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [role]);

    if (role === "phone") {
      const screen = (await this.ctx.storage.get("screen")) || "home";
      server.send(JSON.stringify({ t: "screen", s: screen, tv: this.ctx.getWebSockets("tv").length > 0 }));
    } else {
      server.send(JSON.stringify({ t: "phones", n: this.ctx.getWebSockets("phone").length }));
      this.toPhones({ t: "tv", on: true });
    }
    if (role === "phone") this.toTv({ t: "phones", n: this.ctx.getWebSockets("phone").length });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > 8192) return;   // SDP offers are a few KB
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    const role = this.ctx.getTags(ws)[0];

    if (role === "phone" && PHONE_TYPES.has(msg.t)) {
      this.toTv(msg);
    } else if (role === "tv" && TV_TYPES.has(msg.t)) {
      this.toPhones(msg);
    } else if (role === "tv" && msg.t === "screen" && typeof msg.s === "string") {
      await this.ctx.storage.put("screen", msg.s.slice(0, 16));
      this.toPhones({ t: "screen", s: msg.s.slice(0, 16) });
    }
  }

  async webSocketClose(ws) {
    const role = this.ctx.getTags(ws)[0];
    const others = (tag) => this.ctx.getWebSockets(tag).filter((w) => w !== ws).length;
    if (role === "phone") this.toTv({ t: "phones", n: others("phone") });
    else if (others("tv") === 0) this.toPhones({ t: "tv", on: false });
  }

  toTv(msg) { this.send("tv", msg); }
  toPhones(msg) { this.send("phone", msg); }
  send(tag, msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets(tag)) {
      try { ws.send(data); } catch {}
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, kind, room] = url.pathname.split("/");

    if (kind === "browser") {
      return new Response(START_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (kind === "r" && ROOM_RE.test(room || "")) {
      return new Response(PHONE_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (kind === "ws" && ROOM_RE.test(room || "")) {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
      return env.ROOMS.getByName(room).fetch(request);
    }
    return new Response("TV remote", { status: 404 });
  },
};
