// js/router.js — router modulare RistoflowBook
(function(){
  var supa = window._supa;
  var _ME  = null;

  // Route accessibili senza login
  var PUBLIC_ROUTES = ["locali","scopri","home","cultura","offerte","ricette"];
  // Route che richiedono login
  var AUTH_ROUTES = ["tessera","profilo","messaggi","prenota"];

  async function checkProfiloCompleto(){
    if(!_ME) return false;
    try{
      var t = new Promise(function(r){setTimeout(function(){r(null);},3000);});
      var q = supa.from("clienti_profilo").select("citta").eq("user_id",_ME.id).maybeSingle();
      var res = await Promise.race([q,t]);
      var data = res&&res.data!==undefined ? res.data : res;
      return !!(data&&data.citta);
    }catch(e){ return true; }
  }

  async function init(){
    document.getElementById("initial-loader").style.display="none";
    var sessionResult = await supa.auth.getSession();
    if(sessionResult.error){ await supa.auth.signOut(); }

    var {data:{session}} = sessionResult;
    if(session){
      _ME = session.user;
      window._ME = _ME;
      window._socialME = _ME;
      var ok = await checkProfiloCompleto();
      if(ok) window.showApp(); else window.showCompleta();
      return;
    }

    // Nessuna sessione — mostra app come guest
    window._ME = null;
    window._socialME = null;
    window.showApp();

    supa.auth.onAuthStateChange(async function(ev, sess){
      if(ev==="SIGNED_IN"&&sess){
        _ME = sess.user; window._ME = _ME; window._socialME = _ME;
        var ok = await checkProfiloCompleto();
        if(ok) window.showApp(); else window.showCompleta();
      } else if(ev==="SIGNED_OUT"){
        _ME = null; window._ME = null; window._socialME = null;
        // Torna alla lista locali come guest
        window.navTo("locali");
      }
    });
  }

  var MODULES = {
    scopri:    "js/feed.js",
    home:      "js/feed.js",
    locali:    "js/locali.js",
    prenota:   "js/booking.js",
    tessera:   "js/tessera.js",
    profilo:   "js/profilo.js",
    messaggi:  "js/messaggi.js",
    ricette:   "js/feed.js",
    cultura:   "js/cultura.js",
    offerte:   "js/offerte.js",
    storie:    "js/storie.js",
  };

  var _loaded = {};

  window.navTo = function(page){
    // Se route richiede login e non loggato → mostra auth
    if(AUTH_ROUTES.indexOf(page) >= 0 && !window._ME){
      window.showAuth();
      return;
    }
    document.querySelectorAll(".nav-item").forEach(function(b){
      b.classList.toggle("active", b.dataset.page===page);
    });
    var topTitle = document.getElementById("top-title");
    var titles = {scopri:"RistoflowBook",locali:"Scopri Locali",tessera:"Tessera",profilo:"Profilo",messaggi:"Messaggi"};
    if(topTitle && titles[page]) topTitle.textContent = titles[page];
    var c = document.getElementById("page-content");
    c.scrollTop = 0;
    loadModule(page, c);
  };

  // Funzione per richiedere login al momento dell'interazione
  window.richiedeLogin = function(azione){
    if(window._ME) return true;
    // Mostra mini prompt invece del login completo
    var overlay = document.getElementById("login-prompt-overlay");
    if(!overlay){
      overlay = document.createElement("div");
      overlay.id = "login-prompt-overlay";
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;display:flex;align-items:flex-end;";
      overlay.innerHTML = '<div style="background:#fff;border-radius:16px 16px 0 0;width:100%;padding:24px 20px 36px;text-align:center;">' +
        '<div style="width:36px;height:4px;background:#e2e8f0;border-radius:999px;margin:0 auto 20px;"></div>' +
        '<div style="font-size:22px;margin-bottom:8px;">👋</div>' +
        '<div style="font-size:17px;font-weight:700;margin-bottom:6px;">Entra in RistoflowBook</div>' +
        '<div style="font-size:14px;color:#64748b;margin-bottom:20px;">Per '+(azione||"interagire")+' devi avere un profilo</div>' +
        '<button onclick="window.showAuth();document.getElementById(\'login-prompt-overlay\').remove()" style="width:100%;padding:14px;background:#0E5A7A;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Accedi o Registrati</button>' +
        '<button onclick="document.getElementById(\'login-prompt-overlay\').remove()" style="width:100%;padding:12px;background:none;border:none;font-size:14px;color:#94a3b8;cursor:pointer;">Continua come ospite</button>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
    }
    return false;
  };

  async function loadModule(page, container){
    var src = MODULES[page];
    if(!src){ console.warn("Route non trovata:", page); return; }
    container.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    if(!_loaded[src]){
      await new Promise(function(resolve, reject){
        var s = document.createElement("script");
        s.src = src + "?v=2";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      _loaded[src] = true;
    }
    var fnMap = {
      scopri:   window.renderFeed,
      home:     window.renderFeed,
      ricette:  window.renderRicette,
      locali:   window.renderLocali,
      prenota:  window.renderPrenota,
      tessera:  window.renderTessera,
      profilo:  window.renderProfilo,
      messaggi: window.renderMessaggi,
      cultura:  window.renderCultura,
      offerte:  window.renderOfferte,
      storie:   window.renderStorie,
    };
    var fn = fnMap[page];
    if(typeof fn === "function"){
      try{ await fn(container); }
      catch(e){ console.error("Errore render "+page, e); container.innerHTML='<div style="padding:20px;color:#dc2626">Errore caricamento pagina.</div>'; }
    } else {
      console.warn("render non trovato per:", page);
    }
  }

  var _t = setTimeout(function(){
    var l = document.getElementById("initial-loader");
    if(l && l.style.display!=="none"){ l.style.display="none"; window.showApp(); }
  }, 5000);

  init().then(function(){clearTimeout(_t);}).catch(function(e){
    clearTimeout(_t);
    var l = document.getElementById("initial-loader");
    if(l) l.style.display="none";
    window.showApp();
  });

})();
