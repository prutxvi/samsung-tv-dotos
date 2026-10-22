// Local phone-control server, running on the TV as a Tizen background service
// (Node v4.4.3, so plain ES5 and no npm packages).
//
// Phones on the same Wi-Fi load the controller from http://<tv-ip>:8090/r/<room>
// and talk to the TV over a WebSocket here, skipping the internet relay. The
// protocol matches the Cloudflare relay so the TV and phone code is shared.
'use strict';

var PORT = 8090;
var ROOM_RE = /^[a-z0-9]{12,32}$/;
var GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
// Message types a phone may send to the TV (keys, launcher commands, TV Browser+).
var PHONE_TYPES = { k: 1, cmd: 1, mv: 1, tap: 1, scroll: 1, text: 1, key: 1, go: 1, nav: 1, zoom: 1 };

module.exports.onStart = function () {
  var http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
  var phoneHtml = fs.readFileSync(path.join(__dirname, 'phone.html'));
  var rooms = {};
  // The launcher registers its room here so pages opened by TizenBrew (TV Browser+)
  // can join the same room as the phone. Kept on disk to survive TV restarts.
  var roomFile = path.join(os.homedir ? os.homedir() : '/tmp', 'pvhome-room.txt'), tvRoom = '';
  try { tvRoom = fs.readFileSync(roomFile, 'utf8').trim(); } catch (e) {}

  function lanIp() {
    var ifs = os.networkInterfaces();
    for (var name in ifs) {
      for (var i = 0; i < ifs[name].length; i++) {
        var a = ifs[name][i];
        if (a.family === 'IPv4' && !a.internal) return a.address;
      }
    }
    return '';
  }

  var server = http.createServer(function (req, res) {
    var parts = req.url.split('?')[0].split('/');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (parts[1] === 'r' && ROOM_RE.test(parts[2] || '')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(phoneHtml);
    }
    if (parts[1] === 'ip') return res.end(lanIp());
    if (parts[1] === 'room') {
      // Only apps on the TV itself may read or set the room, never other devices on the Wi-Fi.
      if (!/^(::ffff:)?127\.0\.0\.1$/.test(req.socket.remoteAddress || '')) { res.writeHead(403); return res.end(); }
      var q = (req.url.split('?')[1] || '').match(/(?:^|&)set=([a-z0-9]{12,32})/);
      if (q && q[1] !== tvRoom) { tvRoom = q[1]; try { fs.writeFileSync(roomFile, tvRoom); } catch (e) {} }
      return res.end(tvRoom);
    }
    res.writeHead(404);
    res.end('TV remote');
  });

  server.on('upgrade', function (req, socket) {
    var url = req.url.split('?'), parts = url[0].split('/');
    var key = req.headers['sec-websocket-key'];
    if (parts[1] !== 'ws' || !ROOM_RE.test(parts[2] || '') || !key) return socket.destroy();
    var accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.setNoDelay(true);
    join(parts[2], /role=tv/.test(url[1] || '') ? 'tv' : 'phone', socket);
  });

  // ---------- rooms (same messages as the Cloudflare relay) ----------
  function room(id) { return rooms[id] || (rooms[id] = { tv: [], phone: [], screen: 'home' }); }
  function sendAll(list, msg) { var s = JSON.stringify(msg); list.forEach(function (c) { c.send(s); }); }

  function join(id, role, socket) {
    var r = room(id), conn = wrap(socket);
    r[role].push(conn);
    if (role === 'phone') {
      conn.send(JSON.stringify({ t: 'screen', s: r.screen, tv: r.tv.length > 0 }));
      sendAll(r.tv, { t: 'phones', n: r.phone.length });
    } else {
      conn.send(JSON.stringify({ t: 'phones', n: r.phone.length }));
      sendAll(r.phone, { t: 'tv', on: true });
    }
    conn.onmessage = function (text) {
      if (text.length > 512) return;
      var m; try { m = JSON.parse(text); } catch (e) { return; }
      if (role === 'phone' && PHONE_TYPES[m.t]) sendAll(r.tv, m);
      else if (role === 'tv' && m.t === 'screen' && typeof m.s === 'string') { r.screen = m.s.slice(0, 16); sendAll(r.phone, { t: 'screen', s: r.screen }); }
    };
    conn.onclose = function () {
      var i = r[role].indexOf(conn);
      if (i !== -1) r[role].splice(i, 1);
      if (role === 'phone') sendAll(r.tv, { t: 'phones', n: r.phone.length });
      else if (!r.tv.length) sendAll(r.phone, { t: 'tv', on: false });
    };
  }

  // ---------- minimal WebSocket framing (text, ping, close) ----------
  function wrap(socket) {
    var conn = { onmessage: null, onclose: null }, buf = new Buffer(0), closed = false;
    function frame(opcode, payload) {
      var len = payload.length, head;
      if (len < 126) { head = new Buffer(2); head[1] = len; }
      else if (len < 65536) { head = new Buffer(4); head[1] = 126; head.writeUInt16BE(len, 2); }
      else return;
      head[0] = 0x80 | opcode;
      try { socket.write(Buffer.concat([head, payload])); } catch (e) {}
    }
    conn.send = function (text) { if (!closed) frame(1, new Buffer(text, 'utf8')); };
    function close() {
      if (closed) return; closed = true;
      try { socket.destroy(); } catch (e) {}
      if (conn.onclose) conn.onclose();
    }
    socket.on('data', function (chunk) {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        var opcode = buf[0] & 0x0f, masked = buf[1] & 0x80, len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) return close();
        var need = off + (masked ? 4 : 0) + len;
        if (buf.length < need) return;
        var payload = buf.slice(off + (masked ? 4 : 0), need);
        if (masked) { var mask = buf.slice(off, off + 4); for (var i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]; }
        buf = buf.slice(need);
        if (opcode === 1 && conn.onmessage) conn.onmessage(payload.toString('utf8'));
        else if (opcode === 9) frame(10, payload);
        else if (opcode === 8) return close();
      }
    });
    socket.on('close', close);
    socket.on('error', close);
    return conn;
  }

  // A second launch of the service finds the port taken; the first copy keeps serving.
  server.on('error', function () {});
  server.listen(PORT, '0.0.0.0');
};
module.exports.onRequest = function () {};
module.exports.onExit = function () {};
