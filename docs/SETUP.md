# Setup

This takes about 30 minutes the first time. You need a Samsung Tizen TV (Tizen 3–6), a Mac, Linux or Windows computer on the same Wi-Fi, and Node.js (only for the optional relay).

## 1. Turn on Developer Mode on the TV
1. On the TV, open **Apps** and press **1 2 3 4 5** on the remote. Use the on-screen keypad if your remote has no number keys.
2. Set **Developer mode: On** and **Host PC IP** to your computer's IP address.
3. Hold **Power** for about 5 seconds until the Samsung logo appears. A short press only puts the TV to sleep, and the setting won't apply.

## 2. Install Samsung's Tizen CLI
Download "Tizen Studio CLI" (the `web-cli_…` installer) from download.tizen.org and install it:
```bash
bash web-cli_Tizen_Studio_6.1_macos-64.bin --accept-license ~/tizen-studio
T=~/tizen-studio/tools/ide/bin/tizen; S=~/tizen-studio/tools/sdb
```

## 3. Create a signing profile (once)
```bash
$T certificate -a mytv -p <password> -c IN -n MyTV -f mytv
$T security-profiles add -n MyTV -a ~/tizen-studio-data/keystore/author/mytv.p12 -p <password>
$T cli-config "profiles.path=$HOME/tizen-studio-data/profile/profiles.xml"
```
Tizen 3–6 TVs in Developer Mode accept this Tizen author certificate. Tizen 7 and later need a Samsung certificate.

## 4. Build and install the launcher
```bash
$S connect <tv-ip>
$T package -t wgt -s MyTV -o out -- launcher
$T install -n Home.wgt -- out -s <tv-ip>:26101
$T run -p PvHomeLnch.Home -s <tv-ip>:26101
```
Before you reinstall, always kill the running copy: `$S -s <tv-ip>:26101 shell 0 was_kill PvHomeLnch.Home`. Otherwise the TV resumes the old window and you'll think the new build is broken.

## 5. (Optional) Deploy the cloud relay
The phone remote works over Wi-Fi without the relay. The relay is the backup for phones that aren't on your Wi-Fi.
```bash
cd relay
cp src/bookmarks.example.js src/bookmarks.js   # your start-page tiles
npx wrangler login
npx wrangler deploy
```
Then change `CLOUD` in `launcher/remote.js` to your own `*.workers.dev` hostname. It runs on Cloudflare's free plan; an hour of Doom uses roughly 1% of the daily allowance.

## 6. (Optional) Rebuild Doom
See [`doom-build/README.txt`](../doom-build/README.txt).
