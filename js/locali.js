// js/locali.js — mappa locali e profilo locale
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderLocali = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';

    // Geolocalizzazione utente
    var userLat=null, userLng=null;
    try{
      var pos=await new Promise(function(res,rej){navigator.geolocation.getCurrentPosition(res,rej,{timeout:4000});});
      userLat=pos.coords.latitude; userLng=pos.coords.longitude;
    }catch(e){}

    var {data:sedi} = await supa.from("sedi")
      .select("id,nome,indirizzo,citta,latitudine,longitudine,logo_url,attiva")
      .eq("attiva",true).order("nome");

    // Calcola distanze
    if(userLat&&sedi){
      sedi.forEach(function(s){
        if(s.latitudine&&s.longitudine){
          var R=6371, dLat=(s.latitudine-userLat)*Math.PI/180, dLng=(s.longitudine-userLng)*Math.PI/180;
          var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(userLat*Math.PI/180)*Math.cos(s.latitudine*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
          s._dist=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        }
      });
      sedi.sort(function(a,b){return (a._dist||999)-(b._dist||999);});
    }

    var wrap=document.createElement("div"); wrap.className="pb-nav";

    // Header con slider raggio (se geoloc disponibile)
    var hdr=document.createElement("div"); hdr.style.cssText="padding:16px 16px 0";
    hdr.innerHTML='<div style="font-size:22px;font-weight:900">📍 Locali Partner</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">'+(userLat?"Ordinati per distanza da te":"Ristoranti su Ristoflow")+'</div>';
    wrap.appendChild(hdr);

    if(userLat){
      var sliderWrap=document.createElement("div"); sliderWrap.style.cssText="padding:14px 16px 0";
      sliderWrap.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:13px;font-weight:700"><span>📡 Raggio</span><span id="raggio-label">10 km</span></div><input type="range" id="raggio-slider" min="1" max="50" value="10" style="width:100%;accent-color:var(--brand)" oninput="filtraRaggio(this.value)"/>';
      wrap.appendChild(sliderWrap);
    }

    var listEl=document.createElement("div"); listEl.id="locali-list"; listEl.style.padding="12px 0";
    wrap.appendChild(listEl);
    c.innerHTML=""; c.appendChild(wrap);

    window._sediAll=sedi||[];
    window._userLat=userLat; window._userLng=userLng;
    renderSedi(sedi||[], listEl);
  };

  window.filtraRaggio=function(km){
    document.getElementById("raggio-label").textContent=km+" km";
    var filtered=(window._sediAll||[]).filter(function(s){return !s._dist||s._dist<=parseFloat(km);});
    renderSedi(filtered, document.getElementById("locali-list"));
  };

  function renderSedi(sedi, el){
    if(!sedi||sedi.length===0){
      el.innerHTML='<div class="empty-state"><div class="empty-icon">📍</div><div class="empty-title">Nessun locale nel raggio</div><div class="empty-sub">Aumenta il raggio di ricerca</div></div>';
      return;
    }
    var h="";
    sedi.forEach(function(s){
      var dest=encodeURIComponent((s.indirizzo||"")+" "+(s.citta||""));
      var mapUrl="https://www.google.com/maps/dir/?api=1&destination="+dest;
      var dist=s._dist?('<span style="background:#e8f4f8;color:#0E5A7A;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700">📡 '+s._dist.toFixed(1)+' km</span>'):"";
      h+='<div class="locale-card">';
      if(s.logo_url) h+='<img src="'+esc(s.logo_url)+'" style="width:100%;height:140px;object-fit:cover"/>';
      else h+='<div class="locale-card-img">🍽️</div>';
      h+='<div class="locale-card-body">';
      h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px"><div class="locale-card-nome">'+esc(s.nome||"")+'</div>'+dist+'</div>';
      if(s.indirizzo) h+='<div class="locale-card-tipo">'+esc(s.indirizzo)+(s.citta?" · "+esc(s.citta):"")+'</div>';
      h+='<div class="locale-card-actions">';
      h+='<a href="'+mapUrl+'" target="_blank" class="locale-action-btn primary">📍 Indicazioni</a>';
      h+='<button class="locale-action-btn" onclick="apriPrenotaLocale(\''+s.id+'\',\''+esc(s.nome||"")+'\')">📅 Prenota</button>';
      h+='<button class="locale-action-btn" onclick="apriProfiloLocale(\''+s.id+'\')">👁 Scopri</button>';
      h+='</div></div></div>';
    });
    el.innerHTML=h;
  }

  window.apriPrenotaLocale=function(sedeId, sedeNome){
    // Carica booking.js e apre direttamente il form
    if(typeof window.renderPrenota==="function"){
      window.navTo("prenota");
      setTimeout(function(){window.apriFormPrenotazione(sedeId,sedeNome);},300);
    } else {
      window.navTo("prenota");
    }
  };

  window.apriProfiloLocale=async function(sedeId){
    var c=document.getElementById("page-content");
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var [{data:sede},{data:profilo},{data:recensioni}]=await Promise.all([
      supa.from("sedi").select("*").eq("id",sedeId).single(),
      supa.from("azienda_profilo_pubblico").select("*").eq("azienda_id",window.AZIENDA).maybeSingle(),
      supa.from("recensioni").select("*,clienti_profilo(nome_completo)").eq("sede_id",sedeId).eq("visibile",true).order("created_at",{ascending:false}).limit(10)
    ]);
    if(!sede){c.innerHTML='<div style="padding:20px">Locale non trovato</div>';return;}
    var avgVoto=recensioni&&recensioni.length>0?(recensioni.reduce(function(s,r){return s+(r.voto||0);},0)/recensioni.length).toFixed(1):"—";
    var h='<div class="pb-nav">';
    h+='<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);border-bottom:1px solid var(--border)"><button onclick="window.navTo(\'locali\')" style="background:none;border:none;font-size:22px;cursor:pointer">←</button><div style="font-size:17px;font-weight:800">'+esc(sede.nome||"")+'</div></div>';
    if(sede.logo_url) h+='<img src="'+esc(sede.logo_url)+'" style="width:100%;max-height:200px;object-fit:cover"/>';
    h+='<div style="padding:16px">';
    h+='<div style="font-size:20px;font-weight:900;margin-bottom:4px">'+esc(sede.nome||"")+'</div>';
    if(sede.indirizzo) h+='<div style="font-size:13px;color:var(--text-2);margin-bottom:12px">📍 '+esc(sede.indirizzo||"")+(sede.citta?" · "+esc(sede.citta):"")+'</div>';
    h+='<div style="display:flex;gap:8px;margin-bottom:16px">';
    h+='<button onclick="apriPrenotaLocale(\''+sedeId+'\',\''+esc(sede.nome||"")+'\')" class="locale-action-btn primary" style="flex:1">📅 Prenota</button>';
    if(sede.latitudine&&sede.longitudine) h+='<a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent((sede.indirizzo||"")+" "+(sede.citta||""))+'" target="_blank" class="locale-action-btn">📍 Mappa</a>';
    h+='</div>';
    h+='<div style="font-size:15px;font-weight:800;margin-bottom:10px">⭐ Recensioni ('+avgVoto+')</div>';
    if(!recensioni||recensioni.length===0){
      h+='<div style="color:var(--text-3);font-size:13px;padding:12px 0">Ancora nessuna recensione.</div>';
    } else {
      recensioni.forEach(function(r){
        var nome=(r.clienti_profilo&&r.clienti_profilo.nome_completo)||"Utente";
        var stelle="";for(var i=0;i<5;i++)stelle+=i<(r.voto||0)?"⭐":"☆";
        h+='<div style="border-bottom:1px solid var(--border);padding:12px 0"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong style="font-size:13px">'+esc(nome)+'</strong><span style="font-size:12px">'+stelle+'</span></div>';
        if(r.testo) h+='<div style="font-size:13px;color:var(--text-2);line-height:1.5">'+esc(r.testo)+'</div>';
        if(r.verificata) h+='<div style="font-size:11px;color:#16a34a;margin-top:4px;font-weight:700">✓ Verificata</div>';
        h+='</div>';
      });
    }
    h+='</div></div>';
    c.innerHTML=h;
  };

  window.toggleSegui = async function(targetUserId, btn){
    if(!window._ME){window.showAuth();return;}
    var {data:exists}=await supa.from("social_follower").select("id").eq("follower_id",window._ME.id).eq("following_id",targetUserId).maybeSingle();
    if(exists){
      await supa.from("social_follower").delete().eq("follower_id",window._ME.id).eq("following_id",targetUserId);
      if(btn){btn.textContent="Segui";btn.style.background="#fff";btn.style.color="var(--brand)";}
    } else {
      await supa.from("social_follower").insert({follower_id:window._ME.id,following_id:targetUserId});
      if(btn){btn.textContent="Stai seguendo";btn.style.background="var(--brand)";btn.style.color="#fff";}
    }
  };

})();
