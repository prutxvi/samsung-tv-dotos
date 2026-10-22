# DotOS for Samsung TVs

A custom home screen, Doom at 34 fps, Snake and a phone remote for a **2020 Samsung Smart TV**. Everything is installed over Wi-Fi from a laptop, without rooting the TV.

> Built by **prutxvi** with **Claude** (Anthropic's AI). I set the direction and made the calls. Claude did the network scanning, the reverse engineering, the code and the debugging.

![DotOS launcher](docs/media/hero.jpg)

<p align="center">
  <img src="docs/media/clock-ripple.gif" width="49%" alt="The dot clock rippling as the minute changes">
  <img src="docs/media/phone-doom.gif" width="49%" alt="Playing Doom on the TV with the phone as the controller">
</p>

## What's inside

| Part | What it does |
|---|---|
| **Launcher** (`launcher/`) | A dot-matrix home screen in the style of Nothing OS: a rippling dot clock, a seconds bar, weather, and a dock of dot icons. Any installed app can go in the dock, and each one gets an auto-generated dot icon. Customise colours, clock and layout with the remote. |
| **Doom** (`launcher/doom.html`, `doom-build/`) | The 1993 shareware Doom, compiled to WebAssembly and drawn through WebGL. An LED "dot" mode is optional. It runs at **34 fps** on the TV; Doom's own cap is 35. |
| **Snake** | Dot-matrix Snake inside the launcher. Your best score is saved. |
| **Phone remote** (`launcher/service/`, `relay/`) | Scan the QR code on the TV and your phone becomes the controller. The layout changes with what's on screen: a D-pad, a swipe pad, or a joystick plus FIRE for Doom. It uses a local server on the TV (**about 10 ms** over Wi-Fi), with a Cloudflare relay as backup. |
| **TV Browser+** ([separate repo](https://github.com/prutxvi/tv-browser-plus)) | A TizenBrew module that adds a remote cursor, link-to-link "jump mode", per-site zoom, and a phone touchpad and keyboard to any website. |

**Tested on:** Samsung UA43T5310 (2020, Tizen 5.5, Chromium 94 web engine, 4 cores, ~1 GB RAM). It should work on other Tizen 3–6 TVs. Tizen 7 and later need a Samsung certificate for signing.

## The numbers

| | Before | After | How |
|---|---|---|---|
| Doom frame rate on the TV | 18 fps | **34 fps** | Rebuilt the engine: native 320×200 instead of 640×400, a rewritten palette copy, `-O3` instead of `-Os` |
| Doom time per frame | 53 ms | **4.4 ms** | Profiling showed 90% of the time in one pixel-copy function |
| Phone to TV latency | ~80 ms (via Singapore) | **~10 ms** | A WebSocket server running on the TV itself |

## How it works

```
 phone ──scan QR──▶ http://<tv>:8090/r/<room>          (served by the TV)
   │                                                      │
   └──── WebSocket (same Wi-Fi, ~10 ms) ──▶ TV background service (Node 4)
                                                          │
                                   launcher page ◀────────┘  key events
   (backup) phone ──▶ Cloudflare Worker + Durable Object room ──▶ launcher
```

More detail is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Install it on your TV
See [docs/SETUP.md](docs/SETUP.md). In short: turn on Developer Mode on the TV, install Samsung's Tizen CLI, sign the `launcher/` folder, and install it over Wi-Fi. That takes about 30 minutes the first time.

## Things that bit us
The black screens, a 90% hot spot and similar traps are collected in [docs/LESSONS.md](docs/LESSONS.md). Read it before you build anything for a Tizen TV.

## What it can't do
- It can't replace Samsung's Home bar or start automatically at boot. That's a Samsung restriction; pin it as the first app instead.
- No root and no custom firmware. Nothing here modifies the TV's system.
- Google sign-in is refused inside the TV's built-in browser engine.

## Credits and licences
- Our code (launcher, phone remote, relay): **MIT**, see [LICENSE](LICENSE).
- Doom engine: [jacobenget/doom.wasm](https://github.com/jacobenget/doom.wasm), built on [doomgeneric](https://github.com/ozkl/doomgeneric). **GPL-2.0**. Our changes are in `doom-build/`.
- Doom shareware WAD (v1.9, freely distributable), id Software.
- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT.
- Inspiration and tooling: [TizenBrew](https://github.com/reisxd/TizenBrew) by reisxd.

See [NOTICE](NOTICE) for the full third-party list.
