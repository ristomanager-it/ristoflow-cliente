// js/locali.js — scopri locali, scheda locale, recensioni
(function(){
  var supa = window._supa;
  var _sediAll = [], _userLat = null, _userLng = null;

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function fmt(n){return parseFloat(n||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});}

  function calcolaDistanza(lat1,lng1,lat2,lng2){
    var R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function stelleHTML(v,size){
    size=size||16;
    var h="";
    for(var i=1;i<=5;i++){
      h+='<span style="color:'+(i<=Math.round(v)?"#f59e0b":"#d1d5db")+';font-size:'+size+'px">★</span>';
    }
    return h;
  }

  // ── RENDER PRINCIPALE ─────────────────────────────────────────────────────────
  window.renderLocali = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';

    // Geolocalizzazione
    _userLat=null; _userLng=null;
    try{
      var pos=await new Promise(function(res,rej){navigator.geolocation.getCurrentPosition(res,rej,{timeout:4000});});
      _userLat=pos.coords.latitude; _userLng=pos.coords.longitude;
    }catch(e){}

    // Carica sedi + rating medio recensioni
    var{data:sedi}=await supa.from("sedi")
      .select("id,nome,indirizzo,citta,latitudine,longitudine,logo_url,azienda_id,aziende(id,nome,logo_url,tipo_locale)")
      .eq("attiva",true).order("nome");

    // Rating medio per sede
    var{data:ratings}=await supa.from("recensioni")
      .select("sede_id,voto").eq("visibile",true);
    var ratingMap={};
    (ratings||[]).forEach(function(r){
      if(!ratingMap[r.sede_id]) ratingMap[r.sede_id]={sum:0,count:0};
      ratingMap[r.sede_id].sum+=r.voto||0;
      ratingMap[r.sede_id].count++;
    });

    // Calcola distanze e ordina
    (sedi||[]).forEach(function(s){
      s._rating=ratingMap[s.id]?ratingMap[s.id].sum/ratingMap[s.id].count:0;
      s._recCount=ratingMap[s.id]?ratingMap[s.id].count:0;
      if(_userLat&&s.latitudine&&s.longitudine){
        s._dist=calcolaDistanza(_userLat,_userLng,parseFloat(s.latitudine),parseFloat(s.longitudine));
      }
    });

    _sediAll=sedi||[];
    var sediOrdinate=_sediAll.slice().sort(function(a,b){return (a._dist||999)-(b._dist||999);});

    // Layout
    c.innerHTML='';
    var wrap=document.createElement("div"); wrap.className="pb-nav";

    // Search bar
    var searchWrap=document.createElement("div");
    searchWrap.style.cssText="padding:12px 16px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10";
    searchWrap.innerHTML='<div style="display:flex;align-items:center;gap:10px;background:var(--bg);border-radius:12px;padding:10px 14px;border:1.5px solid var(--border)">'+
      '<span style="font-size:18px">🔍</span>'+
      '<input id="locali-search" placeholder="Cerca locale o città..." style="border:none;background:transparent;font-size:14px;font-family:inherit;outline:none;flex:1;color:var(--text)"/>'+
      '</div>';
    wrap.appendChild(searchWrap);

    // Filtri rapidi
    var filtriWrap=document.createElement("div");
    filtriWrap.style.cssText="padding:10px 0;background:var(--surface);border-bottom:1px solid var(--border)";
    filtriWrap.innerHTML='<div style="display:flex;gap:8px;padding:0 12px;overflow-x:auto;scrollbar-width:none">'+
      ['Tutti','Vicino a me','Meglio recensiti','Aperto ora'].map(function(f,i){
        return '<button class="filtro-btn'+(i===0?" active":"")+'" onclick="filtraLocali(\''+f+'\')" data-filtro="'+f+'">'+f+'</button>';
      }).join("")+
      '</div>';
    wrap.appendChild(filtriWrap);

    // Lista locali
    var listWrap=document.createElement("div"); listWrap.id="locali-list"; listWrap.style.padding="8px 0";
    wrap.appendChild(listWrap);
    c.appendChild(wrap);

    renderListaLocali(sediOrdinate, listWrap);

    // Search live
    document.getElementById("locali-search").addEventListener("input",function(){
      var q=this.value.toLowerCase().trim();
      var filtered=q?_sediAll.filter(function(s){
        return (s.nome||"").toLowerCase().includes(q)||(s.citta||"").toLowerCase().includes(q)||(s.indirizzo||"").toLowerCase().includes(q)||(s.aziende&&s.aziende.nome||"").toLowerCase().includes(q);
      }):sediOrdinate;
      renderListaLocali(filtered,listWrap);
    });
  };

  window.filtraLocali=function(filtro){
    document.querySelectorAll(".filtri-strip .filtro-btn, [data-filtro]").forEach(function(b){
      b.classList.toggle("active",b.dataset.filtro===filtro);
    });
    var filtered=_sediAll.slice();
    if(filtro==="Vicino a me") filtered.sort(function(a,b){return (a._dist||999)-(b._dist||999);});
    else if(filtro==="Meglio recensiti") filtered.sort(function(a,b){return (b._rating||0)-(a._rating||0);});
    else filtered.sort(function(a,b){return (a._dist||999)-(b._dist||999);});
    renderListaLocali(filtered,document.getElementById("locali-list"));
  };

  function renderListaLocali(sedi, el){
    if(!sedi||sedi.length===0){
      el.innerHTML='<div class="empty-state"><div class="empty-icon">📍</div><div class="empty-title">Nessun locale trovato</div><div class="empty-sub">Prova a cercare con un termine diverso</div></div>';
      return;
    }
    var h="";
    sedi.forEach(function(s){
      var az=s.aziende||{};
      var cover=s.logo_url||az.logo_url||"";
      var distLabel=s._dist?('<span style="background:#e8f4f8;color:#0E5A7A;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700">📡 '+s._dist.toFixed(1)+' km</span>'):"";
      var ratingLabel=s._rating>0?(stelleHTML(s._rating,13)+'<span style="font-size:12px;font-weight:700;color:#374151;margin-left:4px">'+s._rating.toFixed(1)+'</span><span style="font-size:11px;color:#94a3b8;margin-left:3px">('+s._recCount+')</span>'):'<span style="font-size:12px;color:#94a3b8">Nessuna recensione</span>';

      h+='<div onclick="apriSchedaLocale(\''+s.id+'\')" style="background:var(--surface);border-radius:16px;margin:0 12px 12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);cursor:pointer">';
      // Cover
      if(cover){
        h+='<img src="'+esc(cover)+'" style="width:100%;height:160px;object-fit:cover"/>';
      } else {
        var gradients=["linear-gradient(135deg,#0E5A7A,#00c896)","linear-gradient(135deg,#7c3aed,#0E5A7A)","linear-gradient(135deg,#f97316,#dc2626)","linear-gradient(135deg,#059669,#0E5A7A)"];
        var grad=gradients[Math.abs(s.id.charCodeAt(0)||0)%gradients.length];
        h+='<div style="width:100%;height:160px;background:'+grad+';display:flex;align-items:center;justify-content:center;font-size:48px">🍽️</div>';
      }
      // Body
      h+='<div style="padding:14px 16px">';
      h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">';
      h+='<div style="font-size:17px;font-weight:800;color:var(--text);flex:1">'+esc(s.nome||az.nome||"")+'</div>';
      h+=distLabel;
      h+='</div>';
      if(az.tipo_locale) h+='<div style="font-size:12px;color:var(--brand);font-weight:600;margin-bottom:4px">'+esc(az.tipo_locale)+'</div>';
      if(s.indirizzo||s.citta) h+='<div style="font-size:12px;color:var(--text-2);margin-bottom:8px">📍 '+esc((s.indirizzo||"")+(s.citta?" · "+s.citta:""))+'</div>';
      h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">'+ratingLabel+'</div>';
      h+='<div style="display:flex;gap:8px">';
      h+='<button onclick="event.stopPropagation();apriSchedaLocale(\''+s.id+'\')" style="flex:1;padding:10px;background:var(--brand);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">📋 Scheda</button>';
      h+='<button onclick="event.stopPropagation();apriFormPrenotazione(\''+s.id+'\',\''+esc(s.nome||"")+'\',\''+esc(s.azienda_id||"")+'\')" style="flex:1;padding:10px;background:#fff;color:var(--brand);border:1.5px solid var(--brand);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">📅 Prenota</button>';
      h+='</div>';
      h+='</div></div>';
    });
    el.innerHTML=h;
  }

  // ── SCHEDA LOCALE ─────────────────────────────────────────────────────────────
  window.apriSchedaLocale = async function(sedeId){
    var c=document.getElementById("page-content");
    c.innerHTML='<div class="page-loader full"><div class="spinner"></div></div>';

    var[{data:sede},{data:recensioni},{data:postSede},{data:profilo}]=await Promise.all([
      supa.from("sedi").select("*,aziende(id,nome,logo_url,tipo_locale,descrizione,sito_web,telefono)").eq("id",sedeId).single(),
      supa.from("recensioni").select("id,voto,testo,created_at,verificata,user_id,clienti_profilo(nome_completo,avatar_url)").eq("sede_id",sedeId).eq("visibile",true).order("created_at",{ascending:false}).limit(20),
      supa.from("social_post").select("id,media_url,testo,created_at").eq("sede_id",sedeId).eq("visibile",true).neq("tipo","storia").order("created_at",{ascending:false}).limit(9),
      supa.from("azienda_profilo_pubblico").select("*").eq("azienda_id",sede?.azienda_id||"").maybeSingle()
    ]);

    if(!sede){c.innerHTML='<div style="padding:20px">Locale non trovato</div>';return;}

    var az=sede.aziende||{};
    var cover=sede.logo_url||az.logo_url||"";
    var avgVoto=recensioni&&recensioni.length>0?(recensioni.reduce(function(s,r){return s+(r.voto||0);},0)/recensioni.length):0;
    var recCount=recensioni?recensioni.length:0;

    // Controlla se utente ha prenotazione completata (sblocca recensione)
    var puoRecensire=false;
    if(window._ME){
      var{data:prenCompleta}=await supa.from("prenotazioni_tavoli")
        .select("id").eq("sede_id",sedeId).eq("rfbook_user_id",window._ME.id).eq("stato","completata").limit(1);
      puoRecensire=prenCompleta&&prenCompleta.length>0;
      // Controlla se ha già recensito
      if(puoRecensire){
        var{data:miaRec}=await supa.from("recensioni").select("id").eq("sede_id",sedeId).eq("user_id",window._ME.id).limit(1);
        if(miaRec&&miaRec.length>0) puoRecensire=false;
      }
    }

    var h='<div class="pb-nav">';

    // Top bar
    h+='<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10">';
    h+='<button onclick="window.navTo(\'locali\')" style="background:none;border:none;font-size:24px;cursor:pointer;padding:0;line-height:1">←</button>';
    h+='<div style="font-size:16px;font-weight:800;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(sede.nome||"")+'</div>';
    h+='</div>';

    // Cover
    if(cover){
      h+='<img src="'+esc(cover)+'" style="width:100%;height:220px;object-fit:cover"/>';
    } else {
      h+='<div style="width:100%;height:220px;background:linear-gradient(135deg,#0E5A7A,#00c896);display:flex;align-items:center;justify-content:center;font-size:64px">🍽️</div>';
    }

    // Info principale
    h+='<div style="padding:16px;background:var(--surface);border-bottom:1px solid var(--border)">';
    h+='<div style="font-size:22px;font-weight:900;margin-bottom:4px">'+esc(sede.nome||"")+'</div>';
    if(az.tipo_locale) h+='<div style="font-size:13px;color:var(--brand);font-weight:700;margin-bottom:6px">'+esc(az.tipo_locale)+'</div>';
    // Rating
    if(avgVoto>0){
      h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">';
      h+=stelleHTML(avgVoto,18);
      h+='<span style="font-size:16px;font-weight:800;color:#374151">'+avgVoto.toFixed(1)+'</span>';
      h+='<span style="font-size:13px;color:#94a3b8">('+recCount+' recensioni)</span>';
      h+='</div>';
    } else {
      h+='<div style="font-size:13px;color:#94a3b8;margin-bottom:8px">Nessuna recensione ancora</div>';
    }
    if(sede.indirizzo||sede.citta) h+='<div style="font-size:13px;color:var(--text-2);margin-bottom:12px">📍 '+esc((sede.indirizzo||"")+(sede.citta?" · "+sede.citta:""))+'</div>';

    // Azioni principali
    h+='<div style="display:flex;gap:8px;margin-bottom:4px">';
    h+='<button onclick="apriFormPrenotazione(\''+sedeId+'\',\''+esc(sede.nome||"")+'\',\''+esc(sede.azienda_id||"")+'\')" style="flex:2;padding:13px;background:var(--brand);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">📅 Prenota ora</button>';
    if(sede.latitudine&&sede.longitudine){
      h+='<a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent((sede.indirizzo||"")+" "+(sede.citta||""))+'" target="_blank" style="flex:1;padding:13px;background:var(--bg);color:var(--text);border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">🗺️</a>';
    }
    if(az.telefono){
      h+='<a href="tel:'+esc(az.telefono)+'" style="flex:1;padding:13px;background:var(--bg);color:var(--text);border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">📞</a>';
    }
    h+='</div>';
    h+='</div>';

    // Descrizione
    if(az.descrizione||profilo?.descrizione){
      var desc=az.descrizione||profilo?.descrizione||"";
      h+='<div style="padding:16px;background:var(--surface);border-bottom:1px solid var(--border)">';
      h+='<div style="font-size:14px;font-weight:800;margin-bottom:8px">ℹ️ Il locale</div>';
      h+='<div style="font-size:14px;color:var(--text-2);line-height:1.6">'+esc(desc)+'</div>';
      h+='</div>';
    }

    // RECENSIONI
    h+='<div style="background:var(--surface);border-bottom:1px solid var(--border)">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px">';
    h+='<div style="font-size:16px;font-weight:800">⭐ Recensioni ('+recCount+')</div>';
    if(puoRecensire){
      h+='<button onclick="apriModalRecensione(\''+sedeId+'\',\''+esc(sede.nome||"")+'\')" style="background:var(--brand);color:#fff;border:none;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer">✏️ Scrivi</button>';
    }
    h+='</div>';

    if(!puoRecensire&&window._ME){
      h+='<div style="margin:0 16px 12px;background:#fef3c7;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400e;font-weight:600">⚠️ Puoi recensire dopo una visita verificata</div>';
    }

    if(!recensioni||recensioni.length===0){
      h+='<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">Nessuna recensione ancora. Sii il primo!</div>';
    } else {
      recensioni.forEach(function(r){
        var nome=(r.clienti_profilo&&r.clienti_profilo.nome_completo)||"Utente";
        var av=r.clienti_profilo?.avatar_url;
        h+='<div style="padding:12px 16px;border-top:1px solid var(--border)">';
        h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
        h+='<div style="width:36px;height:36px;border-radius:50%;background:var(--brand-light);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:var(--brand);overflow:hidden;flex-shrink:0">';
        h+=av?'<img src="'+esc(av)+'" style="width:100%;height:100%;object-fit:cover"/>':esc(nome.charAt(0).toUpperCase());
        h+='</div>';
        h+='<div style="flex:1"><div style="font-size:14px;font-weight:700">'+esc(nome)+'</div>';
        h+='<div style="display:flex;align-items:center;gap:6px">'+stelleHTML(r.voto,13);
        if(r.verificata) h+='<span style="font-size:10px;background:#dcfce7;color:#16a34a;border-radius:999px;padding:1px 7px;font-weight:700">✓ Verificata</span>';
        h+='</div></div>';
        h+='<div style="font-size:11px;color:#94a3b8">'+new Date(r.created_at).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"})+'</div>';
        h+='</div>';
        if(r.testo) h+='<div style="font-size:14px;color:var(--text-2);line-height:1.55">'+esc(r.testo)+'</div>';
        h+='</div>';
      });
    }
    h+='</div>';

    // FOTO COMMUNITY
    if(postSede&&postSede.length>0){
      h+='<div style="padding:16px;background:var(--surface)">';
      h+='<div style="font-size:16px;font-weight:800;margin-bottom:12px">📸 Foto della community</div>';
      h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">';
      postSede.forEach(function(p){
        if(p.media_url){
          h+='<img src="'+esc(p.media_url)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px"/>';
        }
      });
      h+='</div></div>';
    }

    h+='</div>';
    c.innerHTML=h;
  };

  // ── MODAL RECENSIONE ──────────────────────────────────────────────────────────
  window.apriModalRecensione = function(sedeId, sedeNome){
    var sheet=document.getElementById("modal-sheet");
    document.getElementById("modal-pubblica").classList.add("open");
    var votoSel=0;
    sheet.innerHTML='<div class="modal-handle"></div>'+
      '<div class="modal-title">⭐ Recensisci '+esc(sedeNome)+'</div>'+
      '<div style="font-size:13px;color:#64748b;margin-bottom:16px">✓ Recensione verificata tramite visita registrata</div>'+
      '<div style="font-size:14px;font-weight:700;margin-bottom:10px">Il tuo voto</div>'+
      '<div id="stelle-rec" style="display:flex;gap:8px;margin-bottom:16px">'+
        [1,2,3,4,5].map(function(i){return '<span data-v="'+i+'" onclick="setVotoRec('+i+')" style="font-size:36px;cursor:pointer;opacity:.3;transition:opacity .15s">★</span>';}).join("")+
      '</div>'+
      '<textarea class="pub-textarea" id="rec-testo" placeholder="Racconta la tua esperienza: cibo, servizio, atmosfera..." style="min-height:120px"></textarea>'+
      '<button class="pub-btn" onclick="inviaRecensione(\''+sedeId+'\')">Pubblica recensione</button>';
  };

  window.setVotoRec = function(v){
    document.querySelectorAll("#stelle-rec span").forEach(function(s,i){s.style.opacity=i<v?"1":".3";});
    window._votoRec=v;
  };

  window.inviaRecensione = async function(sedeId){
    var voto=window._votoRec||0;
    var testo=document.getElementById("rec-testo")?.value?.trim();
    if(!voto){alert("Seleziona un voto");return;}
    if(!testo||testo.length<10){alert("Scrivi almeno 10 caratteri di recensione");return;}
    var btn=document.querySelector("#modal-sheet .pub-btn");
    if(btn){btn.textContent="Pubblicazione...";btn.disabled=true;}

    var{data:sede}=await supa.from("sedi").select("azienda_id").eq("id",sedeId).single();

    var{error}=await supa.from("recensioni").insert({
      user_id:window._ME.id,
      sede_id:sedeId,
      azienda_id:sede?.azienda_id||window.AZIENDA,
      voto,testo,
      verificata:true,
      fonte_verifica:"prenotazione_rfbook",
      visibile:true
    });

    if(btn){btn.textContent="Pubblica recensione";btn.disabled=false;}
    if(error){alert("Errore: "+error.message);return;}

    document.getElementById("modal-pubblica").classList.remove("open");
    window._votoRec=0;
    setTimeout(function(){
      alert("✅ Recensione pubblicata!\nGrazie per il tuo contributo.");
      apriSchedaLocale(sedeId);
    },200);
  };

  // ── SEGUI LOCALE ─────────────────────────────────────────────────────────────
  window.toggleSeguiLocale = async function(aziendaId, btn){
    if(!window._ME){window.showAuth();return;}
    var{data:ex}=await supa.from("social_follower").select("id").eq("follower_id",window._ME.id).eq("following_azienda_id",aziendaId).maybeSingle();
    if(ex){
      await supa.from("social_follower").delete().eq("id",ex.id);
      if(btn){btn.textContent="+ Segui locale";btn.style.background="#fff";btn.style.color="var(--brand)";}
    } else {
      await supa.from("social_follower").insert({follower_id:window._ME.id,following_azienda_id:aziendaId});
      if(btn){btn.textContent="✓ Segui";btn.style.background="var(--brand)";btn.style.color="#fff";}
    }
  };

})();
