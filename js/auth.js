// js/auth.js — autenticazione RistoflowBook
(function(){
  var supa = window._supa;

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function val(id){var e=document.getElementById(id);return e?e.value.trim():"";}

  function hideAll(){
    document.getElementById("initial-loader").style.display="none";
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("conferma-screen").classList.remove("active");
    document.getElementById("completa-screen").classList.remove("active");
    document.getElementById("app-shell").style.display="none";
  }

  window.showAuth = function(){
    hideAll();
    document.getElementById("auth-screen").classList.add("active");
  };

  function showConferma(email){
    hideAll();
    document.getElementById("conferma-screen").classList.add("active");
    document.getElementById("conferma-email-txt").innerHTML =
      "Abbiamo inviato un link a:<br><strong>"+esc(email)+"</strong>";
  }

  window.showCompleta = function(){
    hideAll();
    var screen = document.getElementById("completa-screen");
    screen.classList.add("active");
    renderCompletaForm(screen);
  };

  window.showApp = function(){
    hideAll();
    document.getElementById("app-shell").style.display="flex";
    aggiornaTopAvatar();
    window.navTo("locali");
  };

  function aggiornaTopAvatar(){
    var av = document.getElementById("top-av");
    if(!av) return;
    var nome = (window._ME && window._ME.user_metadata && window._ME.user_metadata.nome_completo) || "";
    if(nome) av.textContent = nome.charAt(0).toUpperCase();
  }

  // ── FORM COMPLETA PROFILO — nuovo con interessi ──
  var _avatarFile = null;
  var _interessiSel = [];

  var INTERESSI = [
    {v:"cucina_italiana", l:"🍝 Cucina Italiana"},
    {v:"pizza", l:"🍕 Pizza & Pizzerie"},
    {v:"pesce", l:"🐟 Pesce & Seafood"},
    {v:"carne_grill", l:"🥩 Carne & Grill"},
    {v:"vino", l:"🍷 Vino & Degustazioni"},
    {v:"cocktail", l:"🍸 Cocktail & Aperitivi"},
    {v:"street_food", l:"🌯 Street Food"},
    {v:"cucina_etnica", l:"🌍 Cucina Etnica"},
    {v:"dolci_pasticceria", l:"🍰 Dolci & Pasticceria"},
    {v:"brunch", l:"🥞 Brunch & Colazioni"},
    {v:"eventi_cene", l:"🎉 Cene ed Eventi"},
    {v:"cucina_vegetariana", l:"🥗 Vegetariano & Vegan"},
    {v:"ricette_casa", l:"👨‍🍳 Ricette fai da te"},
    {v:"locali_romantici", l:"💑 Locali Romantici"},
    {v:"family_restaurant", l:"👨‍👩‍👧 Ristoranti Famiglia"},
    {v:"fine_dining", l:"⭐ Fine Dining"},
    {v:"sagre_eventi", l:"🎪 Sagre & Feste locali"},
    {v:"agriturismo", l:"🌾 Agriturismi"},
  ];

  function renderCompletaForm(screen){
    _avatarFile = null;
    _interessiSel = [];

    screen.innerHTML = '<div style="background:#f0f4f7;min-height:100vh;overflow-y:auto;padding:0 0 40px;">' +
      // Header
      '<div style="background:var(--brand);padding:calc(20px + var(--safe-top)) 20px 24px;text-align:center;color:#fff;">' +
        '<div style="font-size:22px;font-weight:700;margin-bottom:4px;">Benvenuto! 👋</div>' +
        '<div style="font-size:14px;opacity:.8;">Dicci di te per personalizzare la tua esperienza</div>' +
      '</div>' +

      '<div style="padding:20px;">' +

        // Avatar
        '<div style="text-align:center;margin-bottom:20px;">' +
          '<div id="avatar-completa" onclick="cambiaFotoCompleta()" style="width:80px;height:80px;border-radius:50%;background:var(--brand-light);border:2px dashed var(--brand);display:flex;align-items:center;justify-content:center;font-size:32px;cursor:pointer;margin:0 auto 8px;overflow:hidden;">&#128100;</div>' +
          '<div style="font-size:12px;color:var(--brand);font-weight:600;cursor:pointer;" onclick="cambiaFotoCompleta()">Aggiungi foto profilo</div>' +
        '</div>' +

        // Città
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid var(--border);">' +
          '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">📍 Dove abiti?</div>' +
          '<input id="c-citta" class="completa-input" placeholder="Es. Roma, Milano, Napoli..." style="width:100%;box-sizing:border-box;"/>' +
        '</div>' +

        // Data nascita
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid var(--border);">' +
          '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">🎂 Anno di nascita <span style="font-size:11px;color:#94a3b8;font-weight:400">(opzionale)</span></div>' +
          '<input id="c-nascita" type="number" min="1940" max="2008" class="completa-input" placeholder="Es. 1990" style="width:100%;box-sizing:border-box;"/>' +
        '</div>' +

        // Interessi — la parte chiave
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid var(--border);">' +
          '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">❤️ Cosa ti piace mangiare?</div>' +
          '<div style="font-size:12px;color:#64748b;margin-bottom:12px;">Seleziona almeno 3 — useremo questi per mostrarti i locali giusti</div>' +
          '<div id="interessi-grid" style="display:flex;flex-wrap:wrap;gap:8px;">' +
            INTERESSI.map(function(i){
              return '<button type="button" onclick="toggleInteresse(this,\''+i.v+'\')" style="padding:8px 13px;border-radius:999px;border:1.5px solid var(--border);background:#fff;font-size:13px;font-weight:500;color:#374151;cursor:pointer;font-family:var(--font);">'+i.l+'</button>';
            }).join("") +
          '</div>' +
          '<div id="interessi-msg" style="font-size:11px;color:#94a3b8;margin-top:8px;text-align:center;"></div>' +
        '</div>' +

        // CTA
        '<button class="completa-btn" onclick="salvaProfiloCompleto()" style="width:100%;">Inizia a esplorare →</button>' +
        '<button class="skip-btn" onclick="saltaCompleta()">Salta per ora</button>' +

      '</div></div>';
  }

  window.cambiaFotoCompleta = function(){
    var i = document.createElement("input"); i.type="file"; i.accept="image/*";
    i.onchange = function(e){
      var f = e.target.files[0]; if(!f) return;
      _avatarFile = f;
      var av = document.getElementById("avatar-completa");
      av.innerHTML = '<img src="'+URL.createObjectURL(f)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
    };
    i.click();
  };

  window.toggleInteresse = function(btn, nome){
    btn.classList.toggle("sel");
    if(btn.classList.contains("sel")){
      if(!_interessiSel.includes(nome)) _interessiSel.push(nome);
      btn.style.background = "var(--brand-light)";
      btn.style.borderColor = "var(--brand)";
      btn.style.color = "var(--brand)";
    } else {
      _interessiSel = _interessiSel.filter(function(i){return i!==nome;});
      btn.style.background = "#fff";
      btn.style.borderColor = "var(--border)";
      btn.style.color = "#374151";
    }
    var msg = document.getElementById("interessi-msg");
    if(msg){
      if(_interessiSel.length < 3) msg.textContent = "Seleziona ancora "+Math.max(0,3-_interessiSel.length)+" interesse/i";
      else msg.textContent = "✅ "+_interessiSel.length+" interessi selezionati";
    }
  };

  window.salvaProfiloCompleto = async function(){
    if(!window._ME) return;
    var citta = val("c-citta");
    var nascita = val("c-nascita");
    if(!citta){ alert("Inserisci la tua città"); return; }
    if(_interessiSel.length < 1){ alert("Seleziona almeno un interesse"); return; }

    var btn = document.querySelector("#completa-screen .completa-btn");
    if(btn){btn.textContent="Salvataggio...";btn.disabled=true;}

    var avatarUrl = null;
    if(_avatarFile){
      var ext = _avatarFile.name.split(".").pop().toLowerCase();
      var path = "avatar/"+window._ME.id+"."+ext;
      var {error:upErr} = await supa.storage.from("profili").upload(path,_avatarFile,{cacheControl:"3600",upsert:true});
      if(!upErr){ var {data:ud}=supa.storage.from("profili").getPublicUrl(path); avatarUrl=ud.publicUrl; }
    }

    var payload = {
      user_id: window._ME.id,
      citta: citta,
      data_nascita: nascita ? nascita+"-01-01" : null,
      interessi: JSON.stringify(_interessiSel),
    };
    if(avatarUrl) payload.avatar_url = avatarUrl;

    await supa.from("clienti_profilo").upsert(payload, {onConflict:"user_id"});
    if(btn){btn.textContent="Inizia a esplorare →";btn.disabled=false;}
    window.showApp();
  };

  window.saltaCompleta = async function(){
    if(!window._ME) return;
    await supa.from("clienti_profilo").upsert({user_id:window._ME.id, citta:" "},{onConflict:"user_id"});
    window.showApp();
  };

  window.switchTab = function(tab, btn){
    document.querySelectorAll(".auth-tab").forEach(function(t){t.classList.remove("active");});
    btn.classList.add("active");
    document.getElementById("form-login").style.display  = tab==="login"    ? "block" : "none";
    document.getElementById("form-register").style.display = tab==="register" ? "block" : "none";
    var msg = document.getElementById("auth-msg"); msg.style.display="none";
  };

  function showMsg(txt, ok){
    var el = document.getElementById("auth-msg");
    el.textContent = txt;
    el.className = "auth-error " + (ok ? "ok" : "err");
    el.style.display = "block";
  }

  window.doLogin = async function(){
    var email = val("login-email"), pwd = val("login-pwd");
    if(!email||!pwd){showMsg("Inserisci email e password");return;}
    var btn = document.querySelector("#form-login .auth-btn");
    if(btn){btn.textContent="...";btn.disabled=true;}
    var {error} = await supa.auth.signInWithPassword({email, password:pwd});
    if(btn){btn.textContent="Entra →";btn.disabled=false;}
    if(error) showMsg(error.message==="Invalid login credentials"?"Email o password errati":error.message);
  };

  window.doRegister = async function(){
    var nome=val("reg-nome"), email=val("reg-email"), tel=val("reg-tel"), pwd=val("reg-pwd");
    if(!nome||!email||!pwd){showMsg("Compila tutti i campi");return;}
    if(pwd.length<6){showMsg("Password minimo 6 caratteri");return;}
    var btn = document.querySelector("#form-register .auth-btn");
    if(btn){btn.textContent="...";btn.disabled=true;}
    var {data, error} = await supa.auth.signUp({
      email, password:pwd,
      options:{emailRedirectTo:"https://social.ristoflow-ai.com", data:{nome_completo:nome,telefono:tel}}
    });
    if(btn){btn.textContent="Crea account →";btn.disabled=false;}
    if(error){showMsg(error.message);return;}
    if(data.user){
      try{await supa.from("clienti_profilo").upsert(
        {user_id:data.user.id,nome_completo:nome,email,telefono:tel},{onConflict:"user_id"}
      );}catch(e){}
    }
    try{
      await fetch(window.EF_BASE+"/invia-conferma-email",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,nome})
      });
    }catch(e){}
    showConferma(email);
  };

  window.doLogout = async function(){ await supa.auth.signOut(); };

})();
