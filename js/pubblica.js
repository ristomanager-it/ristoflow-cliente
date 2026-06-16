// js/pubblica.js — modal pubblica post
(function(){
  var supa = window._supa;
  var _tipoSel=null, _votoSel=0, _uploadFile=null;

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function val(id){var e=document.getElementById(id);return e?e.value.trim():"";}

  window.apriPubblica = function(tipoDefault){
    if(!window._ME){window.showAuth();return;}
    _tipoSel=null; _votoSel=0; _uploadFile=null;
    document.getElementById("step-tipo").style.display="block";
    var sf=document.getElementById("step-form");
    sf.classList.add("hidden"); sf.innerHTML="";
    document.querySelectorAll(".tipo-btn").forEach(function(b){b.classList.remove("selected");});
    document.getElementById("modal-pubblica").classList.add("open");
    if(tipoDefault==="storia"){chiudiModale();setTimeout(window.apriEditorStoria,100);return;}
    if(tipoDefault) window.scegliTipo(tipoDefault);
  };

  window.chiudiSeFuori = function(e){
    if(e.target===document.getElementById("modal-pubblica")) chiudiModale();
  };

  function chiudiModale(){
    document.getElementById("modal-pubblica").classList.remove("open");
  }

  window.scegliTipo = function(tipo){
    _tipoSel=tipo;
    document.getElementById("step-tipo").style.display="none";
    var sf=document.getElementById("step-form");
    sf.classList.remove("hidden"); sf.style.display="block";
    sf.innerHTML = buildForm(tipo);
  };

  function buildForm(tipo){
    var h='<button class="back-btn" onclick="document.getElementById(\'step-tipo\').style.display=\'block\';document.getElementById(\'step-form\').style.display=\'none\'">← Cambia tipo</button>';
    if(tipo==="esperienza"){
      h+='<div class="upload-zone" onclick="apriUpload()"><div style="font-size:36px">📷</div><div style="font-size:13px;font-weight:700;color:var(--brand)">Aggiungi foto o video</div></div>';
      h+='<div id="preview-wrap"></div>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Racconta la tua esperienza..."></textarea>';
      h+='<input class="pub-input" id="pub-luogo" placeholder="📍 Posizione (opzionale)"/>';
      h+='<button class="pub-btn" onclick="pubblica(\'esperienza\')">Pubblica</button>';
    } else if(tipo==="ricetta"){
      h+='<input class="pub-input" id="pub-titolo" placeholder="Nome della ricetta"/>';
      h+='<textarea class="pub-textarea" id="pub-ingredienti" placeholder="Ingredienti (uno per riga)" style="min-height:80px"></textarea>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Procedimento..."></textarea>';
      h+='<div class="upload-zone" onclick="apriUpload()"><div style="font-size:28px">📷</div><div style="font-size:13px;font-weight:700;color:var(--brand);margin-top:4px">Foto del piatto</div></div>';
      h+='<div id="preview-wrap"></div><button class="pub-btn" onclick="pubblica(\'ricetta\')">Pubblica ricetta</button>';
    } else if(tipo==="recensione"){
      h+='<div style="font-size:14px;font-weight:700;margin-bottom:10px">Il tuo voto</div>';
      h+='<div class="stella-sel" id="stella-sel">';
      for(var i=1;i<=5;i++) h+='<span data-v="'+i+'" onclick="setVoto('+i+')">⭐</span>';
      h+='</div>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Racconta la tua esperienza..."></textarea>';
      h+='<div style="font-size:12px;color:var(--text-3);margin-bottom:12px">✓ Verificata tramite visita registrata</div>';
      h+='<button class="pub-btn" onclick="pubblica(\'recensione\')">Pubblica recensione</button>';
    } else if(tipo==="lavoro"){
      h+='<input class="pub-input" id="pub-titolo" placeholder="Posizione (es. Chef, Cameriere...)"/>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Descrizione, requisiti, orari..."></textarea>';
      h+='<input class="pub-input" id="pub-luogo" placeholder="Città / Zona"/>';
      h+='<button class="pub-btn" onclick="pubblica(\'lavoro\')">Pubblica offerta</button>';
    } else if(tipo==="cerco-lavoro"){
      h+='<input class="pub-input" id="pub-titolo" placeholder="Il tuo ruolo (es. Pizzaiolo, Barista...)"/>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Presentati: esperienza, disponibilità..."></textarea>';
      h+='<input class="pub-input" id="pub-luogo" placeholder="Città / Zona"/>';
      h+='<button class="pub-btn" onclick="pubblica(\'cerco-lavoro\')">Pubblica candidatura</button>';
    } else if(tipo==="offerta"){
      h+='<input class="pub-input" id="pub-titolo" placeholder="Titolo offerta (es. -20% su tutti i secondi)"/>';
      h+='<textarea class="pub-textarea" id="pub-testo" placeholder="Descrivi l\'offerta: validità, condizioni..."></textarea>';
      h+='<div class="upload-zone" onclick="apriUpload()"><div style="font-size:28px">📷</div><div style="font-size:13px;font-weight:700;color:var(--brand);margin-top:4px">Aggiungi foto</div></div>';
      h+='<div id="preview-wrap"></div><button class="pub-btn" onclick="pubblica(\'offerta\')">Pubblica offerta</button>';
    }
    return h;
  }

  window.setVoto = function(v){
    _votoSel=v;
    document.querySelectorAll(".stella-sel span").forEach(function(s,i){s.classList.toggle("on",i<v);});
  };

  window.apriUpload = function(){
    var i=document.createElement("input"); i.type="file"; i.accept="image/*,video/*";
    i.onchange=function(e){
      var f=e.target.files[0]; if(!f) return;
      _uploadFile=f;
      var pw=document.getElementById("preview-wrap");
      if(pw&&f.type.startsWith("image/")){
        pw.innerHTML='<img src="'+URL.createObjectURL(f)+'" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block;margin-bottom:10px"/>';
      }
    };
    i.click();
  };

  window.pubblica = async function(tipo){
    var ME = window._ME; if(!ME) return;
    var testo=val("pub-testo"), titolo=val("pub-titolo")||"", luogo=val("pub-luogo")||"";
    var catMap={esperienza:"esperienze",storia:"esperienze",ricetta:"ricette",recensione:"recensioni",offerta:"offerte",lavoro:"lavoro","cerco-lavoro":"lavoro"};
    var puntiMap={esperienza:30,storia:50,ricetta:80,recensione:100,offerta:0,lavoro:0,"cerco-lavoro":0};
    var testoCompleto = titolo?(titolo+(testo?"\n\n"+testo:"")):(testo);
    if(luogo) testoCompleto+="\n\nZona: "+luogo;
    if(!testoCompleto&&!_uploadFile){alert("Scrivi qualcosa o aggiungi una foto!");return;}

    var mediaUrl=null;
    if(_uploadFile){
      var ext=_uploadFile.name.split(".").pop().toLowerCase();
      var path="posts/"+ME.id+"-"+Date.now()+"."+ext;
      var{error:upErr}=await supa.storage.from("social-media").upload(path,_uploadFile,{cacheControl:"3600",upsert:false});
      if(upErr){alert("Errore upload: "+upErr.message);return;}
      mediaUrl=supa.storage.from("social-media").getPublicUrl(path).data.publicUrl;
      _uploadFile=null;
    }

    // Usa Edge Function per la logica critica (punti, validazione)
    var token=(await supa.auth.getSession()).data.session?.access_token;
    var res=await fetch(window.EF_BASE+"/social-pubblica",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({
        tipo, categoria:catMap[tipo]||"esperienze",
        testo:testoCompleto||" ", media_url:mediaUrl,
        voto:tipo==="recensione"&&_votoSel?_votoSel:null,
        azienda_id:window.AZIENDA,
        scade_at:tipo==="storia"?new Date(Date.now()+86400000).toISOString():null
      })
    });

    if(!res.ok){var err=await res.json();alert("Errore: "+(err.error||"sconosciuto"));return;}

    chiudiModale();
    if(tipo==="storia"){
      setTimeout(function(){alert("Storia pubblicata! Visibile per 24 ore ⏰");},300);
    } else {
      window.navTo("scopri");
      var punti=puntiMap[tipo]||0;
      if(punti>0) setTimeout(function(){alert("Pubblicato! +"+punti+" punti 🎉");},300);
    }
  };

})();
