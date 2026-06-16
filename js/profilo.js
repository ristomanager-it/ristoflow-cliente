// js/profilo.js — profilo utente
(function(){
  var supa=window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function val(id){var e=document.getElementById(id);return e?e.value.trim():"";}

  window.renderProfilo = async function(c){
    if(!window._ME){window.showAuth();return;}
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var ME=window._ME, meta=ME.user_metadata||{};
    var nome=meta.nome_completo||ME.email||"Cliente";
    var {data:profilo}=await supa.from("clienti_profilo").select("*").eq("user_id",ME.id).maybeSingle();
    var punti=(profilo&&profilo.punti_totali)||0;
    var puntiS=(profilo&&profilo.punti_social)||0;
    var tot=punti+puntiS;
    var visite=(profilo&&profilo.visite_totali)||0;
    var views=(profilo&&profilo.views_totali)||0;
    var post=(profilo&&profilo.storie_pubblicate)||0;
    var avatarUrl=(profilo&&profilo.avatar_url)||"";
    var bio=(profilo&&profilo.bio)||"";
    var livello="Bronzo",nextLiv=2000,nextNome="Argento";
    if(tot>=10000){livello="Platinum";nextLiv=20000;nextNome="Diamond";}
    else if(tot>=5000){livello="Oro";nextLiv=10000;nextNome="Platinum";}
    else if(tot>=2000){livello="Argento";nextLiv=5000;nextNome="Oro";}
    var livIco={"Bronzo":"🥉","Argento":"🥈","Oro":"🥇","Platinum":"💎"}[livello]||"";
    var pct=Math.min(100,Math.round((tot/nextLiv)*100));

    var h='<div class="pb-nav"><div class="profilo-hero">';
    h+='<div class="profilo-av" onclick="cambiafotoProfilo()">'+(avatarUrl?'<img src="'+esc(avatarUrl)+'"/>':esc(nome.charAt(0).toUpperCase()))+'</div>';
    h+='<div class="profilo-nome-el">'+esc(nome)+'</div>';
    if(bio) h+='<div class="profilo-bio-el">'+esc(bio)+'</div>';
    h+='<div class="profilo-email-el">'+esc(ME.email||"")+'</div>';
    h+='<div class="profilo-livello-badge">'+livIco+' '+livello+'</div>';
    h+='<button onclick="apriModificaProfilo()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,.2);border:none;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;color:#fff;cursor:pointer">✏️ Modifica</button>';
    h+='</div>';
    h+='<div class="profilo-stats">';
    h+='<div class="p-stat"><div class="p-stat-val">'+tot+'</div><div class="p-stat-label">Punti</div></div>';
    h+='<div class="p-stat"><div class="p-stat-val">'+visite+'</div><div class="p-stat-label">Visite</div></div>';
    h+='<div class="p-stat"><div class="p-stat-val">'+views+'</div><div class="p-stat-label">Views</div></div>';
    h+='<div class="p-stat"><div class="p-stat-val">'+post+'</div><div class="p-stat-label">Post</div></div>';
    h+='</div>';
    h+='<div class="punti-bar-wrap"><div class="punti-bar-labels"><span>'+livIco+' '+livello+'</span><span>'+tot+' / '+nextLiv+' pt</span></div>';
    h+='<div class="punti-bar-track"><div class="punti-bar-fill" style="width:'+pct+'%"></div></div>';
    h+='<div class="punti-next-label">Ancora '+Math.max(0,nextLiv-tot)+' punti per '+nextNome+'</div></div>';
    h+='<div class="profilo-menu">';
    h+='<div class="menu-group-title">Il mio account</div>';
    h+='<div class="menu-row" onclick="navTo(\'tessera\')"><div class="menu-row-icon">🎟️</div><div class="menu-row-text">Tessera fidelity</div><div class="menu-row-arrow">›</div></div>';
    h+='<div class="menu-row" onclick="navTo(\'messaggi\')"><div class="menu-row-icon">💬</div><div class="menu-row-text">Messaggi</div><div class="menu-row-arrow">›</div></div>';
    h+='<div class="menu-group-title" style="margin-top:8px">Supporto</div>';
    h+='<div class="menu-row"><div class="menu-row-icon">💬</div><div class="menu-row-text">Contattaci su WhatsApp</div><div class="menu-row-arrow">›</div></div>';
    h+='<div class="menu-row"><div class="menu-row-icon">🔒</div><div class="menu-row-text">Privacy e dati</div><div class="menu-row-arrow">›</div></div>';
    h+='</div>';
    h+='<button class="logout-btn" onclick="doLogout()">Esci dall\'account</button></div>';
    c.innerHTML=h;
  };

  window.apriModificaProfilo = async function(){
    if(!window._ME) return;
    var {data:profilo}=await supa.from("clienti_profilo").select("*").eq("user_id",window._ME.id).maybeSingle();
    var nomeC=(profilo&&profilo.nome_completo)||(window._ME.user_metadata&&window._ME.user_metadata.nome_completo)||"";
    var bio=(profilo&&profilo.bio)||"";
    var citta=(profilo&&profilo.citta)||"";
    var tel=(profilo&&profilo.telefono)||(window._ME.user_metadata&&window._ME.user_metadata.telefono)||"";
    var ruolo=(profilo&&profilo.tipo_utente)||"cliente";
    var sheet=document.getElementById("modal-sheet");
    document.getElementById("modal-pubblica").classList.add("open");
    sheet.innerHTML='<div class="modal-handle"></div><div class="modal-title">✏️ Modifica profilo</div>'+
      '<input class="pub-input" id="edit-nome" placeholder="Nome completo" value="'+esc(nomeC)+'"/>'+
      '<input class="pub-input" id="edit-bio" placeholder="Bio / Ruolo" value="'+esc(bio)+'"/>'+
      '<input class="pub-input" id="edit-citta" placeholder="Città" value="'+esc(citta)+'"/>'+
      '<input class="pub-input" id="edit-tel" placeholder="Telefono WhatsApp" value="'+esc(tel)+'" type="tel"/>'+
      '<select class="pub-input" id="edit-ruolo">'+
      '<option value="cliente"'+(ruolo==="cliente"?" selected":"")+'>Cliente</option>'+
      '<option value="chef"'+(ruolo==="chef"?" selected":"")+'>Chef / Cuoco</option>'+
      '<option value="titolare"'+(ruolo==="titolare"?" selected":"")+'>Titolare locale</option>'+
      '<option value="fornitore"'+(ruolo==="fornitore"?" selected":"")+'>Fornitore</option>'+
      '</select>'+
      '<button class="pub-btn" onclick="salvaProfilo()">Salva profilo</button>';
  };

  window.salvaProfilo = async function(){
    var nome=val("edit-nome"),bio=val("edit-bio"),citta=val("edit-citta"),tel=val("edit-tel");
    var ruolo=document.getElementById("edit-ruolo")?.value||"cliente";
    if(!nome){alert("Inserisci il tuo nome");return;}
    var btn=document.querySelector("#modal-sheet .pub-btn");
    if(btn){btn.textContent="Salvataggio...";btn.disabled=true;}
    await supa.from("clienti_profilo").upsert({user_id:window._ME.id,nome_completo:nome,bio,citta:citta||" ",telefono:tel,tipo_utente:ruolo,email:window._ME.email},{onConflict:"user_id"});
    await supa.auth.updateUser({data:{nome_completo:nome,telefono:tel}});
    if(btn){btn.textContent="Salva profilo";btn.disabled=false;}
    document.getElementById("modal-pubblica").classList.remove("open");
    window.navTo("profilo");
  };

  window.cambiafotoProfilo = function(){
    var i=document.createElement("input");i.type="file";i.accept="image/*";
    i.onchange=async function(e){
      var f=e.target.files[0];if(!f)return;
      var ext=f.name.split(".").pop().toLowerCase();
      var path="avatar/"+window._ME.id+"."+ext;
      var{error:upErr}=await supa.storage.from("profili").upload(path,f,{cacheControl:"3600",upsert:true});
      if(upErr){alert("Errore: "+upErr.message);return;}
      var{data:ud}=supa.storage.from("profili").getPublicUrl(path);
      await supa.from("clienti_profilo").upsert({user_id:window._ME.id,avatar_url:ud.publicUrl},{onConflict:"user_id"});
      window.navTo("profilo");
    };
    i.click();
  };
})();
