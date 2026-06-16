// js/router.js — router modulare RistoflowBook
(function(){
  var supa = window._supa;
  var _ME  = null;

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
    if(sessionResult.error){ await supa.auth.signOut(); window.showAuth(); return; }
    var {data:{session}} = sessionResult;
    if(session){
      _ME = session.user;
      window._ME = _ME;
      window._socialME = _ME;
      var ok = await checkProfiloCompleto();
      if(ok) window.showApp(); else window.showCompleta();
      return;
    }
    window.showAuth();
    supa.auth.onAuthStateChange(async function(ev, sess){
      if(ev==="SIGNED_IN"&&sess){
        _ME = sess.user; window._ME = _ME; window._socialME = _ME;
        var ok = await checkProfiloCompleto();
        if(ok) window.showApp(); else window.showCompleta();
      } else if(ev==="SIGNED_OUT"){
        _ME = null; window._ME = null; window._socialME = null;
        window.showAuth();
      }
    });
  }

  // Mappa route → modulo JS
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

  var _loaded = {};  // cache moduli già caricati

  window.navTo = function(page){
    document.querySelectorAll(".nav-item").forEach(function(b){
      b.classList.toggle("active", b.dataset.page===page);
    });
    var c = document.getElementById("page-content");
    c.scrollTop = 0;
    loadModule(page, c);
  };

  async function loadModule(page, container){
    var src = MODULES[page];
    if(!src){ console.warn("Route non trovata:", page); return; }

    container.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    // Carica script se non ancora caricato
    if(!_loaded[src]){
      await new Promise(function(resolve, reject){
        var s = document.createElement("script");
        s.src = src + "?v=1";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      _loaded[src] = true;
    }

    // Chiama la funzione render del modulo
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

  // Timeout sicurezza
  var _t = setTimeout(function(){
    var l = document.getElementById("initial-loader");
    if(l && l.style.display!=="none"){ l.style.display="none"; window.showAuth(); }
  }, 5000);

  init().then(function(){clearTimeout(_t);}).catch(function(e){
    clearTimeout(_t);
    var l = document.getElementById("initial-loader");
    if(l) l.style.display="none";
    window.showAuth();
  });

})();
