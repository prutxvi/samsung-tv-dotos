Fast doom.wasm for the TV, built from github.com/jacobenget/doom.wasm (commit 31cc1af, GPL-2.0).

Changes vs upstream:
  doomgeneric/doomgeneric.h   DOOMGENERIC_RESX/RESY 640x400 -> 320x200 (the TV's GPU scales it up)
  doomgeneric/src/i_video.c   cmap_to_fb rewritten as a 256-entry palette lookup writing 32-bit pixels
  Makefile CFLAGS             -Os -> -O3

Result on the Samsung UA43T5310: 18 fps / 53 ms per frame -> 34 fps / 4.4 ms per frame.

Build (no Docker needed): WASI-SDK 24 (arm64 macOS) as CC, Homebrew binaryen for wasm-as/merge/metadce,
Python 3.12+ on PATH as `python`, then `make build/doom.wasm` with CFLAGS="--target=wasm32-unknown-wasi -Wall -O3".
