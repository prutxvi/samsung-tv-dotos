// Phone control. The TV joins its private room on two relays at once:
//  - local: the background service on this TV (phones on the same Wi-Fi, ~10 ms)
//  - cloud: the Cloudflare Worker (phones anywhere, ~80 ms)
// A phone uses whichever one its QR link pointed at.
var Remote = (function(){
  // Your relay's hostname after `npx wrangler deploy` in relay/ (see docs/SETUP.md). Optional: the
  // local Wi-Fi link works without it.
  var CLOUD = 'tv-remote.YOUR-SUBDOMAIN.workers.dev', LOCAL_PORT = 8090, SERVICE = 'PvHomeLnch.Remote';

  function room(){
    var id = '';
    try { id = localStorage.getItem('pvroom') || ''; } catch (e) {}
    if (!/^[a-z0-9]{20}$/.test(id)) {
      var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', bytes = new Uint8Array(20);
      crypto.getRandomValues(bytes);
      id = '';
      for (var i = 0; i < 20; i++) id += chars.charAt(bytes[i] % chars.length);
      try { localStorage.setItem('pvroom', id); } catch (e) {}
    }
    return id;
  }

  function startService(){
    try {
      tizen.application.launchAppControl(new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/service'), SERVICE,
        function(){}, function(){});
    } catch (e) {}
  }

  // Tell the local service our room so TV Browser+ pages can join it.
  function registerRoom(tries){
    var x = new XMLHttpRequest();
    x.open('GET', 'http://127.0.0.1:' + LOCAL_PORT + '/room?set=' + room());
    x.onerror = function(){ if (tries < 10) setTimeout(function(){ registerRoom(tries + 1); }, 1000); };
    x.send();
  }

  // The TV's Wi-Fi address, as seen by the local service. Calls back with '' if unavailable.
  function lanIp(cb, tries){
    var x = new XMLHttpRequest();
    x.open('GET', 'http://127.0.0.1:' + LOCAL_PORT + '/ip');
    x.timeout = 1500;
    x.onload = function(){ cb(x.responseText.trim()); };
    x.onerror = x.ontimeout = function(){
      if ((tries || 0) < 8) setTimeout(function(){ lanIp(cb, (tries || 0) + 1); }, 800);
      else cb('');
    };
    x.send();
  }

  // opts: screen() -> current screen name, key(code, down), cmd(name), phones(count)
  function start(opts){
    var counts = {};
    function link(name, url){
      var ws = null, retry = 1000, sent = '', ignoreUntil = 0;
      // A paused app gets its queued phone presses all at once when it comes
      // back; drop those, and re-announce our screen so the phone switches back.
      document.addEventListener('visibilitychange', function(){
        if (!document.hidden) { ignoreUntil = Date.now() + 700; sent = ''; }
      });
      function connect(){
        try { ws = new WebSocket(url); } catch (e) { return setTimeout(connect, retry); }
        ws.onopen = function(){ retry = 1000; sent = ''; sync(); };
        ws.onmessage = function(ev){
          var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m.t === 'k' && typeof m.c === 'number') { if (Date.now() >= ignoreUntil) opts.key(m.c, !!m.d); }
          else if (m.t === 'cmd' && opts.cmd) opts.cmd(m.v);
          else if (m.t === 'phones') {
            counts[name] = m.n;
            if (opts.phones) opts.phones((counts.local || 0) + (counts.cloud || 0));
          }
        };
        ws.onclose = function(){ ws = null; setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); };
      }
      // Tell phones which screen we're on so they show the matching controls.
      function sync(){
        var s = opts.screen();
        if (s !== sent && ws && ws.readyState === 1) { ws.send(JSON.stringify({ t: 'screen', s: s })); sent = s; }
      }
      setInterval(sync, 300);
      connect();
    }
    startService();
    registerRoom(0);
    link('local', 'ws://127.0.0.1:' + LOCAL_PORT + '/ws/' + room() + '?role=tv');
    link('cloud', 'wss://' + CLOUD + '/ws/' + room() + '?role=tv');
  }

  // Calls back with the link the QR should encode.
  function phoneUrl(local, cb){
    var cloud = 'https://' + CLOUD + '/r/' + room();
    if (!local) return cb(cloud, false);
    startService();
    lanIp(function(ip){ cb(ip ? 'http://' + ip + ':' + LOCAL_PORT + '/r/' + room() : cloud, !!ip); });
  }

  return { start: start, phoneUrl: phoneUrl };
})();
