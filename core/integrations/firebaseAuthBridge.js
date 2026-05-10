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

  function isEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function safeJsonRead(key){
    try{
      var raw = localStorage.getItem(key);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }

  function userEmail(){
    try{ if(window.userInfo && window.userInfo.email) return String(window.userInfo.email).trim().toLowerCase(); }catch(e){}
    var sources = [
      safeJsonRead('change_v1_user_info'),
      safeJsonRead('user_info_safe'),
      safeJsonRead('user_info')
    ];
    for(var i=0;i<sources.length;i++){
      var item = sources[i] || {};
      if(item.email) return String(item.email).trim().toLowerCase();
    }
    try{ var mail = localStorage.getItem('change_v1_user_email') || localStorage.getItem('user_email') || ''; if(mail) return String(mail).trim().toLowerCase(); }catch(e){}
    return '';
  }

  function sameUserOrNoEmail(firebaseUser){
    if(!firebaseUser) return false;
    var expected = userEmail();
    if(!expected) return true;
    var actual = String(firebaseUser.email || '').trim().toLowerCase();
    return !!actual && actual === expected;
  }

  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  function writeToken(token){
    if(!token) return;
    try{ if(window.SecureTokenStore && typeof window.SecureTokenStore.setToken === 'function') window.SecureTokenStore.setToken(token, 3600); }catch(e){}
    try{ if(typeof ls === 'function') ls('access_token', token); else localStorage.setItem('access_token', JSON.stringify(token)); }catch(e){}
    try{ window.accessToken = token; }catch(e){}
    try{ if(typeof accessToken !== 'undefined') accessToken = token; }catch(e){}
  }

  function writeUser(user){
    if(!user) return;
    var info = {
      name: user.displayName || user.email || '',
      email: user.email || '',
      picture: user.photoURL || '',
      uid: user.uid || ''
    };
    try{ window.userInfo = Object.assign({}, window.userInfo || {}, info); }catch(e){}
    try{ if(typeof userInfo !== 'undefined') userInfo = Object.assign({}, userInfo || {}, info); }catch(e){}
    try{ if(window.SecureTokenStore && typeof window.SecureTokenStore.setUser === 'function') window.SecureTokenStore.setUser(info); }catch(e){}
    writeJson('change_v1_user_info', info);
    writeJson('user_info_safe', {name:info.name,email:info.email,picture:info.picture});
    writeJson('user_info', info);
    try{ localStorage.setItem('change_v1_user_email', String(info.email || '').toLowerCase()); localStorage.setItem('user_email', String(info.email || '').toLowerCase()); }catch(e){}
  }

  function applyAuthResult(result){
    if(!result || !result.user) return null;
    writeUser(result.user);
    var oauthToken = '';
    try{
      var credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
      oauthToken = credential && credential.accessToken ? credential.accessToken : '';
    }catch(e){}
    if(oauthToken) writeToken(oauthToken);
    try{ localStorage.setItem('was_logged_in', 'true'); }catch(e){}
    return { user: result.user, accessToken: oauthToken };
  }

  function provider(){
    var p = new firebase.auth.GoogleAuthProvider();
    p.addScope('profile');
    p.addScope('email');
    p.addScope('https://www.googleapis.com/auth/calendar');
    try{ p.setCustomParameters({ prompt: 'select_account' }); }catch(e){}
    return p;
  }

  function shouldUseRedirect(options){
    options = options || {};
    // Redirect verlässt die GitHub-Pages-App und kann beim nächsten Öffnen wieder
    // direkt auf accounts.google.com landen. Deshalb nur noch nutzen, wenn es
    // ausdrücklich angefordert wird. Standard ist Popup/kein automatischer Redirect.
    return options.redirect === true && options.popup !== true;
  }

  async function waitForAuthState(timeoutMs){
    timeoutMs = timeoutMs || 1200;
    if(!initFirebase()) return null;
    var auth = firebase.auth();
    if(auth.currentUser) return auth.currentUser;
    return new Promise(function(resolve){
      var done = false;
      var unsub = function(){};
      var timer = setTimeout(function(){
        if(done) return;
        done = true;
        try{ unsub(); }catch(e){}
        resolve(auth.currentUser || null);
      }, timeoutMs);
      unsub = auth.onAuthStateChanged(function(user){
        if(done) return;
        done = true;
        clearTimeout(timer);
        try{ unsub(); }catch(e){}
        resolve(user || null);
      });
    });
  }

  function warnOnce(message, error){
    var now = Date.now();
    if(now - lastWarnAt < 3000) return;
    lastWarnAt = now;
    console.warn(message, error || '');
  }

  async function signInChangeFirebaseWithGoogle(options){
    options = options || {};
    if(!initFirebase()) throw new Error('Firebase ist nicht bereit');
    var auth = firebase.auth();
    if(auth.currentUser && sameUserOrNoEmail(auth.currentUser)){
      writeUser(auth.currentUser);
      return { user: auth.currentUser, accessToken: '', reused: true };
    }
    if(shouldUseRedirect(options)){
      await auth.signInWithRedirect(provider());
      return { redirecting: true };
    }
    try{
      var result = await auth.signInWithPopup(provider());
      return applyAuthResult(result) || { user: auth.currentUser, accessToken: '' };
    }catch(e){
      if(e && (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request')){
        await auth.signInWithRedirect(provider());
        return { redirecting: true };
      }
      throw e;
    }
  }

  async function ensureChangeFirebaseAuth(options){
    options = options || {};
    if(!initFirebase()) return false;
    if(pendingAuth) return pendingAuth;

    pendingAuth = (async function(){
      try{
        var auth = firebase.auth();
        var current = auth.currentUser || await waitForAuthState(options.waitMs || 700);
        if(current && sameUserOrNoEmail(current)){
          writeUser(current);
          return true;
        }

        // Wichtig: Keine Google-Calendar access_tokens mehr gegen Firebase Auth tauschen.
        // Diese Tokens gehören oft zu einem anderen OAuth-Client und erzeugen
        // auth/invalid-credential: "access_token audience is not for this project".
        if(!options.interactive){
          if(!options.silent){
            try{ if(typeof toast === 'function') toast('Firebase-Anmeldung fehlt. Bitte einmal neu mit Google anmelden.','err'); }catch(e){}
          }
          return false;
        }

        var result = await signInChangeFirebaseWithGoogle({ popup: true });
        return !!(result && (result.user || result.redirecting || auth.currentUser));
      }catch(e){
        warnOnce('Firebase Auth Bridge:', e);
        if(!options.silent){
          var code = e && e.code ? e.code : '';
          var msg = 'Firebase-Anmeldung fehlgeschlagen. Bitte neu mit Google anmelden.';
          if(code === 'auth/operation-not-allowed') msg = 'Firebase Google-Anmeldung ist nicht aktiviert. Bitte Google Provider in Firebase Authentication aktivieren.';
          if(code === 'auth/unauthorized-domain') msg = 'Firebase Auth: Diese Domain ist nicht freigegeben. Bitte GitHub-Pages-Domain in Firebase Authentication erlauben.';
          if(code === 'auth/popup-closed-by-user') msg = 'Firebase-Anmeldung wurde geschlossen.';
          try{ if(typeof toast === 'function') toast(msg, 'err'); }catch(_e){}
        }
        return false;
      }finally{
        pendingAuth = null;
      }
    })();

    return pendingAuth;
  }

  window.applyChangeFirebaseAuthResult = applyAuthResult;
  window.signInChangeFirebaseWithGoogle = signInChangeFirebaseWithGoogle;
  window.ensureChangeFirebaseAuth = ensureChangeFirebaseAuth;
  window.isChangeFirebaseAuthReady = function(){
    try{ return !!(initFirebase() && firebase.auth().currentUser); }catch(e){ return false; }
  };
})();
