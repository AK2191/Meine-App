(function(){
  'use strict';

  var pendingAuth = null;
  var lastWarnAt = 0;

  function hasFirebase(){
    return typeof window !== 'undefined' && window.firebase && window.FIREBASE_CONFIG && firebase.auth && firebase.firestore;
  }

  function initFirebase(){
    if(!hasFirebase()) return false;
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    return true;
  }

  function readStored(key){
    try{ return localStorage.getItem(key) || ''; }catch(e){ return ''; }
  }

  function getGoogleAccessToken(explicitToken){
    if(explicitToken) return String(explicitToken || '').trim();
    try{ if(typeof accessToken !== 'undefined' && accessToken && accessToken !== 'firebase-auth') return String(accessToken).trim(); }catch(e){}
    try{ if(window.accessToken && window.accessToken !== 'firebase-auth') return String(window.accessToken).trim(); }catch(e){}
    try{ if(window.SecureTokenStore && typeof window.SecureTokenStore.getToken === 'function'){ var t = window.SecureTokenStore.getToken(); if(t) return String(t).trim(); } }catch(e){}
    var legacy = readStored('access_token');
    if(legacy && legacy !== 'firebase-auth') return String(legacy).trim();
    return '';
  }

  function isUsableAccessToken(token){
    return !!(token && token.length > 20 && token !== 'firebase-auth' && token !== 'undefined' && token !== 'null');
  }

  async function waitForAuthState(timeoutMs){
    timeoutMs = timeoutMs || 1200;
    if(!initFirebase()) return null;
    var auth = firebase.auth();
    if(auth.currentUser) return auth.currentUser;
    return new Promise(function(resolve){
      var done = false;
      var timer = setTimeout(function(){
        if(done) return;
        done = true;
        try{ unsub && unsub(); }catch(e){}
        resolve(auth.currentUser || null);
      }, timeoutMs);
      var unsub = auth.onAuthStateChanged(function(user){
        if(done) return;
        done = true;
        clearTimeout(timer);
        try{ unsub && unsub(); }catch(e){}
        resolve(user || null);
      });
    });
  }

  function userEmail(){
    try{ if(window.userInfo && window.userInfo.email) return String(window.userInfo.email).trim().toLowerCase(); }catch(e){}
    try{ var safe = JSON.parse(localStorage.getItem('user_info_safe') || localStorage.getItem('user_info') || '{}'); if(safe && safe.email) return String(safe.email).trim().toLowerCase(); }catch(e){}
    return '';
  }

  function sameUserOrNoEmail(firebaseUser){
    if(!firebaseUser) return false;
    var expected = userEmail();
    if(!expected) return true;
    var actual = String(firebaseUser.email || '').trim().toLowerCase();
    return !actual || actual === expected;
  }

  function warnOnce(message, error){
    var now = Date.now();
    if(now - lastWarnAt < 3000) return;
    lastWarnAt = now;
    console.warn(message, error || '');
  }

  async function ensureChangeFirebaseAuth(options){
    options = options || {};
    if(!initFirebase()) return false;
    if(pendingAuth) return pendingAuth;

    pendingAuth = (async function(){
      try{
        var auth = firebase.auth();
        var current = auth.currentUser || await waitForAuthState(700);
        if(current && sameUserOrNoEmail(current)) return true;

        var token = getGoogleAccessToken(options.accessToken);
        if(!isUsableAccessToken(token)){
          if(!options.silent) {
            try{ if(typeof toast === 'function') toast('Firebase-Anmeldung fehlt. Bitte einmal neu mit Google anmelden.','err'); }catch(e){}
          }
          return false;
        }

        var credential = firebase.auth.GoogleAuthProvider.credential(null, token);
        await auth.signInWithCredential(credential);
        return !!auth.currentUser;
      }catch(e){
        warnOnce('Firebase Auth Bridge:', e);
        if(!options.silent){
          var msg = e && e.code === 'auth/operation-not-allowed'
            ? 'Firebase Google-Anmeldung ist nicht aktiviert. Bitte Google Provider in Firebase Authentication aktivieren.'
            : 'Firebase-Anmeldung fehlgeschlagen. Bitte neu mit Google anmelden.';
          try{ if(typeof toast === 'function') toast(msg, 'err'); }catch(_e){}
        }
        return false;
      }finally{
        pendingAuth = null;
      }
    })();

    return pendingAuth;
  }

  window.ensureChangeFirebaseAuth = ensureChangeFirebaseAuth;
})();
