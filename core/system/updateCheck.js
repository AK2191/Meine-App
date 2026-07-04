/* core/system/updateCheck.js
 * O2: Update-Hinweis. Prueft still, ob auf GitHub Pages eine neuere Version
 * liegt (version.json, cache-umgehend), und zeigt dann EINEN dezenten Hinweis
 * mit "Neu laden". Kein Polling-Spam (Start + alle 15 Minuten), kein Flackern,
 * nichts Blockierendes. Minimalistisch im App-Stil.
 */
(function(){
  'use strict';
  var SHOWN = false;

  function currentVersion(){
    try{ if(window.ChangePollenView && window.ChangePollenView.version) return String(window.ChangePollenView.version); }catch(e){}
    try{
      var s = document.querySelector('script[src*="?v=0."]');
      var m = s && s.getAttribute('src').match(/\?v=([0-9.]+)/);
      if(m) return m[1];
    }catch(e){}
    return '';
  }

  // true, wenn b eine echt neuere Version als a ist (segmentweise numerisch).
  function isNewer(a, b){
    if(!a || !b || a === b) return false;
    var pa = String(a).split('.'), pb = String(b).split('.');
    var n = Math.max(pa.length, pb.length);
    for(var i=0;i<n;i++){
      var x = parseInt(pa[i]||'0',10), y = parseInt(pb[i]||'0',10);
      if(y>x) return true;
      if(y<x) return false;
    }
    return false;
  }

  function showBanner(remote){
    if(SHOWN) return;
    SHOWN = true;
    var bar = document.createElement('div');
    bar.setAttribute('id','change-update-banner');
    bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;'+
      'display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;'+
      'background:rgba(13,21,18,.96);border:1px solid rgba(52,211,153,.35);color:#e7f5ee;'+
      'font:500 13px/1.4 "Plus Jakarta Sans",system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45);';
    var txt = document.createElement('span');
    txt.textContent = 'Neue Version ' + remote + ' verf\u00fcgbar';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Neu laden';
    btn.style.cssText = 'border:0;border-radius:10px;padding:7px 12px;cursor:pointer;'+
      'background:#10b981;color:#04110b;font:600 13px "Plus Jakarta Sans",system-ui,sans-serif;';
    btn.addEventListener('click', function(){ try{ location.reload(); }catch(e){} });
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label','Schlie\u00dfen');
    close.textContent = '\u00d7';
    close.style.cssText = 'border:0;background:transparent;color:#9fb8ac;font-size:16px;cursor:pointer;padding:0 2px;';
    close.addEventListener('click', function(){ try{ bar.remove(); }catch(e){} });
    bar.appendChild(txt); bar.appendChild(btn); bar.appendChild(close);
    try{ document.body.appendChild(bar); }catch(e){}
  }

  function check(){
    var local = currentVersion();
    if(!local) return;
    fetch('./version.json?nocache=' + Date.now(), {cache:'no-store'})
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        var remote = data && data.version;
        if(remote && isNewer(local, remote)) showBanner(remote);
      })
      .catch(function(){ /* still: Update-Check darf nie stoeren */ });
  }

  try{
    setTimeout(check, 8000);                 // nach dem Start, nicht blockierend
    setInterval(check, 15 * 60 * 1000);      // danach alle 15 Minuten
  }catch(e){}
})();
