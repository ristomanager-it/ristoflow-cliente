// js/shell.js — struttura fissa di Ospitalia (22/11/2026)
// Testata col nome del contesto + menu ☰ da destra + barra in basso.
// Le spiegazioni stanno tutte in "Istruzioni" (menu), non dentro le pagine.
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  var ICO = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    indietro: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>'
  };
  // pagine principali: in testata il nome del contesto; le altre: freccia + titolo
  var TITOLI = { locali:"Prenota", tessera:"Tessera", profilo:"Profilo", messaggi:"Messaggi",
                 offerte:"Offerte", ricette:"Ricette", cultura:"Cultura", istruzioni:"Istruzioni", prenota:"Prenota" };
  var HOME = { scopri:1, home:1 };

  window.NOVITA_RFBOOK = [
    { data:"22 novembre 2026", testo:"Recensioni verificate: recensisce solo chi è stato davvero nel locale, con una prenotazione o un passaggio in cassa con la tessera. Ogni recensione vale 100 punti." },
    { data:"22 novembre 2026", testo:"Nuova veste: menu laterale, barra in basso con Prenota, Pubblica, Messaggi e Tessera. Le spiegazioni ora sono tutte qui." }
  ];

  window.rbDopoNav = function(page){
    var top = document.getElementById("rb-top"); if(!top) return;
    if(HOME[page] || !TITOLI[page]){
      top.innerHTML = '<div class="rb-ctx">Ospitalia<span class="rb-tri" aria-hidden="true"></span></div>' + bottoneMenu();
    } else {
      top.innerHTML = '<div class="rb-interna"><button class="rb-ico" onclick="navTo(\'scopri\')" aria-label="Indietro">'+ICO.indietro+'</button><span>'+esc(TITOLI[page])+'</span></div>' + bottoneMenu();
    }
    document.querySelectorAll(".rb-bar .nav-item").forEach(function(b){
      var p = b.dataset.page;
      b.classList.toggle("active", p===page || (p==="scopri" && !!HOME[page]));
    });
    if(page==="messaggi") try{ localStorage.setItem("rb_msg_visto", new Date().toISOString()); }catch(e){}
    chiudiMenu();
    aggiornaBadge();
  };
  function bottoneMenu(){ return '<button class="rb-ico" onclick="rbApriMenu()" aria-label="Menu">'+ICO.menu+'</button>'; }

  // ── MENU ☰ ──
  window.rbApriMenu = async function(){
    var dr = document.getElementById("rb-drawer");
    var ME = window._ME;
    var nome = (ME && ME.user_metadata && ME.user_metadata.nome_completo) || "";
    var h = '<div class="rb-dtt"><span>'+(nome ? "Ciao, "+esc(nome.split(" ")[0]) : "Ospitalia")+'</span><button class="rb-ico" onclick="rbChiudiMenu()" aria-label="Chiudi">'+ICO.x+'</button></div>';
    h += '<div class="rb-gr">I miei locali</div><div id="rb-miei"></div>' +
      '<button class="rb-voce" onclick="navTo(\'locali\')"><span class="mini tutti"></span>Tutti i locali</button>';
    h += '<div class="rb-gr">Ospitalia</div>' +
      voce("scopri","Bacheca") + voce("offerte","Offerte") + voce("ricette","Ricette") + voce("cultura","Cultura del cibo");
    h += '<div class="rb-gr">Le mie cose</div>' +
      voce("tessera","Tessere e punti") + voce("messaggi","Messaggi") + voce("locali","Prenota un tavolo");
    h += '<div class="rb-gr">Il mio account</div>' +
      (ME ? voce("profilo","Profilo e impostazioni") : '<button class="rb-voce" onclick="rbChiudiMenu();showAuth()">Accedi o registrati</button>') +
      '<button class="rb-voce" onclick="rbInvita()">Invita un amico</button>' +
      voce("istruzioni","Istruzioni") +
      (ME ? '<button class="rb-voce" onclick="rbChiudiMenu();doLogout()">Esci</button>' : '');
    dr.innerHTML = h;
    document.body.classList.add("rb-menu-aperto");
    // locali seguiti (le aziende che segui → le loro sedi)
    var box = document.getElementById("rb-miei");
    if(!ME){ box.innerHTML = ''; return; }
    try{
      var r = await supa.from("social_follower").select("following_id").eq("follower_id",ME.id);
      var ids = (r.data||[]).map(function(x){return x.following_id;});
      if(!ids.length) return;
      var s = await supa.from("sedi").select("id,nome,logo_url,azienda_id").in("azienda_id",ids).eq("attiva",true).eq("visibile_in_book",true).order("nome");
      box.innerHTML = (s.data||[]).map(function(x){
        return '<button class="rb-voce" onclick="rbApriLocale(\''+esc(x.id)+'\')"><span class="mini">'+(x.logo_url?'<img src="'+esc(x.logo_url)+'" alt="">':'')+'</span>'+esc(x.nome)+'</button>';
      }).join("");
    }catch(e){}
  };
  function voce(p, l){ return '<button class="rb-voce" onclick="navTo(\''+p+'\')">'+esc(l)+'</button>'; }
  function chiudiMenu(){ document.body.classList.remove("rb-menu-aperto"); }
  window.rbChiudiMenu = chiudiMenu;

  window.rbApriLocale = async function(sedeId){
    chiudiMenu();
    // la scheda del locale vive in locali.js: lo carico se serve
    if(typeof window.apriSchedaLocale !== "function"){
      await new Promise(function(res){ var s=document.createElement("script"); s.src="js/locali.js?v=9"; s.onload=res; s.onerror=res; document.head.appendChild(s); });
    }
    if(typeof window.apriSchedaLocale === "function") window.apriSchedaLocale(sedeId);
  };

  window.rbInvita = function(){
    var url = "https://social.ristoflow-ai.com/";
    var t = "Ti invito su Ospitalia: i locali, le foto e le prenotazioni in un'unica app.";
    if(navigator.share) navigator.share({title:"Ospitalia", text:t, url:url}).catch(function(){});
    else if(navigator.clipboard) navigator.clipboard.writeText(url).then(function(){ alert("Link copiato"); });
  };

  // badge Messaggi: conversazioni con un messaggio dopo l'ultima apertura di Messaggi su questo telefono
  async function aggiornaBadge(){
    var b = document.getElementById("rb-badge"); if(!b) return;
    var ME = window._ME; if(!ME){ b.style.display="none"; return; }
    try{
      var visto = localStorage.getItem("rb_msg_visto") || "1970-01-01T00:00:00Z";
      var r = await supa.from("messaggi_conversazioni").select("id",{count:"exact",head:true})
        .or("partecipante_1.eq."+ME.id+",partecipante_2.eq."+ME.id).gt("ultimo_messaggio_at",visto);
      var n = r.count || 0;
      b.textContent = n > 9 ? "9+" : n; b.style.display = n ? "block" : "none";
    }catch(e){ b.style.display="none"; }
  }

  // ── ISTRUZIONI ──
  window.renderIstruzioni = function(c){
    var s = function(t,p){ return '<h4>'+t+'</h4><p>'+p+'</p>'; };
    c.innerHTML = '<div class="pb-nav rb-ist">' +
      '<h4 style="margin-top:6px">Novità</h4><div class="rb-box">' +
        window.NOVITA_RFBOOK.map(function(n){ return '<div class="rb-riga"><b>'+esc(n.data)+'</b>'+esc(n.testo)+'</div>'; }).join("") + '</div>' +
      s("La bacheca","In Home trovi le foto, le recensioni e le novità dei locali e delle persone che segui. Prima vedi chi segui, poi tutti gli altri. Le etichette sotto le storie filtrano per Momenti, Ricette, Recensioni, Offerte e Lavoro.") +
      s("Le storie","I cerchi in alto sono le storie delle ultime 24 ore. Tocca un cerchio per aprirla a tutto schermo; tocca la foto per passare alla successiva. Il primo cerchio, con il +, serve a pubblicare la tua.") +
      s("Pubblicare","Tocca il + al centro della barra in basso e scegli cosa pubblicare: un momento, una ricetta, una recensione, un'offerta di lavoro o una storia.") +
      s("Prenotare","Tocca Prenota nella barra in basso: trovi i locali, puoi cercarli per nome o città e ordinarli per vicinanza o voto. Dalla scheda del locale scegli giorno, persone e orario.") +
      s("Recensioni","Su Ospitalia recensisce solo chi è stato davvero nel locale: serve una prenotazione arrivata o un passaggio in cassa con la tessera. Una recensione per locale, che vale 100 punti. Si scrive dalla scheda del locale o dal + in basso.") +
      s("I miei locali","Nel menu ☰ trovi i locali che segui. Per seguire un locale apri la sua scheda e tocca Segui.") +
      s("Messaggi","Scrivi alle persone di Ospitalia. Il numero sulla barra indica le conversazioni con messaggi nuovi.") +
      s("Tessere e punti","Hai una tessera per ogni locale in cui sei cliente e una tessera Ospitalia che somma i punti di tutti. Mostra il codice alla cassa per raccogliere punti. Con i punti sali di livello: Bronzo, Argento, Oro, Platinum.") +
      s("Salvare sul telefono","Su iPhone: tocca Condividi (□↑) e poi \"Aggiungi a schermata Home\". Su Android: tocca i tre puntini e poi \"Aggiungi a schermata Home\". Non serve scaricare app.") +
      s("Privacy","I tuoi dati sono trattati secondo il GDPR (Reg. UE 2016/679). Dal Profilo puoi modificarli; per cancellarli scrivi al locale o a Ospitalia.") +
    '</div>';
  };

  document.addEventListener("click", function(e){ if(e.target && e.target.id === "rb-velo") chiudiMenu(); });
})();
