const HTML_APP = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VibeMap AR — v5.0</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<style>
/* ══ THEME ══════════════════════════════════ */
:root{--c:#00D4FF;--v:#7B2FFF;--m:#C840FF;--g:#00FF9C;--r:#FF4444;--y:#FFB347;--tl:#00FFD4;--o:#FF7A00}
[data-theme="dark"]{
  --bg:#03030D;--bg2:#06061A;--bg3:#0A0A24;
  --card:#07071E;--card2:#0C0C2C;--card3:#101030;
  --border:rgba(123,47,255,.22);--border2:rgba(123,47,255,.13);--border3:rgba(123,47,255,.07);
  --t:#E8EAFF;--t2:#9AA0CC;--t3:#5A6090;--mu:#3A3A60;
  --shadow:0 4px 24px rgba(0,0,0,.7);--glass:rgba(7,7,30,.78);--glass2:rgba(3,3,13,.92);
  --ph:#040414;--ph-b:rgba(123,47,255,.35);
  --topbar:rgba(3,3,13,.94);--inp:rgba(123,47,255,.1);--inp-b:rgba(123,47,255,.22);
  --kk-bg:#0A0A20;--kk-b:rgba(0,212,255,.35);--kk-t:var(--c);
}
[data-theme="light"]{
  --bg:#F2F3FF;--bg2:#E8EAFF;--bg3:#DDE0FF;
  --card:#FFFFFF;--card2:#F5F6FF;--card3:#EEF0FF;
  --border:rgba(123,47,255,.22);--border2:rgba(123,47,255,.14);--border3:rgba(123,47,255,.08);
  --t:#12143A;--t2:#3A3C70;--t3:#7878A8;--mu:#B8B8D8;
  --shadow:0 4px 20px rgba(100,100,200,.1);--glass:rgba(255,255,255,.82);--glass2:rgba(242,243,255,.96);
  --ph:#FFFFFF;--ph-b:rgba(123,47,255,.4);
  --topbar:rgba(242,243,255,.96);--inp:rgba(123,47,255,.07);--inp-b:rgba(123,47,255,.2);
  --kk-bg:#EEF0FF;--kk-b:rgba(123,47,255,.35);--kk-t:var(--v);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--t);font-family:'Tajawal',sans-serif;min-height:100vh;
  transition:background .35s,color .35s;
  background-image:radial-gradient(ellipse 150% 45% at 50% 0%,rgba(123,47,255,.06),transparent 65%);}
[data-theme="dark"] body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(rgba(123,47,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(123,47,255,.035) 1px,transparent 1px);
  background-size:38px 38px;}
/* ══ TOPBAR ══ */
.topbar{position:sticky;top:0;z-index:200;background:var(--topbar);border-bottom:1px solid var(--border2);
  backdrop-filter:blur(18px);height:56px;display:flex;align-items:center;gap:10px;padding:0 18px;
  transition:background .35s,border-color .35s;}
.tb-logo{font-size:17px;font-weight:900;background:linear-gradient(135deg,var(--c),var(--v));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;flex-shrink:0;}
.tb-ver{font-size:9px;font-family:'IBM Plex Mono',monospace;color:var(--t3);background:var(--card2);
  border:1px solid var(--border2);border-radius:6px;padding:2px 7px;flex-shrink:0;}
.tb-sp{flex:1}
.cl-pill{display:flex;align-items:center;gap:5px;background:rgba(0,255,156,.07);
  border:1px solid rgba(0,255,156,.2);border-radius:16px;padding:4px 12px;font-size:10px;
  color:var(--g);cursor:pointer;transition:background .2s;white-space:nowrap;flex-shrink:0;}
.cl-pill:hover{background:rgba(0,255,156,.14);}
.cl-dot{width:5px;height:5px;border-radius:50%;background:var(--g);animation:blink 1.5s ease infinite;flex-shrink:0;}
.theme-row{display:flex;gap:3px;flex-shrink:0;}
.th-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border2);background:none;
  cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;
  color:var(--t3);transition:all .2s;}
.th-btn.on{background:rgba(123,47,255,.2);border-color:var(--v);color:var(--t);}
/* ══ CHANGELOG ══ */
.cl-panel{display:none;background:var(--card);border-bottom:1px solid var(--border2);
  padding:16px 20px;animation:slideD .25s ease both;z-index:1;position:relative;}
.cl-panel.open{display:block;}
@keyframes slideD{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.cl-hdr{font-size:11px;font-weight:700;color:var(--g);margin-bottom:12px;}
.cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;}
.cl-v{display:flex;gap:10px;align-items:flex-start}
.cl-vn{font-size:9.5px;font-family:'IBM Plex Mono',monospace;padding:3px 9px;border-radius:6px;
  border:1px solid var(--border);background:var(--card2);white-space:nowrap;flex-shrink:0;color:var(--t2);}
.cl-vn.cur{border-color:var(--g);color:var(--g);background:rgba(0,255,156,.06);}
.cl-txt{font-size:11.5px;color:var(--t2);line-height:1.9;}
.n-tag{display:inline-block;background:rgba(0,255,156,.12);border:1px solid rgba(0,255,156,.28);
  border-radius:5px;padding:0 5px;font-size:8.5px;color:var(--g);margin-right:3px;vertical-align:middle;}
/* ══ LAYOUT ══ */
.wrap{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:0 14px 80px;}
.hero{text-align:center;padding:44px 20px 32px;animation:fadeD .55s ease both;}
.h-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(123,47,255,.12);
  border:1px solid rgba(123,47,255,.35);border-radius:30px;padding:5px 18px;
  font-size:10px;color:var(--m);letter-spacing:.15em;margin-bottom:16px;}
.h-bd{width:5px;height:5px;border-radius:50%;background:var(--m);animation:blink 1.5s ease infinite;}
.hero h1{font-size:clamp(28px,5vw,52px);font-weight:900;line-height:1.1;
  background:linear-gradient(135deg,var(--c) 0%,var(--v) 50%,var(--m) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:7px;}
.hero-sub{color:var(--t2);font-size:13px;margin-bottom:24px;}
.hs-row{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;}
.hs{text-align:center;}
.hs-n{font-size:24px;font-weight:900;background:linear-gradient(135deg,var(--c),var(--v));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.hs-l{font-size:9.5px;color:var(--t3);margin-top:2px;}
/* ══ SECTION ══ */
.sec-hdr{display:flex;align-items:center;gap:12px;margin:0 0 18px;}
.sec-hdr h2{font-size:15px;font-weight:800;color:var(--t);white-space:nowrap;}
.sec-line{flex:1;height:1px;background:var(--border3);}
.sec-tag{font-size:9px;color:var(--t3);white-space:nowrap;}
/* ══ PHONE ══ */
.phones{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;margin-bottom:36px;}
.pw{display:flex;flex-direction:column;align-items:center;gap:10px;
  animation:fadeUp .65s ease both;animation-fill-mode:both;}
.pw:nth-child(1){animation-delay:.06s}.pw:nth-child(2){animation-delay:.12s}
.pw:nth-child(3){animation-delay:.18s}.pw:nth-child(4){animation-delay:.24s}
.pw:nth-child(5){animation-delay:.30s}.pw:nth-child(6){animation-delay:.36s}
.pw:nth-child(7){animation-delay:.42s}.pw:nth-child(8){animation-delay:.48s}
.pw:nth-child(9){animation-delay:.54s}
.pw-lbl{font-size:10px;font-weight:700;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;}
.pw-new{font-size:9px;color:var(--g);background:rgba(0,255,156,.1);
  border:1px solid rgba(0,255,156,.22);border-radius:7px;padding:1px 7px;}
.phone{width:192px;height:396px;background:var(--ph);border-radius:32px;
  border:1.5px solid var(--ph-b);
  box-shadow:0 0 0 1px rgba(0,0,0,.5),0 26px 60px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06);
  position:relative;overflow:hidden;transition:all .35s;}
[data-theme="light"] .phone{box-shadow:0 0 0 1px rgba(180,160,240,.3),0 20px 50px rgba(100,80,180,.12),inset 0 1px 0 rgba(255,255,255,.9);}
.phone::before{content:'';position:absolute;top:8px;left:50%;transform:translateX(-50%);
  width:52px;height:14px;background:var(--ph);border-radius:8px;z-index:50;
  box-shadow:0 2px 5px rgba(0,0,0,.6);transition:background .35s;}
.pst{position:absolute;top:0;left:0;right:0;height:30px;display:flex;align-items:center;
  justify-content:space-between;padding:0 14px;z-index:49;font-family:'IBM Plex Mono',monospace;
  font-size:8px;color:var(--t3);transition:color .35s;}
.pc{position:absolute;inset:0;overflow:hidden;}
/* ══ AR BG ══ */
.arbg{position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(4,4,15,.72) 0%,transparent 28%,transparent 63%,rgba(4,4,15,.9) 100%),
    linear-gradient(135deg,#0C1828 0%,#180C2A 55%,#0C181A 100%);transition:all .35s;}
[data-theme="light"] .arbg{
  background:linear-gradient(180deg,rgba(200,210,255,.78) 0%,rgba(180,200,255,.2) 22%,transparent 50%,rgba(210,215,255,.72) 100%),
    linear-gradient(135deg,#C4D4FF 0%,#D4C4FF 55%,#C4D4EE 100%);}
.argrid{position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(0,212,255,.038) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,212,255,.038) 1px,transparent 1px);background-size:20px 20px;}
[data-theme="light"] .argrid{background-image:linear-gradient(rgba(100,80,200,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(100,80,200,.055) 1px,transparent 1px);}
/* ══ HUD ══ */
.hud{position:absolute;top:36px;left:8px;right:8px;display:flex;gap:4px;z-index:10;}
.hc{background:var(--glass);border:1px solid rgba(123,47,255,.34);border-radius:13px;
  padding:3px 7px;font-size:8px;color:var(--t);display:flex;align-items:center;gap:3px;
  backdrop-filter:blur(8px);transition:all .35s;}
[data-theme="light"] .hc{background:rgba(255,255,255,.82);border-color:rgba(123,47,255,.25);}
.hdot{width:5px;height:5px;border-radius:50%;background:var(--g);box-shadow:0 0 5px var(--g);animation:blink 1.5s ease infinite;}
.bgpill{background:rgba(0,255,156,.12);border:1px solid rgba(0,255,156,.35);border-radius:13px;
  padding:3px 8px;font-size:7.5px;color:var(--g);display:flex;align-items:center;gap:3px;
  backdrop-filter:blur(8px);margin-right:auto;animation:bgpulse 2s ease infinite;}
@keyframes bgpulse{0%,100%{opacity:1}50%{opacity:.6}}
/* ══ ORBS ══ */
.orbs{position:absolute;inset:50px 0 108px 0;}
.orb{position:absolute;display:flex;flex-direction:column;align-items:center;gap:2px;}
.or{width:38px;height:38px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;position:relative;}
.or::before{content:'';position:absolute;inset:-6px;border-radius:50%;border:1px solid;opacity:.2;animation:opulse 2s ease infinite;}
@keyframes opulse{0%,100%{transform:scale(1);opacity:.2}50%{transform:scale(1.18);opacity:.07}}
.oi{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;}
.on{font-size:7px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.9);}
.od{font-size:6px;color:rgba(255,255,255,.42);}
[data-theme="light"] .on{color:var(--t);text-shadow:none;}
.ot .or{border-color:var(--c);box-shadow:0 0 12px rgba(0,212,255,.55);animation:otalk .5s ease infinite alternate;}
.ot .or::before{border-color:var(--c);}
.ot .oi{background:rgba(0,212,255,.16);}
@keyframes otalk{from{box-shadow:0 0 10px rgba(0,212,255,.4)}to{box-shadow:0 0 26px rgba(0,212,255,.9),0 0 48px rgba(0,212,255,.24)}}
.os .or{border-color:var(--v);box-shadow:0 0 10px rgba(123,47,255,.36);}
.os .or::before{border-color:var(--v);}
.os .oi{background:rgba(123,47,255,.15);}
/* ══ CONTROLS ══ */
.actrl{position:absolute;bottom:0;left:0;right:0;padding:8px 11px 17px;
  background:linear-gradient(transparent,var(--glass2));transition:background .35s;}
.pttrow{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;}
.sbtn{width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(123,47,255,.4);
  background:rgba(123,47,255,.1);display:flex;align-items:center;justify-content:center;font-size:12px;}
[data-theme="light"] .sbtn{background:rgba(123,47,255,.08);}
.pttbtn{width:52px;height:52px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#9B5FFF,#5B1FDF);
  border:2px solid rgba(200,160,255,.36);
  box-shadow:0 0 0 5px rgba(123,47,255,.1),0 0 26px rgba(123,47,255,.5),inset 0 2px 0 rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;font-size:20px;position:relative;}
.pttbtn::after{content:'PTT';position:absolute;bottom:-12px;font-size:6px;font-family:'IBM Plex Mono',monospace;color:rgba(200,160,255,.55);letter-spacing:.1em;}
.sosbtn{width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,68,68,.4);background:rgba(255,68,68,.1);display:flex;align-items:center;justify-content:center;font-size:12px;}
.chbar{display:flex;align-items:center;justify-content:center;gap:4px;font-size:7.5px;}
.chdot{width:4px;height:4px;border-radius:50%;background:var(--g);box-shadow:0 0 4px var(--g);}
.chn{color:rgba(0,212,255,.6);font-family:'IBM Plex Mono',monospace;}
[data-theme="light"] .chn{color:rgba(0,100,180,.65);}
.bnav{position:absolute;bottom:0;left:0;right:0;height:34px;background:var(--glass2);
  border-top:1px solid var(--border2);display:flex;justify-content:space-around;align-items:center;transition:all .35s;}
.bnb{font-size:14px;opacity:.35;cursor:pointer;transition:all .2s;}
.bnb.a{opacity:1;filter:drop-shadow(0 0 5px var(--c));}
[data-theme="light"] .bnb.a{filter:drop-shadow(0 0 4px var(--v));}

/* ══ SCREEN: LOGIN ══ */
.login-scr{position:absolute;inset:0;display:flex;flex-direction:column;
  background:linear-gradient(160deg,#04041A,#080828,#060614);}
.login-logo{text-align:center;padding:40px 0 20px;}
.ll-icon{font-size:36px;margin-bottom:6px;}
.ll-name{font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--c),var(--v));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.ll-sub{font-size:9px;color:rgba(255,255,255,.35);font-family:'IBM Plex Mono',monospace;margin-top:2px;}
.login-body{flex:1;padding:0 14px;display:flex;flex-direction:column;gap:7px;}
/* Social login buttons */
.soc-btn{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;
  border:1px solid;cursor:pointer;transition:all .2s;}
.soc-ic{font-size:16px;flex-shrink:0;}
.soc-t{font-size:10px;font-weight:600;flex:1;}
.soc-arr{font-size:10px;opacity:.5;}
.sb-google{border-color:rgba(66,133,244,.4);background:rgba(66,133,244,.08);}
.sb-apple{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05);}
.sb-facebook{border-color:rgba(66,103,178,.4);background:rgba(66,103,178,.08);}
.sb-x{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.04);}
.sb-email{border-color:rgba(0,212,255,.3);background:rgba(0,212,255,.06);}
.login-div{display:flex;align-items:center;gap:8px;margin:4px 0;}
.ld-line{flex:1;height:1px;background:rgba(255,255,255,.08);}
.ld-txt{font-size:9px;color:rgba(255,255,255,.3);}
.encrypt-note{background:rgba(0,255,156,.06);border:1px solid rgba(0,255,156,.18);
  border-radius:8px;padding:7px 10px;font-size:8.5px;color:rgba(0,255,156,.75);
  display:flex;align-items:center;gap:5px;margin-top:4px;}

/* ══ SCREEN: PIN CARD ══ */
.pin-scr{position:absolute;inset:0;background:var(--bg2);transition:background .35s;}
.pin-header{padding:28px 12px 10px;background:var(--card);border-bottom:1px solid var(--border2);
  display:flex;align-items:center;gap:7px;transition:all .35s;}
.pin-body{padding:12px;}
/* PIN display */
.pin-card{background:linear-gradient(135deg,rgba(123,47,255,.2),rgba(0,212,255,.15));
  border:1px solid rgba(123,47,255,.35);border-radius:14px;padding:16px 14px;margin-bottom:10px;
  position:relative;overflow:hidden;}
.pin-card::before{content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.015) 12px,rgba(255,255,255,.015) 13px);}
.pc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;position:relative;z-index:1;}
.pc-app{font-size:12px;font-weight:900;background:linear-gradient(135deg,var(--c),var(--v));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.pc-ver{font-size:8px;color:rgba(255,255,255,.4);font-family:'IBM Plex Mono',monospace;}
.pc-ava{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--v),var(--c));
  border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;
  position:relative;z-index:1;}
.pc-name{font-size:13px;font-weight:800;color:#fff;position:relative;z-index:1;margin-bottom:2px;}
.pc-handle{font-size:8.5px;color:rgba(255,255,255,.45);font-family:'IBM Plex Mono',monospace;position:relative;z-index:1;}
/* PIN number */
.pin-display{text-align:center;margin:10px 0;position:relative;z-index:1;}
.pin-label{font-size:8px;color:rgba(255,255,255,.45);margin-bottom:4px;font-family:'IBM Plex Mono',monospace;letter-spacing:.1em;}
.pin-number{font-size:26px;font-weight:900;font-family:'IBM Plex Mono',monospace;
  letter-spacing:3px;color:#fff;text-shadow:0 0 20px rgba(0,212,255,.5);}
.pin-copy{display:inline-flex;align-items:center;gap:4px;margin-top:4px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  border-radius:7px;padding:3px 10px;font-size:8px;color:rgba(255,255,255,.7);cursor:pointer;}
/* QR Code mock */
.qr-section{background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:12px;
  text-align:center;margin-bottom:8px;}
.qr-title{font-size:10px;font-weight:700;color:var(--t);margin-bottom:8px;}
.qr-mock{width:80px;height:80px;margin:0 auto 8px;background:#fff;border-radius:8px;
  padding:6px;position:relative;}
.qr-inner{width:100%;height:100%;
  background-image:
    repeating-linear-gradient(#000 0px,#000 4px,transparent 4px,transparent 8px),
    repeating-linear-gradient(90deg,#000 0px,#000 4px,transparent 4px,transparent 8px);
  background-size:8px 8px;opacity:.85;border-radius:2px;}
.qr-corner{position:absolute;width:14px;height:14px;border:3px solid #000;}
.qr-corner.tl{top:4px;left:4px;border-right:none;border-bottom:none;}
.qr-corner.tr{top:4px;right:4px;border-left:none;border-bottom:none;}
.qr-corner.bl{bottom:4px;left:4px;border-right:none;border-top:none;}
.qr-sub{font-size:8px;color:var(--t3);}
/* Share options */
.share-row{display:flex;gap:6px;}
.share-btn{flex:1;background:var(--card2);border:1px solid var(--border2);border-radius:8px;
  padding:6px;text-align:center;font-size:8px;color:var(--t2);cursor:pointer;}
.share-btn.primary{background:rgba(123,47,255,.18);border-color:rgba(123,47,255,.4);color:var(--t);}
/* Add friend section */
.add-friend{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.2);
  border-radius:10px;padding:10px 12px;}
.af-title{font-size:10px;font-weight:700;color:var(--c);margin-bottom:6px;}
.af-input{display:flex;gap:5px;}
.af-field{flex:1;background:var(--inp);border:1px solid var(--inp-b);border-radius:7px;
  padding:6px 9px;font-size:9px;color:var(--t2);}
.af-btn{background:var(--c);border:none;border-radius:7px;padding:5px 10px;
  font-size:9px;font-weight:700;color:#000;cursor:pointer;white-space:nowrap;}
/* ══ SCREEN: ENCRYPTION ══ */
.enc-scr{position:absolute;inset:0;background:var(--bg2);transition:background .35s;overflow:hidden;}
.enc-header{padding:28px 12px 10px;background:var(--card);border-bottom:1px solid var(--border2);
  display:flex;align-items:center;gap:7px;transition:all .35s;}
.enc-body{padding:10px 12px;}
.enc-status{background:rgba(0,255,156,.06);border:1px solid rgba(0,255,156,.2);
  border-radius:12px;padding:10px 12px;margin-bottom:8px;}
.es-row{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
.es-icon{font-size:18px}
.es-title{font-size:11px;font-weight:700;color:var(--g)}
.es-badge{font-size:7.5px;background:rgba(0,255,156,.15);border:1px solid rgba(0,255,156,.3);
  border-radius:6px;padding:1px 7px;color:var(--g);font-family:'IBM Plex Mono',monospace;margin-right:auto;
  animation:bgpulse 2s ease infinite;}
.es-desc{font-size:9px;color:var(--t2);line-height:1.6;}
/* Encryption items */
.enc-feat{background:var(--card);border:1px solid var(--border2);border-radius:11px;
  margin-bottom:6px;overflow:hidden;}
.ef-item{display:flex;align-items:center;gap:8px;padding:8px 11px;
  border-bottom:1px solid var(--border3);}
.ef-item:last-child{border-bottom:none;}
.ef-ic{font-size:13px;flex-shrink:0;}
.ef-info{flex:1}.ef-t{font-size:9.5px;font-weight:700;color:var(--t);}
.ef-d{font-size:8px;color:var(--t3);margin-top:1px;}
.ef-tag{font-size:7.5px;padding:1px 6px;border-radius:5px;font-family:'IBM Plex Mono',monospace;flex-shrink:0;}
.et-g{background:rgba(0,255,156,.12);border:1px solid rgba(0,255,156,.25);color:var(--g);}
.et-c{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.22);color:var(--c);}
/* Key display */
.key-display{background:rgba(123,47,255,.08);border:1px solid rgba(123,47,255,.2);
  border-radius:8px;padding:7px 10px;margin-top:6px;}
.kd-label{font-size:7.5px;color:var(--mu);font-family:'IBM Plex Mono',monospace;margin-bottom:3px;}
.kd-key{font-size:9px;color:var(--v);font-family:'IBM Plex Mono',monospace;
  word-break:break-all;line-height:1.5;opacity:.7;}

/* ══ SCREEN: CHAT ══ */
.chat-scr{position:absolute;inset:0;background:var(--bg2);transition:background .35s;display:flex;flex-direction:column;}
.ch-hdr{padding:28px 10px 9px;background:var(--card);border-bottom:1px solid var(--border2);
  display:flex;align-items:center;gap:6px;flex-shrink:0;transition:all .35s;}
.cha{width:27px;height:27px;border-radius:50%;background:rgba(0,212,255,.1);
  border:1.5px solid rgba(0,212,255,.38);display:flex;align-items:center;justify-content:center;font-size:13px;}
.chi{flex:1}.chn2{font-size:10px;font-weight:700;color:var(--t)}.chm{font-size:7.5px;color:var(--t3);}
.enc-badge{font-size:7px;color:var(--g);background:rgba(0,255,156,.1);border:1px solid rgba(0,255,156,.22);
  border-radius:6px;padding:1px 6px;font-family:'IBM Plex Mono',monospace;}
.ttlb{font-size:7px;padding:2px 6px;border-radius:7px;border:1px solid rgba(255,68,68,.38);
  color:var(--r);background:rgba(255,68,68,.07);}
.chat-msgs{flex:1;overflow:hidden;padding:7px 9px;display:flex;flex-direction:column;gap:4px;justify-content:flex-end;}
.msg{display:flex;gap:4px;align-items:flex-end;max-width:88%;}
.msg.me{align-self:flex-end;flex-direction:row-reverse;}
.mav{width:19px;height:19px;border-radius:50%;background:rgba(123,47,255,.18);
  border:1px solid rgba(123,47,255,.32);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;}
.mb{border-radius:10px;padding:5px 8px;max-width:118px;position:relative;}
.msg.them .mb{background:var(--card2);border:1px solid var(--border2);border-radius:10px 10px 10px 3px;}
.msg.me .mb{background:rgba(123,47,255,.2);border:1px solid rgba(123,47,255,.36);border-radius:10px 10px 3px 10px;}
[data-theme="light"] .msg.them .mb{background:#EEF0FF;border-color:rgba(123,47,255,.18);}
.mt{font-size:9px;line-height:1.5;color:var(--t);}
.mtime{font-size:6px;color:var(--t3);margin-top:1px;font-family:'IBM Plex Mono',monospace;}
.menc{font-size:5.5px;color:var(--g);opacity:.7;}
.burn{position:absolute;top:-7px;right:1px;font-size:9px;filter:drop-shadow(0 0 3px var(--r));}
.cinp{padding:5px 9px 13px;background:var(--card);border-top:1px solid var(--border2);
  display:flex;gap:5px;align-items:center;flex-shrink:0;transition:all .35s;}
.cf{flex:1;background:var(--inp);border:1px solid var(--inp-b);border-radius:16px;padding:5px 10px;font-size:8.5px;color:var(--t3);}
.cb{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;flex-shrink:0;}
.ccam{background:rgba(0,212,255,.1);border:1.5px solid rgba(0,212,255,.28);}
.csnd{background:rgba(123,47,255,.25);border:1.5px solid rgba(123,47,255,.45);}

/* ══ SCREEN: SHORTCUTS (iOS/Android) ══ */
.kbd-scr{position:absolute;inset:0;background:var(--bg2);transition:background .35s;overflow:hidden;}
.kbd-hdr{padding:28px 12px 10px;background:var(--card);border-bottom:1px solid var(--border2);
  display:flex;align-items:center;gap:7px;transition:all .35s;}
.kbd-body{padding:10px 12px;overflow:hidden;}
.kbd-section-title{font-size:8px;font-weight:700;color:var(--t3);letter-spacing:.12em;text-transform:uppercase;margin:8px 0 5px;}
.kbdi{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--card);
  border:1px solid var(--border2);border-radius:9px;margin-bottom:4px;transition:all .35s;}
.ki-ic{font-size:14px;flex-shrink:0}
.ki-inf{flex:1}.ki-nm{font-size:9.5px;font-weight:700;color:var(--t)}.ki-de{font-size:8px;color:var(--t3);margin-top:1px}
.ki-keys{display:flex;gap:3px;align-items:center;flex-shrink:0}
.kk{font-family:'IBM Plex Mono',monospace;font-size:8.5px;background:var(--kk-bg);
  border:1px solid var(--kk-b);color:var(--kk-t);border-radius:5px;padding:2px 7px;
  box-shadow:0 2px 0 rgba(0,0,0,.25);transition:all .35s;}
[data-theme="light"] .kk{box-shadow:0 2px 0 rgba(80,60,180,.2);}
.kplus{font-size:9px;color:var(--t3);font-family:'IBM Plex Mono',monospace;}
.platform-tab{display:flex;gap:4px;margin-bottom:10px;}
.ptab{flex:1;padding:5px;border-radius:8px;border:1px solid var(--border2);background:var(--card2);
  text-align:center;font-size:8.5px;cursor:pointer;transition:all .2s;color:var(--t3);}
.ptab.sel{background:rgba(123,47,255,.18);border-color:rgba(123,47,255,.44);color:var(--t);font-weight:700;}

/* ══ SCREEN: SETTINGS ══ */
.set-scr{position:absolute;inset:0;background:var(--bg2);transition:background .35s;padding:28px 12px 12px;overflow:hidden;}
.set-title{font-size:14px;font-weight:900;color:var(--t);margin-bottom:12px;}
.set-sec{margin-bottom:10px;}
.set-sec-t{font-size:7.5px;font-weight:700;color:var(--t3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid var(--border3);}
.si{display:flex;align-items:center;gap:7px;padding:7px 10px;background:var(--card);
  border:1px solid var(--border2);border-radius:9px;margin-bottom:4px;cursor:pointer;transition:all .2s;}
.si:hover{border-color:var(--border);}
.si-ic{font-size:13px;flex-shrink:0}.si-inf{flex:1}
.si-nm{font-size:9.5px;font-weight:700;color:var(--t)}.si-de{font-size:7.5px;color:var(--t3);margin-top:1px}
.si-r{font-size:9px;color:var(--t3);font-family:'IBM Plex Mono',monospace;}
.tog{width:28px;height:16px;border-radius:8px;background:rgba(123,47,255,.3);position:relative;
  cursor:pointer;flex-shrink:0;transition:background .25s;}
.tog.on{background:var(--g);}
.tog::after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .2s;}
.tog.on::after{left:14px;}
.theme-pick{display:flex;gap:4px;}
.tp{flex:1;padding:5px;border-radius:7px;border:1px solid var(--border2);background:var(--card2);
  text-align:center;font-size:8px;cursor:pointer;transition:all .2s;color:var(--t3);}
.tp.sel{background:rgba(123,47,255,.18);border-color:rgba(123,47,255,.44);color:var(--t);font-weight:700;}

/* ══ FEATURES GRID ══ */
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:32px;}
.fc{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:18px 20px;
  transition:all .22s;animation:fadeUp .65s ease both;animation-fill-mode:both;}
.fc:hover{border-color:var(--border);transform:translateY(-2px);box-shadow:var(--shadow);}
.fc:nth-child(1){animation-delay:.04s}.fc:nth-child(2){animation-delay:.09s}
.fc:nth-child(3){animation-delay:.14s}.fc:nth-child(4){animation-delay:.19s}
.fc:nth-child(5){animation-delay:.24s}.fc:nth-child(6){animation-delay:.29s}
.fc:nth-child(7){animation-delay:.34s}.fc:nth-child(8){animation-delay:.39s}
.fc:nth-child(9){animation-delay:.44s}.fc:nth-child(10){animation-delay:.49s}
.fc-ic{font-size:24px;margin-bottom:9px}.fc-t{font-size:12.5px;font-weight:800;margin-bottom:4px;color:var(--t);}
.fc-d{font-size:11.5px;color:var(--t2);line-height:1.72}
.fc-tag{display:inline-block;font-size:8.5px;padding:2px 9px;border-radius:9px;margin-top:8px;}
.tg-g{background:rgba(0,255,156,.08);border:1px solid rgba(0,255,156,.22);color:var(--g);}
.tg-c{background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.22);color:var(--c);}
.tg-v{background:rgba(200,64,255,.1);border:1px solid rgba(200,64,255,.25);color:var(--m);}
.tg-r{background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.22);color:var(--r);}
.tg-y{background:rgba(255,179,71,.08);border:1px solid rgba(255,179,71,.22);color:var(--y);}
.tg-t{background:rgba(0,255,212,.08);border:1px solid rgba(0,255,212,.22);color:var(--tl);}
.tg-new{background:rgba(0,255,156,.15);border:1px solid rgba(0,255,156,.4);color:var(--g);font-weight:700;}

/* ══ SHORTCUT TABLE ══ */
.kbd-table{background:var(--card);border:1px solid var(--border2);border-radius:14px;overflow:hidden;margin-bottom:32px;}
.kbt-hdr{background:rgba(0,212,255,.06);border-bottom:1px solid rgba(0,212,255,.12);
  padding:11px 16px;font-size:11px;font-weight:700;color:var(--c);display:flex;justify-content:space-between;}
.kbt-sec{background:var(--bg3);border-bottom:1px solid var(--border3);padding:7px 16px;
  font-size:8px;font-weight:700;color:var(--t3);letter-spacing:.12em;text-transform:uppercase;}
.kbt-row{padding:10px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border3);transition:background .15s;}
.kbt-row:last-child{border-bottom:none}.kbt-row:hover{background:rgba(123,47,255,.04);}
.kbt-ic{font-size:16px;width:22px;text-align:center;flex-shrink:0;}
.kbt-i{flex:1}.kbt-nm{font-size:11px;font-weight:700;color:var(--t)}.kbt-de{font-size:9.5px;color:var(--mu);margin-top:1px}
.kbt-keys{display:flex;gap:4px;align-items:center;flex-shrink:0}
.kk2{font-family:'IBM Plex Mono',monospace;font-size:9.5px;background:var(--kk-bg);
  border:1px solid var(--kk-b);color:var(--kk-t);border-radius:5px;padding:3px 9px;
  box-shadow:0 2px 0 rgba(0,0,0,.25);transition:all .35s;}
.kplus2{font-size:10px;color:var(--t3);font-family:'IBM Plex Mono',monospace;}
.plat-badge{font-size:8px;padding:1px 7px;border-radius:5px;font-family:'IBM Plex Mono',monospace;}
.pb-and{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.25);color:var(--c);}
.pb-ios{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.65);}
.pb-both{background:rgba(0,255,156,.1);border:1px solid rgba(0,255,156,.25);color:var(--g);}

/* ══ LEGEND ══ */
.legend{text-align:center;margin-bottom:20px;}
.leg-t{font-size:9px;color:var(--t3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;}
.leg-r{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
.lg{display:flex;align-items:center;gap:4px;}
.ld{width:9px;height:9px;border-radius:50%;}
.ll{font-size:9.5px;color:var(--t2);font-family:'IBM Plex Mono',monospace;}

@keyframes fadeD{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:rgba(123,47,255,.3);border-radius:3px}
</style>
</head>
<body data-theme="dark">

<!-- TOPBAR -->
<div class="topbar">
  <div class="tb-logo">VibeMap</div>
  <div class="tb-ver">v5.0</div>
  <div class="tb-sp"></div>
  <div class="cl-pill" onclick="toggleCL()"><div class="cl-dot"></div><span>Changelog</span></div>
  <div class="theme-row">
    <button class="th-btn on" id="btn-dark"   onclick="setTheme('dark')"   title="داكن">🌙</button>
    <button class="th-btn"   id="btn-light"  onclick="setTheme('light')"  title="فاتح">☀️</button>
    <button class="th-btn"   id="btn-system" onclick="setTheme('system')" title="النظام">⚙️</button>
  </div>
</div>

<!-- CHANGELOG -->
<div class="cl-panel" id="cl-panel">
  <div class="cl-hdr">📋 Changelog — VibeMap</div>
  <div class="cl-grid">
    <div class="cl-v"><div class="cl-vn cur">v5.0 ← الآن</div><div class="cl-txt">
      ✦ رقم PIN خاص لكل مستخدم <span class="n-tag">NEW</span><br>
      ✦ QR Code لمشاركة الـ PIN <span class="n-tag">NEW</span><br>
      ✦ تسجيل دخول بـ Google/Apple/Facebook/X/إيميل <span class="n-tag">NEW</span><br>
      ✦ تشفير E2E للرسائل والصوت <span class="n-tag">NEW</span><br>
      ✦ اختصارات iOS (Control Center) وAndroid (Quick Settings) <span class="n-tag">NEW</span><br>
      ✦ إصلاح مشاكل اليوزرات في قاعدة البيانات
    </div></div>
    <div class="cl-v"><div class="cl-vn">v4.0</div><div class="cl-txt">خلفية ذكية · إشعارات تفاعلية · 12 اختصار · Lock Screen PTT</div></div>
    <div class="cl-v"><div class="cl-vn">v3.0</div><div class="cl-txt">تقييم ثلاثي · ملف شخصي · وضع داكن/فاتح/نظام</div></div>
    <div class="cl-v"><div class="cl-vn">v2.0</div><div class="cl-txt">دردشة · صور · TTL أوضاع الحذف</div></div>
  </div>
</div>

<div class="wrap">
<!-- HERO -->
<div class="hero">
  <div class="h-badge"><div class="h-bd"></div>v5.0 · التطبيق الكامل</div>
  <h1>VibeMap AR</h1>
  <div class="hero-sub">PIN · QR · تسجيل دخول اجتماعي · تشفير E2E · اختصارات iOS & Android</div>
  <div class="hs-row">
    <div class="hs"><div class="hs-n">9</div><div class="hs-l">شاشات</div></div>
    <div class="hs"><div class="hs-n">5</div><div class="hs-l">طرق دخول</div></div>
    <div class="hs"><div class="hs-n">E2E</div><div class="hs-l">تشفير</div></div>
    <div class="hs"><div class="hs-n">0</div><div class="hs-l">ريال/شهر</div></div>
  </div>
</div>

<!-- PHONES -->
<div class="sec-hdr">
  <h2>📱 شاشات v5.0</h2>
  <div class="sec-line"></div>
  <span class="sec-tag">غيّر الوضع من الأعلى</span>
</div>
<div class="phones">

  <!-- S1: LOGIN -->
  <div class="pw"><div class="pw-lbl">تسجيل الدخول</div><div class="pw-new">✦ v5 جديد</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="login-scr">
        <div class="login-logo">
          <div class="ll-icon">📡</div>
          <div class="ll-name">VibeMap</div>
          <div class="ll-sub">AR Walkie-Talkie</div>
        </div>
        <div class="login-body">
          <div class="soc-btn sb-google">
            <div class="soc-ic">🔵</div>
            <div class="soc-t" style="color:#E8EAFF">المتابعة بـ Google</div>
            <div class="soc-arr">›</div>
          </div>
          <div class="soc-btn sb-apple">
            <div class="soc-ic">🍎</div>
            <div class="soc-t" style="color:#E8EAFF">المتابعة بـ Apple</div>
            <div class="soc-arr">›</div>
          </div>
          <div class="soc-btn sb-facebook">
            <div class="soc-ic">📘</div>
            <div class="soc-t" style="color:#E8EAFF">المتابعة بـ Facebook</div>
            <div class="soc-arr">›</div>
          </div>
          <div class="soc-btn sb-x">
            <div class="soc-ic">✕</div>
            <div class="soc-t" style="color:#E8EAFF">المتابعة بـ X</div>
            <div class="soc-arr">›</div>
          </div>
          <div class="login-div"><div class="ld-line"></div><div class="ld-txt">أو</div><div class="ld-line"></div></div>
          <div class="soc-btn sb-email">
            <div class="soc-ic">📧</div>
            <div class="soc-t" style="color:#00D4FF">بريد إلكتروني</div>
            <div class="soc-arr">›</div>
          </div>
          <div class="encrypt-note">
            <span>🔒</span>
            <span>كل بياناتك مشفّرة بـ E2E — لا أحد يقرأها</span>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S2: AR MAIN -->
  <div class="pw"><div class="pw-lbl">AR الرئيسية</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="arbg"></div><div class="argrid"></div>
      <div class="hud">
        <div class="hc"><div class="hdot"></div><span>AR</span></div>
        <div class="bgpill">⬤ خلفية</div>
        <div class="hc">👥 3</div>
        <div class="hc" style="border-color:rgba(0,255,156,.4)">🔒 E2E</div>
      </div>
      <div class="orbs">
        <div class="orb ot" style="left:18px;top:34px"><div class="or"><div class="oi">👤</div></div><div class="on">أحمد</div><div class="od">120م</div></div>
        <div class="orb os" style="right:18px;top:68px"><div class="or"><div class="oi">👤</div></div><div class="on">سارة</div><div class="od">250م</div></div>
        <div class="orb os" style="left:50%;top:110px;transform:translateX(-50%)"><div class="or"><div class="oi">👤</div></div><div class="on">خالد</div><div class="od">380م</div></div>
      </div>
      <div class="actrl">
        <div class="pttrow"><div class="sbtn">👻</div><div class="pttbtn">🎙️</div><div class="sosbtn">🆘</div></div>
        <div class="chbar"><div class="chdot"></div><div class="chn">global · الرياض</div></div>
      </div>
      <div class="bnav">
        <div class="bnb a">📡</div><div class="bnb">💬</div>
        <div class="bnb">🪪</div><div class="bnb">👤</div><div class="bnb">⚙️</div>
      </div>
    </div>
  </div></div>

  <!-- S3: PIN CARD -->
  <div class="pw"><div class="pw-lbl">بطاقة PIN + QR</div><div class="pw-new">✦ v5 جديد</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="pin-scr">
        <div class="pin-header">
          <span style="font-size:14px;color:var(--t)">‹</span>
          <span style="font-size:12px;font-weight:800;flex:1;color:var(--t)">🪪 رقمي التعريفي</span>
        </div>
        <div class="pin-body">
          <!-- PIN Card -->
          <div class="pin-card">
            <div class="pc-top">
              <div>
                <div class="pc-app">VibeMap</div>
                <div class="pc-ver">v5.0 · AR</div>
              </div>
              <div class="pc-ava">🧑</div>
            </div>
            <div class="pc-name">أحمد العمري</div>
            <div class="pc-handle">@ahmed_ar · الرياض</div>
            <div class="pin-display">
              <div class="pin-label">رقم التعريف الشخصي</div>
              <div class="pin-number">VM-4829-7X3K</div>
              <div class="pin-copy">📋 نسخ الرقم</div>
            </div>
          </div>
          <!-- QR -->
          <div class="qr-section">
            <div class="qr-title">QR للإضافة السريعة</div>
            <div class="qr-mock">
              <div class="qr-inner"></div>
              <div class="qr-corner tl"></div>
              <div class="qr-corner tr"></div>
              <div class="qr-corner bl"></div>
            </div>
            <div class="qr-sub">امسحه بكاميرا الجوال للإضافة فوراً</div>
          </div>
          <!-- Share -->
          <div class="share-row">
            <div class="share-btn primary">📤 مشاركة</div>
            <div class="share-btn">📷 مسح QR</div>
            <div class="share-btn">🔗 رابط</div>
          </div>
          <!-- Add friend -->
          <div class="add-friend" style="margin-top:8px">
            <div class="af-title">➕ إضافة صديق برقمه</div>
            <div class="af-input">
              <div class="af-field">VM-XXXX-XXXX</div>
              <div class="af-btn">إضافة</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S4: ENCRYPTION -->
  <div class="pw"><div class="pw-lbl">التشفير E2E</div><div class="pw-new">✦ v5 جديد</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="enc-scr">
        <div class="enc-header">
          <span style="font-size:14px;color:var(--t)">‹</span>
          <span style="font-size:12px;font-weight:800;flex:1;color:var(--t)">🔒 التشفير</span>
        </div>
        <div class="enc-body">
          <div class="enc-status">
            <div class="es-row">
              <div class="es-icon">🛡️</div>
              <div class="es-title">مشفّر بالكامل</div>
              <div class="es-badge">E2E Active</div>
            </div>
            <div class="es-desc">كل رسالة وصوت مشفّر من جهازك إلى جهاز المستلم. لا السيرفر يقرأها.</div>
          </div>
          <div class="enc-feat">
            <div class="ef-item">
              <div class="ef-ic">💬</div>
              <div class="ef-info"><div class="ef-t">رسائل الدردشة</div><div class="ef-d">AES-256-GCM</div></div>
              <div class="ef-tag et-g">مشفّر</div>
            </div>
            <div class="ef-item">
              <div class="ef-ic">🎙️</div>
              <div class="ef-info"><div class="ef-t">صوت PTT</div><div class="ef-d">SRTP + DTLS</div></div>
              <div class="ef-tag et-g">مشفّر</div>
            </div>
            <div class="ef-item">
              <div class="ef-ic">📸</div>
              <div class="ef-info"><div class="ef-t">الصور المُرسَلة</div><div class="ef-d">RSA-2048 key exchange</div></div>
              <div class="ef-tag et-g">مشفّر</div>
            </div>
            <div class="ef-item">
              <div class="ef-ic">🗺️</div>
              <div class="ef-info"><div class="ef-t">بيانات الموقع</div><div class="ef-d">TLS 1.3 فقط</div></div>
              <div class="ef-tag et-c">آمن</div>
            </div>
            <div class="ef-item">
              <div class="ef-ic">🔑</div>
              <div class="ef-info"><div class="ef-t">مفاتيح التشفير</div><div class="ef-d">مخزّنة على جهازك فقط</div></div>
              <div class="ef-tag et-g">محلي</div>
            </div>
          </div>
          <div class="key-display">
            <div class="kd-label">مفتاحك العام (Public Key)</div>
            <div class="kd-key">MIIBIjANBgkqhki...<br>G9w+4yM3xR...</div>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S5: CHAT encrypted -->
  <div class="pw"><div class="pw-lbl">دردشة مشفّرة</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="chat-scr">
        <div class="ch-hdr">
          <span style="font-size:14px;cursor:pointer;color:var(--t)">‹</span>
          <div class="cha">🌍</div>
          <div class="chi"><div class="chn2">Global · الرياض</div><div class="chm">14 متصل</div></div>
          <div class="enc-badge">🔒 E2E</div>
          <div class="ttlb">🔥 Auto</div>
        </div>
        <div class="chat-msgs">
          <div style="text-align:center;font-size:7px;color:var(--t3);background:var(--card2);border-radius:7px;padding:3px 8px;align-self:center">
            🔒 المحادثة مشفّرة — لا أحد يطّلع عليها
          </div>
          <div class="msg" style="flex-direction:row">
            <div class="mav">👤</div>
            <div style="position:relative">
              <div class="mb"><div class="mt">وين أنتم الحين؟ 📍</div><div class="mtime">9:38</div><div class="menc">🔒 e2e</div></div>
              <div class="burn">🔥</div>
            </div>
          </div>
          <div class="msg me">
            <div class="mav" style="background:rgba(123,47,255,.18);border-color:var(--v)">🙋</div>
            <div class="mb"><div class="mt">قريب — 2 دقيقة</div><div class="mtime">9:40 ✓✓</div><div class="menc">🔒 e2e</div></div>
          </div>
          <div class="msg" style="flex-direction:row">
            <div class="mav">👤</div>
            <div class="mb"><div class="mt">نقابل عند الكافيه 🟣</div><div class="mtime">9:41</div><div class="menc">🔒 e2e</div></div>
          </div>
        </div>
        <div class="cinp">
          <div class="cb ccam">📷</div>
          <div class="cf">اكتب... <span style="font-size:7px;opacity:.5">(Enter للإرسال)</span></div>
          <div class="cb csnd">➤</div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S6: iOS Shortcuts -->
  <div class="pw"><div class="pw-lbl">اختصارات iOS</div><div class="pw-new">✦ v5 جديد</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="kbd-scr">
        <div class="kbd-hdr">
          <span style="font-size:14px;color:var(--t)">‹</span>
          <span style="font-size:12px;font-weight:800;flex:1;color:var(--t)">⌨️ اختصارات iOS</span>
        </div>
        <div class="kbd-body">
          <div class="platform-tab">
            <div class="ptab sel">🍎 iOS</div>
            <div class="ptab">🤖 Android</div>
          </div>
          <div class="kbd-section-title">Control Center</div>
          <div class="kbdi">
            <div class="ki-ic">🎙️</div>
            <div class="ki-inf"><div class="ki-nm">زر PTT</div><div class="ki-de">في Control Center مباشرة</div></div>
            <div class="ki-keys"><div class="kk">CC Widget</div></div>
          </div>
          <div class="kbdi">
            <div class="ki-ic">🆘</div>
            <div class="ki-inf"><div class="ki-nm">SOS سريع</div><div class="ki-de">Side Button × 5</div></div>
            <div class="ki-keys"><div class="kk">×5 ضغط</div></div>
          </div>
          <div class="kbd-section-title">Siri Shortcuts</div>
          <div class="kbdi">
            <div class="ki-ic">🗣️</div>
            <div class="ki-inf"><div class="ki-nm">"VibeMap تكلم"</div><div class="ki-de">يبدأ PTT بالصوت</div></div>
            <div class="ki-keys"><div class="kk">Siri</div></div>
          </div>
          <div class="kbdi">
            <div class="ki-ic">🔒</div>
            <div class="ki-inf"><div class="ki-nm">PTT من شاشة الإغلاق</div><div class="ki-de">ضغط مطوّل زر رفع الصوت</div></div>
            <div class="ki-keys"><div class="kk">Vol+</div></div>
          </div>
          <div class="kbd-section-title">Back Tap</div>
          <div class="kbdi">
            <div class="ki-ic">👆</div>
            <div class="ki-inf"><div class="ki-nm">ضربتان على ظهر الجوال</div><div class="ki-de">فتح VibeMap AR</div></div>
            <div class="ki-keys"><div class="kk">2 ضربات</div></div>
          </div>
          <div class="kbdi">
            <div class="ki-ic">✋</div>
            <div class="ki-inf"><div class="ki-nm">ثلاث ضربات</div><div class="ki-de">بدء PTT مباشرة</div></div>
            <div class="ki-keys"><div class="kk">3 ضربات</div></div>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S7: Android Shortcuts -->
  <div class="pw"><div class="pw-lbl">اختصارات Android</div><div class="pw-new">✦ v5 جديد</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="kbd-scr">
        <div class="kbd-hdr">
          <span style="font-size:14px;color:var(--t)">‹</span>
          <span style="font-size:12px;font-weight:800;flex:1;color:var(--t)">⌨️ اختصارات Android</span>
        </div>
        <div class="kbd-body">
          <div class="platform-tab">
            <div class="ptab">🍎 iOS</div>
            <div class="ptab sel">🤖 Android</div>
          </div>
          <div class="kbd-section-title">Quick Settings</div>
          <div class="kbdi">
            <div class="ki-ic">🎙️</div>
            <div class="ki-inf"><div class="ki-nm">Tile PTT</div><div class="ki-de">في Quick Settings درج الإشعارات</div></div>
            <div class="ki-keys"><div class="kk">QS Tile</div></div>
          </div>
          <div class="kbdi">
            <div class="ki-ic">🆘</div>
            <div class="ki-inf"><div class="ki-nm">SOS طارئ</div><div class="ki-de">Power × 5 ضغطات</div></div>
            <div class="ki-keys"><div class="kk">×5 Power</div></div>
          </div>
          <div class="kbd-section-title">زر الصوت في الخلفية</div>
          <div class="kbdi">
            <div class="ki-ic">🔒</div>
            <div class="ki-inf"><div class="ki-nm">PTT من شاشة الإغلاق</div><div class="ki-de">ضغط مطوّل زر خفض الصوت</div></div>
            <div class="ki-keys"><div class="kk">Vol− طويل</div></div>
          </div>
          <div class="kbd-section-title">Widget الشاشة الرئيسية</div>
          <div class="kbdi">
            <div class="ki-ic">📡</div>
            <div class="ki-inf"><div class="ki-nm">Widget VibeMap</div><div class="ki-de">عدد المتصلين + PTT</div></div>
            <div class="ki-keys"><div class="kk">4×2 Widget</div></div>
          </div>
          <div class="kbdi">
            <div class="ki-ic">🎧</div>
            <div class="ki-inf"><div class="ki-nm">سماعة بلوتوث</div><div class="ki-de">زر الإجابة = PTT</div></div>
            <div class="ki-keys"><div class="kk">BT Button</div></div>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S8: Settings v5 -->
  <div class="pw"><div class="pw-lbl">الإعدادات</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div class="set-scr">
        <div class="set-title">⚙️ الإعدادات</div>
        <div class="set-sec">
          <div class="set-sec-t">الحساب</div>
          <div class="si">
            <div class="si-ic">🪪</div>
            <div class="si-inf"><div class="si-nm">رقم PIN الخاص</div><div class="si-de">VM-4829-7X3K</div></div>
            <div class="si-r">نسخ</div>
          </div>
          <div class="si">
            <div class="si-ic">📷</div>
            <div class="si-inf"><div class="si-nm">QR الشخصي</div><div class="si-de">مشاركة بطاقتي</div></div>
            <div class="si-r">›</div>
          </div>
        </div>
        <div class="set-sec">
          <div class="set-sec-t">المظهر</div>
          <div class="si" style="display:block;padding:8px 10px">
            <div class="si-nm" style="margin-bottom:5px">وضع العرض</div>
            <div class="theme-pick">
              <div class="tp">🌙 داكن</div>
              <div class="tp sel">☀️ فاتح</div>
              <div class="tp">⚙️ نظام</div>
            </div>
          </div>
        </div>
        <div class="set-sec">
          <div class="set-sec-t">الأمان والتشفير</div>
          <div class="si">
            <div class="si-ic">🔒</div>
            <div class="si-inf"><div class="si-nm">تشفير E2E</div><div class="si-de">AES-256 + RSA-2048</div></div>
            <div class="tog on"></div>
          </div>
          <div class="si">
            <div class="si-ic">🔑</div>
            <div class="si-inf"><div class="si-nm">تجديد مفاتيح التشفير</div></div>
            <div class="si-r">›</div>
          </div>
        </div>
        <div class="set-sec">
          <div class="set-sec-t">الخلفية والاختصارات</div>
          <div class="si">
            <div class="si-ic">⚡</div>
            <div class="si-inf"><div class="si-nm">تشغيل في الخلفية</div><div class="si-de">GPS + إشعارات</div></div>
            <div class="tog on"></div>
          </div>
          <div class="si">
            <div class="si-ic">⌨️</div>
            <div class="si-inf"><div class="si-nm">تخصيص الاختصارات</div></div>
            <div class="si-r">›</div>
          </div>
        </div>
      </div>
    </div>
  </div></div>

  <!-- S9: Profile with PIN -->
  <div class="pw"><div class="pw-lbl">الملف الشخصي</div>
  <div class="phone">
    <div class="pst"><span>9:41</span><span>5G</span><span>🔋</span></div>
    <div class="pc">
      <div style="position:absolute;inset:0;background:var(--bg2);transition:background .35s;overflow:hidden">
        <div style="height:70px;background:linear-gradient(135deg,rgba(123,47,255,.5),rgba(0,212,255,.3));position:relative;overflow:hidden">
          <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.02) 10px,rgba(255,255,255,.02) 11px)"></div>
        </div>
        <div style="padding:0 12px;margin-top:-22px;display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:7px">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--v),var(--c));border:2px solid var(--bg2);display:flex;align-items:center;justify-content:center;font-size:20px;position:relative">
            🧑
            <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;background:var(--g);border:1.5px solid var(--bg2);box-shadow:0 0 5px var(--g)"></div>
          </div>
          <div style="font-size:8px;color:var(--c);border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.08);border-radius:8px;padding:3px 9px;cursor:pointer">تعديل</div>
        </div>
        <div style="padding:0 12px 8px">
          <div style="font-size:13px;font-weight:900;color:var(--t)">أحمد العمري</div>
          <div style="font-size:8px;color:var(--mu);font-family:'IBM Plex Mono',monospace">@ahmed_ar · الرياض</div>
          <!-- PIN badge on profile -->
          <div style="display:flex;align-items:center;gap:5px;margin-top:5px;background:rgba(123,47,255,.1);border:1px solid rgba(123,47,255,.25);border-radius:8px;padding:4px 8px">
            <span style="font-size:11px">🪪</span>
            <span style="font-size:9px;font-family:'IBM Plex Mono',monospace;color:var(--t2)">VM-4829-7X3K</span>
            <span style="font-size:8px;color:var(--c);margin-right:auto;cursor:pointer">نسخ</span>
          </div>
        </div>
        <!-- Stats -->
        <div style="display:flex;margin:0 12px 8px;background:var(--card);border:1px solid var(--border2);border-radius:10px;overflow:hidden">
          <div style="flex:1;padding:7px 4px;text-align:center;border-left:1px solid var(--border2)">
            <div style="font-size:13px;font-weight:900;color:var(--c)">142</div>
            <div style="font-size:7.5px;color:var(--mu)">تفاعل</div>
          </div>
          <div style="flex:1;padding:7px 4px;text-align:center;border-left:1px solid var(--border2)">
            <div style="font-size:13px;font-weight:900;color:var(--g)">4.8</div>
            <div style="font-size:7.5px;color:var(--mu)">تقييم</div>
          </div>
          <div style="flex:1;padding:7px 4px;text-align:center">
            <div style="font-size:13px;font-weight:900;color:var(--m)">38</div>
            <div style="font-size:7.5px;color:var(--mu)">مساعدة</div>
          </div>
        </div>
        <!-- Ratings -->
        <div style="padding:0 12px">
          <div style="font-size:9px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">التقييم الثلاثي</div>
          <div style="background:var(--card);border:1px solid rgba(0,255,156,.2);border-radius:9px;padding:8px 10px;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:13px">🛡️</span>
              <span style="font-size:9.5px;font-weight:700;color:var(--t)">المصداقية</span>
              <span style="font-size:12px;font-weight:900;color:var(--g);font-family:'IBM Plex Mono',monospace;margin-right:auto">4.9</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden">
              <div style="width:96%;height:100%;background:linear-gradient(90deg,var(--g),#00BBFF);border-radius:2px"></div>
            </div>
          </div>
        </div>
        <div class="bnav">
          <div class="bnb">📡</div><div class="bnb">💬</div>
          <div class="bnb">🪪</div><div class="bnb a">👤</div><div class="bnb">⚙️</div>
        </div>
      </div>
    </div>
  </div></div>

</div><!-- /phones -->

<!-- FEATURES -->
<div class="sec-hdr"><h2>⚡ مميزات v5.0</h2><div class="sec-line"></div></div>
<div class="feat-grid">
  <div class="fc"><div class="fc-ic">🪪</div><div class="fc-t">رقم PIN خاص لكل مستخدم</div><div class="fc-d">كل مستخدم يحصل على رقم فريد مثل VM-4829-7X3K — سهل المشاركة وصعب التزوير. لا تحتاج لمعرفة اسم المستخدم.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">📷</div><div class="fc-t">QR Code للإضافة السريعة</div><div class="fc-d">كل مستخدم لديه QR خاص — امسحه بالكاميرا لإضافة الصديق فوراً بدون كتابة أي شيء.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">🔐</div><div class="fc-t">تسجيل دخول اجتماعي</div><div class="fc-d">5 طرق: Google · Apple · Facebook · X · إيميل. لا تحتاج كلمة مرور جديدة. Supabase Auth يدير كل شيء.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">🔒</div><div class="fc-t">تشفير E2E كامل</div><div class="fc-d">AES-256-GCM للرسائل · SRTP+DTLS للصوت · RSA-2048 لتبادل المفاتيح. لا السيرفر يقرأ أي شيء.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">🍎</div><div class="fc-t">اختصارات iOS</div><div class="fc-d">Control Center Widget + Siri Shortcuts + Back Tap + Lock Screen. PTT من أي مكان بدون فتح التطبيق.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">🤖</div><div class="fc-t">اختصارات Android</div><div class="fc-d">Quick Settings Tile + Widget + Lock Screen + سماعة BT. PTT من شاشة الإغلاق بضغطة واحدة.</div><div class="fc-tag tg-new">NEW v5</div></div>
  <div class="fc"><div class="fc-ic">📡</div><div class="fc-t">AR Walkie-Talkie + PTT</div><div class="fc-d">كرات ضوئية بـ GPS حقيقي. Space للكلام. يعمل في الخلفية حتى مع قفل الشاشة.</div><div class="fc-tag tg-c">v1+</div></div>
  <div class="fc"><div class="fc-ic">💬</div><div class="fc-t">دردشة + TTL + صور</div><div class="fc-d">رسائل نصية وصور مشفّرة. 3 أوضاع حذف: Auto · 24h · دائم. Enter للإرسال.</div><div class="fc-tag tg-y">v2+</div></div>
  <div class="fc"><div class="fc-ic">🛡️</div><div class="fc-t">تقييم ثلاثي + ملف شخصي</div><div class="fc-d">مصداقية + تفاعل + مساعدة. يبنيه المجتمع. الـ PIN يظهر على الملف الشخصي.</div><div class="fc-tag tg-v">v3+</div></div>
  <div class="fc"><div class="fc-ic">⚡</div><div class="fc-t">خلفية ذكية + إشعارات</div><div class="fc-d">GPS في الخلفية. إشعارات PTT مع رد سريع. SOS يخترق وضع الصمت.</div><div class="fc-tag tg-g">v4+</div></div>
</div>

<!-- SHORTCUTS TABLE -->
<div class="sec-hdr"><h2>⌨️ جدول الاختصارات الكامل</h2><div class="sec-line"></div><span class="sec-tag">iOS + Android</span></div>
<div class="kbd-table">
  <div class="kbt-hdr"><span>الوظيفة</span><span>الاختصار</span></div>
  <div class="kbt-sec">🎙️ الصوت — مشترك</div>
  <div class="kbt-row"><div class="kbt-ic">🎙️</div><div class="kbt-i"><div class="kbt-nm">Push to Talk</div><div class="kbt-de">ضغط مطوّل — ارفع للإيقاف</div></div><div class="kbt-keys"><div class="kk2">Space</div><span class="kplus2">/</span><div class="kk2">Vol−</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🔇</div><div class="kbt-i"><div class="kbt-nm">كتم الميكروفون</div></div><div class="kbt-keys"><div class="kk2">M</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🆘</div><div class="kbt-i"><div class="kbt-nm">SOS طارئ</div></div><div class="kbt-keys"><div class="kk2">Power</div><span class="kplus2">×5</span><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-sec">🍎 iOS فقط</div>
  <div class="kbt-row"><div class="kbt-ic">📡</div><div class="kbt-i"><div class="kbt-nm">Control Center Widget</div><div class="kbt-de">زر PTT في درج التحكم</div></div><div class="kbt-keys"><div class="kk2">CC Widget</div><div class="plat-badge pb-ios">iOS</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🗣️</div><div class="kbt-i"><div class="kbt-nm">Siri: VibeMap تكلم</div><div class="kbt-de">يبدأ PTT بأمر صوتي</div></div><div class="kbt-keys"><div class="kk2">Siri</div><div class="plat-badge pb-ios">iOS</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">👆</div><div class="kbt-i"><div class="kbt-nm">Back Tap — ضربتان</div><div class="kbt-de">فتح VibeMap</div></div><div class="kbt-keys"><div class="kk2">×2 Back</div><div class="plat-badge pb-ios">iOS</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">✋</div><div class="kbt-i"><div class="kbt-nm">Back Tap — ثلاث</div><div class="kbt-de">بدء PTT مباشرة</div></div><div class="kbt-keys"><div class="kk2">×3 Back</div><div class="plat-badge pb-ios">iOS</div></div></div>
  <div class="kbt-sec">🤖 Android فقط</div>
  <div class="kbt-row"><div class="kbt-ic">📡</div><div class="kbt-i"><div class="kbt-nm">Quick Settings Tile</div><div class="kbt-de">درج الإشعارات</div></div><div class="kbt-keys"><div class="kk2">QS Tile</div><div class="plat-badge pb-and">Android</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">📱</div><div class="kbt-i"><div class="kbt-nm">Widget 4×2</div><div class="kbt-de">الشاشة الرئيسية</div></div><div class="kbt-keys"><div class="kk2">Widget</div><div class="plat-badge pb-and">Android</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🎧</div><div class="kbt-i"><div class="kbt-nm">زر إجابة BT</div><div class="kbt-de">سماعة بلوتوث</div></div><div class="kbt-keys"><div class="kk2">BT Button</div><div class="plat-badge pb-and">Android</div></div></div>
  <div class="kbt-sec">💬 الرسائل — مشترك</div>
  <div class="kbt-row"><div class="kbt-ic">💬</div><div class="kbt-i"><div class="kbt-nm">إرسال رسالة</div></div><div class="kbt-keys"><div class="kk2">Enter</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">↩️</div><div class="kbt-i"><div class="kbt-nm">رد سريع</div><div class="kbt-de">من الإشعار</div></div><div class="kbt-keys"><div class="kk2">Alt</div><span class="kplus2">+</span><div class="kk2">R</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🔥</div><div class="kbt-i"><div class="kbt-nm">تبديل TTL</div><div class="kbt-de">Auto → 24h → Keep</div></div><div class="kbt-keys"><div class="kk2">Alt</div><span class="kplus2">+</span><div class="kk2">T</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-sec">🔧 تطبيق</div>
  <div class="kbt-row"><div class="kbt-ic">🌙</div><div class="kbt-i"><div class="kbt-nm">تبديل الوضع داكن/فاتح</div></div><div class="kbt-keys"><div class="kk2">Ctrl</div><span class="kplus2">+</span><div class="kk2">D</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">⚡</div><div class="kbt-i"><div class="kbt-nm">تشغيل/إيقاف الخلفية</div></div><div class="kbt-keys"><div class="kk2">Ctrl</div><span class="kplus2">+</span><div class="kk2">B</div><div class="plat-badge pb-both">كلاهما</div></div></div>
  <div class="kbt-row"><div class="kbt-ic">🛡️</div><div class="kbt-i"><div class="kbt-nm">تفعيل/إيقاف تشفير E2E</div></div><div class="kbt-keys"><div class="kk2">Ctrl</div><span class="kplus2">+</span><div class="kk2">E</div><div class="plat-badge pb-both">كلاهما</div></div></div>
</div>

<!-- LEGEND -->
<div class="legend">
  <div class="leg-t">Brand Colors v5</div>
  <div class="leg-r">
    <div class="lg"><div class="ld" style="background:#00D4FF;box-shadow:0 0 7px #00D4FF"></div><div class="ll">Talking</div></div>
    <div class="lg"><div class="ld" style="background:#7B2FFF;box-shadow:0 0 7px #7B2FFF"></div><div class="ll">Social</div></div>
    <div class="lg"><div class="ld" style="background:#C840FF;box-shadow:0 0 7px #C840FF"></div><div class="ll">Gradient</div></div>
    <div class="lg"><div class="ld" style="background:#00FF9C;box-shadow:0 0 7px #00FF9C"></div><div class="ll">Online/BG</div></div>
    <div class="lg"><div class="ld" style="background:#FF4444;box-shadow:0 0 7px #FF4444"></div><div class="ll">SOS</div></div>
    <div class="lg"><div class="ld" style="background:#00FFD4;box-shadow:0 0 6px #00FFD4"></div><div class="ll">E2E/BT</div></div>
  </div>
</div>
</div>

<script>
const stored = localStorage.getItem('vbTheme') || 'dark';
let curTheme = stored;
function setTheme(t){
  curTheme=t;localStorage.setItem('vbTheme',t);
  const body=document.body;
  if(t==='system'){body.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');}
  else body.setAttribute('data-theme',t);
  ['dark','light','system'].forEach(x=>document.getElementById('btn-'+x)?.classList.toggle('on',x===t));
}
function toggleCL(){document.getElementById('cl-panel').classList.toggle('open');}
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change',e=>{if(curTheme==='system')setTheme('system');});
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='d'){e.preventDefault();setTheme(curTheme==='dark'?'light':'dark');}
});
setTheme(curTheme);
</script>
</body>
</html>
`;
export default HTML_APP;
