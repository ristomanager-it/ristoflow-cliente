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
    document.getElementById("completa-screen").classList.add("active");
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
    // Invia email conferma via Edge Function
    try{
      await fetch(window.EF_BASE+"/invia-conferma-email",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,nome})
      });
    }catch(e){}
    showConferma(email);
  };

  window.doLogout = async function(){ await supa.auth.signOut(); };

  // COMPLETA PROFILO
  var _avatarFileCompleta = null;
  var _interessiSel = [];

  window.cambiaFotoCompleta = function(){
    var i = document.createElement("input"); i.type="file"; i.accept="image/*";
    i.onchange = function(e){
      var f = e.target.files[0]; if(!f) return;
      _avatarFileCompleta = f;
      var av = document.getElementById("avatar-completa");
      av.innerHTML = '<img src="'+URL.createObjectURL(f)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
    };
    i.click();
  };

  window.toggleInteresse = function(btn, nome){
    btn.classList.toggle("sel");
    if(btn.classList.contains("sel")){
      if(!_interessiSel.includes(nome)) _interessiSel.push(nome);
    } else {
      _interessiSel = _interessiSel.filter(function(i){return i!==nome;});
    }
  };

  window.salvaProfiloCompleto = async function(){
    if(!window._ME) return;
    var citta=val("c-citta"), nascita=val("c-nascita"), lavoro=val("c-lavoro");
    var btn = document.querySelector("#completa-screen .completa-btn");
    if(btn){btn.textContent="Salvataggio...";btn.disabled=true;}
    var avatarUrl = null;
    if(_avatarFileCompleta){
      var ext = _avatarFileCompleta.name.split(".").pop().toLowerCase();
      var path = "avatar/"+window._ME.id+"."+ext;
      var {error:upErr} = await supa.storage.from("profili").upload(path,_avatarFileCompleta,{cacheControl:"3600",upsert:true});
      if(!upErr){ var {data:ud}=supa.storage.from("profili").getPublicUrl(path); avatarUrl=ud.publicUrl; }
    }
    var payload = {user_id:window._ME.id, citta:citta||" ", data_nascita:nascita||null, bio:lavoro||null,
                   interessi:_interessiSel.length?JSON.stringify(_interessiSel):null};
    if(avatarUrl) payload.avatar_url = avatarUrl;
    await supa.from("clienti_profilo").upsert(payload, {onConflict:"user_id"});
    if(btn){btn.textContent="Entra nel social →";btn.disabled=false;}
    window.showApp();
  };

  window.saltaCompleta = async function(){
    if(!window._ME) return;
    await supa.from("clienti_profilo").upsert({user_id:window._ME.id, citta:" "},{onConflict:"user_id"});
    window.showApp();
  };

})();
