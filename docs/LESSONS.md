# Lessons from building on a 2020 Samsung Tizen TV

1. **Unsigned `.wgt` packages hang silently** at "Installing package". Sign with a Tizen CLI security profile.
2. **A `<tizen:allow-navigation>` entry in config.xml gave a black page with no JS running.** Start from a known-good config.xml (TizenBrew's) rather than writing one from memory.
3. **Reinstalling doesn't restart the app.** Tizen resumes the old running window, so run `was_kill` before every install.
4. **There's no debugger from the computer.** Have the app send a "beacon" to a tiny HTTP listener on your laptop (`new Image().src = 'http://<laptop>:8765/log?…'`).
5. **`putImageData` on a large canvas draws nothing** on this TV (it's GPU-backed). Small canvases work fine. Use WebGL textures.
6. **Measure on the TV, not your laptop.** A fix that looked 20× faster on the laptop did nothing on the TV, because the laptop was measuring a different scene.
7. **Profile before optimising.** One function, doomgeneric's `cmap_to_fb`, was 90% of Doom's frame time. It wrote each pixel byte by byte, 16 times per source pixel.
8. **Background services run Node v4.4.3**: ES5 only, `new Buffer`, no npm.
9. **https pages can't reach `http://127.0.0.1`** from the TV's browser (mixed content). Use a secure relay or WebRTC.
10. **The TV can drop off Wi-Fi in standby.** Turn off Auto Power Off and turn on Power On with Mobile.
11. **TizenBrew injection needs Host PC IP = `127.0.0.1`**, but installing from a laptop needs the laptop's IP. Plan your switches.
12. **jsDelivr caches files for hours.** Ship each release of a TizenBrew module under a new file name.
