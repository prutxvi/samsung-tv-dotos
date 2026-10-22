import { BOOKMARKS } from "./bookmarks.js";

// TV Browser+ start page — what TizenBrew opens first. The injected module
// script adds the cursor and phone control on top of this page and every
// page reached from it.
export const START_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>TV Browser+</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Doto:wght@900&family=Space+Mono&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#000;color:#fff;overflow:hidden}
body{font-family:"Space Mono",monospace;background-image:radial-gradient(circle,#151515 1.6px,transparent 1.8px);background-size:24px 24px;padding:90px 110px}
.doto{font-family:"Doto","Space Mono",monospace;font-weight:900;letter-spacing:5px;text-transform:uppercase}
h1{font-size:84px}
h1 i{display:inline-block;width:22px;height:22px;border-radius:50%;background:#ff2a2a;margin-left:18px;vertical-align:middle;animation:p 1.6s infinite}
@keyframes p{50%{opacity:.2}}
.sub{font-size:24px;color:#666;margin:14px 0 56px;letter-spacing:3px}
#grid{display:grid;grid-template-columns:repeat(5,1fr);gap:28px}
#grid a{display:flex;flex-direction:column;justify-content:flex-end;height:170px;padding:24px;border-radius:26px;background:#111;border:2px solid #1f1f1f;color:#fff;text-decoration:none}
#grid a b{font-size:30px}
#grid a span{font-size:18px;color:#666;margin-top:6px}
#grid a:hover{border-color:#fff;background:#1a1a1a}
#pair{position:absolute;right:110px;top:70px;text-align:center}
#pair canvas{display:block;background:#000}
#pairl{font-size:16px;color:#666;margin-top:12px;letter-spacing:3px}
#help{position:absolute;left:110px;right:110px;bottom:70px;display:flex;justify-content:space-between;font-size:20px;color:#555;letter-spacing:3px}
#help b{color:#fff}
</style></head><body>
<h1 class="doto">TV Browser+<i></i></h1>
<div class="sub doto">Scan the code with your phone to use it as a touchpad &amp; keyboard</div>
<div id="pair"><canvas id="pairqr" width="1" height="1"></canvas><div id="pairl" class="doto">Scan to control</div></div>
<div id="grid">
${BOOKMARKS}</div>
<div id="help" class="doto">
  <span><b>Arrows</b> move cursor</span><span><b>OK</b> click</span><span><b>CH ▲▼</b> scroll</span>
  <span><b>Back</b> go back</span><span><b>Yellow</b> jump links</span><span><b>Red</b> cursor on/off</span><span><b>Green</b> this page</span>
</div>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
</body></html>`;
