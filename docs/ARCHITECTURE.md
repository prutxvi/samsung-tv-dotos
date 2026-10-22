# Architecture

## Launcher (`launcher/index.html`)
- A Tizen web app with `tv-samsung` profile privileges for launching other apps (`application.launch`), listing apps (`application.info`) and remote keys (`tv.inputdevice`).
- Everything is drawn on `<canvas>` by a small `DotGrid` renderer. Each dot eases toward its target brightness, so changes ripple across the grid instead of snapping. The renderer only animates while something is changing, which keeps the CPU idle on a 1 GB TV.
- Settings (dock order, accent, clock and so on) are kept in `localStorage`.

## Doom (`launcher/doom.html`)
- `doom.wasm` exposes `initGame`/`tickGame`/`reportKeyDown`/`reportKeyUp` and calls back `drawFrame(ptr)`.
- Frames are uploaded as a **WebGL texture**, and a fragment shader swaps the B and R channels. A 2D-canvas `putImageData` silently draws nothing on this TV at that size; see LESSONS.
- A virtual game clock hands Doom exactly one tic per call, so it never busy-waits inside `tickGame`.

## Phone remote
- The TV generates a random 20-character room ID and shows it as a dot-drawn QR code.
- **Local path (default):** a Tizen **background service** (`launcher/service/service.js`, Node v4.4.3) serves the controller page on `:8090` and relays WebSocket messages between the phone and the launcher. It uses a hand-rolled WebSocket implementation, because there is no npm on the TV.
- **Cloud path (backup):** a Cloudflare Worker plus a Durable Object per room (WebSocket Hibernation, SQLite-backed) speaks the same protocol.
- Protocol: phone → `{t:'k', c:keyCode, d:1|0}`, `{t:'cmd', v:'home'}`; TV → `{t:'screen', s:'home|panel|mgr|game|doom|browser'}` so the phone can switch layouts.

## TV Browser+
A TizenBrew "mods" module, injected into every page TizenBrew opens. An https page can't reach the TV's local `http`/`ws` service (that counts as mixed content). So the start page owns its own room and pairs through the cloud relay, then tries a **direct WebRTC data channel** to the phone: moves go over an unordered channel with no retransmits, everything else over a reliable one.
