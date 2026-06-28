// js/locali.js — scopri locali + scheda stile Google Business / Facebook
(function(){
  var supa = window._supa;
  var _sediAll = [], _userLat = null, _userLng = null;

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function formatData(ts){if(!ts)return"";return new Date(ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});}
  function formatOra(ts){if(!ts)return"";return new Date(ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});}

  function calcolaDistanza(lat1,lng1,lat2,lng2){
    var R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
    var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function stelleHTML(v,size){
    size=size||14;
    var h="";
    for(var i=1;i<=5;i++){
      h+='<span style="color:'+(i<=Math.round(v||0)?"#f59e0b":"#d1d5db")+';font-size:'+size+'px;line-height:1">★</span>';
    }
    return h;
  }

  // ── LISTA LOCALI (home) ──────────────────────────────────────────────────────
  window.renderLocali = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';

    // Geoloc
    _userLat=null; _userLng=null;
    try{
      var pos=await new Promise(function(res,rej){navigator.geolocation.getCurrentPosition(res,rej,{timeout:4000});});
      _userLat=pos.coords.latitude; _userLng=pos.coords.longitude;
    }catch(e){}

    var [{data:sedi},{data:ratings}]=await Promise.all([
      supa.from("sedi").select("id,nome,indirizzo,citta,latitudine,longitudine,logo_url,azienda_id,aziende(id,nome,logo_url,cover_url,tipo_locale,tipo_cucina,tags,fascia_prezzo,descrizione)").eq("attiva",true).eq("visibile_in_book",true).order("nome"),
      supa.from("recensioni").select("sede_id,voto").eq("visibile",true)
    ]);

    // Aggrega rating
    var ratingMap={};
    (ratings||[]).forEach(function(r){
      if(!ratingMap[r.sede_id]) ratingMap[r.sede_id]={sum:0,count:0};
      ratingMap[r.sede_id].sum+=r.voto||0;
      ratingMap[r.sede_id].count++;
    });

    // Distanze e ordina
    (sedi||[]).forEach(function(s){
      s._rating=ratingMap[s.id]?ratingMap[s.id].sum/ratingMap[s.id].count:0;
      s._recCount=ratingMap[s.id]?ratingMap[s.id].count:0;
      if(_userLat&&s.latitudine&&s.longitudine)
        s._dist=calcolaDistanza(_userLat,_userLng,parseFloat(s.latitudine),parseFloat(s.longitudine));
    });
    _sediAll=sedi||[];
    var ordinati=_sediAll.slice().sort(function(a,b){return (a._dist||999)-(b._dist||999);});

    // Shell
    c.innerHTML='';
    var wrap=document.createElement("div"); wrap.className="pb-nav";

    // Search
    var topBar=document.createElement("div");
    topBar.style.cssText="position:sticky;top:0;z-index:10;background:var(--surface);border-bottom:1px solid var(--border);padding:10px 14px;";
    topBar.innerHTML='<div style="display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 12px;">'+
      '<span style="font-size:16px;color:var(--text-3)">🔍</span>'+
      '<input id="locali-search" placeholder="Cerca locale o città..." style="border:none;background:transparent;font-size:14px;font-family:var(--font);outline:none;flex:1;color:var(--text)"/>'+
      '</div>';
    wrap.appendChild(topBar);

    // Chips filtro
    var chipsBar=document.createElement("div");
    chipsBar.style.cssText="background:var(--surface);border-bottom:1px solid var(--border);padding:8px 0;";
    chipsBar.innerHTML='<div style="display:flex;gap:6px;padding:0 14px;overflow-x:auto;scrollbar-width:none">'+
      [["all","Tutti"],["near","📍 Vicino"],["top","⭐ Migliori"],["new","🆕 Nuovi"]].map(function(f,i){
        return '<button class="filtro-btn'+(i===0?" active":"")+'" data-fl="'+f[0]+'" onclick="filtraLocali(\''+f[0]+'\')">'+f[1]+'</button>';
      }).join("")+'</div>';
    wrap.appendChild(chipsBar);

    var listEl=document.createElement("div"); listEl.id="locali-list"; listEl.style.padding="10px 0";
    wrap.appendChild(listEl);
    c.innerHTML=""; c.appendChild(wrap);

    renderCards(ordinati, listEl);

    // Search live
    document.getElementById("locali-search").addEventListener("input",function(){
      var q=this.value.toLowerCase().trim();
      var filtered=q?_sediAll.filter(function(s){
        return (s.nome||"").toLowerCase().includes(q)||(s.citta||"").toLowerCase().includes(q)||
               (s.indirizzo||"").toLowerCase().includes(q)||((s.aziende&&s.aziende.nome)||"").toLowerCase().includes(q);
      }):ordinati;
      renderCards(filtered, document.getElementById("locali-list"));
    });
  };

  window.filtraLocali=function(fl){
    document.querySelectorAll("[data-fl]").forEach(function(b){b.classList.toggle("active",b.dataset.fl===fl);});
    var list=_sediAll.slice();
    if(fl==="near") list.sort(function(a,b){return (a._dist||999)-(b._dist||999);});
    else if(fl==="top") list.sort(function(a,b){return (b._rating||0)-(a._rating||0);});
    else if(fl==="new") list.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);});
    renderCards(list, document.getElementById("locali-list"));
  };

  function renderCards(sedi, el){
    if(!sedi||sedi.length===0){
      el.innerHTML='<div class="empty-state"><div class="empty-icon">📍</div><div class="empty-title">Nessun locale trovato</div></div>';
      return;
    }
    var h="";
    sedi.forEach(function(s){
      var az=s.aziende||{};
      var cover=az.cover_url||s.logo_url||az.logo_url||"";
      var tipiCucina=(az.tipo_cucina||[]).slice(0,2).join(" · ");
      var tags=(az.tags||[]).slice(0,3);
      var distLabel=s._dist?('<span style="font-size:12px;color:var(--brand);font-weight:600">📡 '+s._dist.toFixed(1)+' km</span>'):"";
      var fascia=az.fascia_prezzo||"";

      h+='<div onclick="apriSchedaLocale(\''+s.id+'\')" style="background:var(--surface);border-radius:12px;margin:0 14px 10px;overflow:hidden;border:1px solid var(--border);cursor:pointer;transition:box-shadow .15s;" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.1)\'" onmouseout="this.style.boxShadow=\'none\'">';

      // Cover photo
      if(cover){
        h+='<div style="position:relative"><img src="'+esc(cover)+'" style="width:100%;height:150px;object-fit:cover;display:block"/>';
      } else {
        var g=["linear-gradient(135deg,#0E5A7A,#1a8fb5)","linear-gradient(135deg,#0E5A7A,#00c896)","linear-gradient(135deg,#1a3a4a,#0E5A7A)"][Math.abs((s.id||"").charCodeAt(0))%3];
        h+='<div style="position:relative"><div style="width:100%;height:150px;background:'+g+';display:flex;align-items:center;justify-content:center;font-size:40px">🍽️</div>';
      }

      // Rating badge su cover
      if(s._rating>0){
        h+='<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.65);color:#fff;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:700;backdrop-filter:blur(4px)">★ '+s._rating.toFixed(1)+'</div>';
      }

      // Logo piccolo
      if(az.logo_url){
        h+='<img src="'+esc(az.logo_url)+'" style="position:absolute;bottom:-18px;left:14px;width:40px;height:40px;border-radius:8px;border:2px solid var(--surface);object-fit:cover;background:#fff"/>';
      }
      h+='</div>';

      // Body card
      h+='<div style="padding:'+(az.logo_url?"24px 14px 14px":"14px")+'">';
      h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px">';
      h+='<div style="font-size:15px;font-weight:700;color:var(--text);flex:1">'+esc(s.nome||az.nome||"")+'</div>';
      h+=distLabel;
      h+='</div>';

      // Tipo cucina + fascia
      var subtitle=[];
      if(az.tipo_locale) subtitle.push(esc(az.tipo_locale));
      if(tipiCucina) subtitle.push(esc(tipiCucina));
      if(fascia) subtitle.push(esc(fascia));
      if(subtitle.length) h+='<div style="font-size:12px;color:var(--brand);font-weight:500;margin-bottom:4px">'+subtitle.join(" · ")+'</div>';

      // Rating + indirizzo
      if(s._rating>0){
        h+='<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">'+stelleHTML(s._rating,12)+'<span style="font-size:12px;font-weight:600;color:var(--text)">'+s._rating.toFixed(1)+'</span><span style="font-size:11px;color:var(--text-3)">('+s._recCount+')</span></div>';
      } else {
        h+='<div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Nessuna recensione ancora</div>';
      }
      if(s.indirizzo||s.citta) h+='<div style="font-size:12px;color:var(--text-2);margin-bottom:8px">📍 '+esc((s.indirizzo||"")+(s.citta?" · "+s.citta:""))+'</div>';

      // Tags
      if(tags.length){
        h+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">';
        tags.forEach(function(t){h+='<span style="background:var(--brand-light);color:var(--brand);border-radius:4px;padding:2px 7px;font-size:10px;font-weight:600">'+esc(t)+'</span>';});
        h+='</div>';
      }

      // Azioni
      h+='<div style="display:flex;gap:6px">';
      h+='<button onclick="event.stopPropagation();apriFormPrenotazione(\''+s.id+'\',\''+esc(s.nome||"")+'\',\''+esc(s.azienda_id||"")+'\')" style="flex:2;padding:9px;background:var(--brand);color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">📅 Prenota</button>';
      h+='<button onclick="event.stopPropagation();apriSchedaLocale(\''+s.id+'\')" style="flex:1;padding:9px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:7px;font-size:13px;font-weight:500;cursor:pointer">Scheda</button>';
      h+='</div>';
      h+='</div></div>';
    });
    el.innerHTML=h;
  }

  // ── SCHEDA LOCALE stile Google Business + Facebook ────────────────────────
  window.apriSchedaLocale = async function(sedeId){
    var c=document.getElementById("page-content");
    c.innerHTML='<div class="page-loader full"><div class="spinner"></div></div>';

    var [{data:sede},{data:recensioni},{data:postAzienda},{data:offerte},{data:galleriaPost}]=await Promise.all([
      supa.from("sedi").select("*,aziende(id,nome,logo_url,cover_url,tipo_locale,tipo_cucina,tags,fascia_prezzo,descrizione,telefono,sito_web,instagram,foto_galleria)").eq("id",sedeId).single(),
      supa.from("recensioni").select("id,voto,testo,created_at,verificata,user_id,clienti_profilo(nome_completo,avatar_url)").eq("sede_id",sedeId).eq("visibile",true).order("verificata",{ascending:false}).order("created_at",{ascending:false}).limit(20),
      supa.from("social_post").select("id,testo,media_url,tipo,created_at,reaz_fuoco,reaz_applauso,reaz_cuore").eq("azienda_id",(function(){return window._schedaAziendaId||"";}())).eq("visibile",true).neq("tipo","storia").order("created_at",{ascending:false}).limit(10),
      supa.from("network_offerte").select("*").eq("attiva",true).eq("sede_id",sedeId).order("created_at",{ascending:false}).limit(5),
      supa.from("social_post").select("media_url").eq("sede_id",sedeId).eq("visibile",true).not("media_url","is",null).order("created_at",{ascending:false}).limit(12)
    ]);

    if(!sede){c.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-3)">Locale non trovato</div>';return;}

    var az=sede.aziende||{};
    window._schedaAziendaId=az.id||sede.azienda_id;

    // Variabili sede-first con fallback azienda
    var sdCover=sede.cover_url||az.cover_url||az.logo_url||"";
    var sdLogo=sede.logo_url||az.logo_url||"";
    var sdDescrizione=sede.descrizione||az.descrizione||"";
    var sdTipiCucina=(sede.tipo_cucina&&sede.tipo_cucina.length?sede.tipo_cucina:(az.tipo_cucina||[])).join(" · ");
    var sdTags=sede.tags&&sede.tags.length?sede.tags:(az.tags||[]);
    var sdFascia=sede.fascia_prezzo||az.fascia_prezzo||"";
    var sdInstagram=sede.instagram||az.instagram||"";
    var sdTelefono=sede.telefono||az.telefono||"";
    var sdOrari=sede.orari_apertura||{};
    var sdGalleria=(az.foto_galleria||[]);

    // Ricarica post azienda con id corretto
    var {data:postAz}=await supa.from("social_post").select("id,testo,media_url,tipo,created_at,reaz_fuoco,reaz_applauso,reaz_cuore,clienti_profilo(nome_completo,avatar_url)").eq("azienda_id",az.id||sede.azienda_id).eq("visibile",true).neq("tipo","storia").order("created_at",{ascending:false}).limit(10);

    var avgVoto=recensioni&&recensioni.length>0?(recensioni.reduce(function(s,r){return s+(r.voto||0);},0)/recensioni.length):0;
    var recCount=recensioni?recensioni.length:0;
    var cover=az.cover_url||s.logo_url||"";
    var galleria=az.foto_galleria||[];
    var tipiCucina=sdTipiCucina;
    var tags=sdTags;

    // Controlla se può recensire
    var puoRecensire=false;
    if(window._ME){
      var {data:pren}=await supa.from("prenotazioni_tavoli").select("id").eq("sede_id",sedeId).eq("rfbook_user_id",window._ME.id).eq("stato","completata").limit(1);
      puoRecensire=pren&&pren.length>0;
      if(puoRecensire){
        var {data:miaRec}=await supa.from("recensioni").select("id").eq("sede_id",sedeId).eq("user_id",window._ME.id).limit(1);
        if(miaRec&&miaRec.length>0) puoRecensire=false;
      }
    }

    c.innerHTML='';
    var wrap=document.createElement("div"); wrap.className="pb-nav"; wrap.id="scheda-wrap";

    // ── TOP BAR sticky ──
    var topBar=document.createElement("div");
    topBar.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--brand);position:sticky;top:0;z-index:10;";
    topBar.innerHTML='<button onclick="window.navTo(\'locali\')" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1">←</button>'+
      '<div style="font-size:15px;font-weight:700;color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(sede.nome||"")+'</div>'+
      (sdTelefono?'<a href="tel:'+esc(sdTelefono)+'" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:18px;cursor:pointer;padding:5px 8px;border-radius:6px;text-decoration:none">📞</a>':'')+
      (sede.latitudine&&sede.longitudine?'<a href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent((sede.indirizzo||"")+" "+(sede.citta||""))+'" target="_blank" style="background:rgba(255,255,255,.15);border:none;color:#fff;font-size:18px;cursor:pointer;padding:5px 8px;border-radius:6px;text-decoration:none">🗺️</a>':'');
    wrap.appendChild(topBar);

    // ── HERO stile Facebook: cover + logo circolare sovrapposto ──
    var coverUrl=sdCover;
    var logoUrl=sdLogo;
    var extraFoto=sdGalleria.concat((galleriaPost||[]).map(function(p){return p.media_url;}).filter(Boolean));

    var hero=document.createElement("div");
    hero.style.cssText="position:relative;";

    // Cover photo
    var coverEl=document.createElement("div");
    coverEl.style.cssText="width:100%;height:200px;overflow:hidden;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);";
    if(coverUrl){
      var coverImg=document.createElement("img");
      coverImg.src=coverUrl;
      coverImg.style.cssText="width:100%;height:100%;object-fit:cover;display:block;";
      coverEl.appendChild(coverImg);
    } else {
      coverEl.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:52px;color:rgba(255,255,255,.3)">🍽️</div>';
    }
    hero.appendChild(coverEl);

    // Logo circolare sovrapposto (stile Facebook)
    var logoWrap=document.createElement("div");
    logoWrap.style.cssText="position:absolute;bottom:-32px;left:16px;width:80px;height:80px;border-radius:50%;border:3px solid var(--surface);background:var(--surface);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15);";
    if(logoUrl){
      var logoImg=document.createElement("img");
      logoImg.src=logoUrl;
      logoImg.style.cssText="width:100%;height:100%;object-fit:cover;";
      logoWrap.appendChild(logoImg);
    } else {
      logoWrap.style.background="var(--brand)";
      logoWrap.style.display="flex";
      logoWrap.style.alignItems="center";
      logoWrap.style.justifyContent="center";
      logoWrap.style.fontSize="32px";
      logoWrap.textContent="🍽️";
    }
    hero.appendChild(logoWrap);

    // Numero foto badge
    if(extraFoto.length>0){
      var fotoBadge=document.createElement("div");
      fotoBadge.style.cssText="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;backdrop-filter:blur(4px);cursor:pointer;";
      fotoBadge.textContent="📸 "+extraFoto.length+" foto";
      fotoBadge.onclick=function(){switchSchedaTab("foto",sedeId);};
      hero.appendChild(fotoBadge);
    }

    wrap.appendChild(hero);

    // Spacer per logo che sporge
    var spacer=document.createElement("div");
    spacer.style.height="40px";
    spacer.style.background="var(--surface)";
    wrap.appendChild(spacer);

    // ── HEADER LOCALE ──
    var header=document.createElement("div");
    header.style.cssText="background:var(--surface);padding:14px;border-bottom:1px solid var(--border);";
    var headerH='';

    // Nome (logo già nel hero)
    headerH+='<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">';
    headerH+='<div style="flex:1">';
    headerH+='<div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:2px">'+esc(sede.nome||az.nome||"")+'</div>';
    var subInfo=[];
    if(az.tipo_locale) subInfo.push(az.tipo_locale);
    if(tipiCucina) subInfo.push(tipiCucina);
    if(sdFascia) subInfo.push(sdFascia);
    if(subInfo.length) headerH+='<div style="font-size:12px;color:var(--brand);font-weight:500;margin-bottom:4px">'+esc(subInfo.join(" · "))+'</div>';
    // Rating
    if(avgVoto>0){
      headerH+='<div style="display:flex;align-items:center;gap:5px">'+stelleHTML(avgVoto,14)+'<span style="font-size:13px;font-weight:700;color:var(--text)">'+avgVoto.toFixed(1)+'</span><span style="font-size:12px;color:var(--text-3)">('+recCount+' recensioni)</span></div>';
    } else {
      headerH+='<div style="font-size:12px;color:var(--text-3)">Nessuna recensione ancora</div>';
    }
    headerH+='</div></div>';

    // Tags
    if(tags.length){
      headerH+='<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">';
      tags.forEach(function(t){headerH+='<span style="background:var(--brand-light);color:var(--brand);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:500">'+esc(t)+'</span>';});
      headerH+='</div>';
    }

    // Indirizzo
    if(sede.indirizzo||sede.citta) headerH+='<div style="font-size:13px;color:var(--text-2);margin-bottom:10px">📍 '+esc((sede.indirizzo||"")+(sede.citta?" · "+sede.citta:""))+'</div>';

    // Azioni principali
    headerH+='<div style="display:flex;gap:7px">';
    headerH+='<button onclick="apriFormPrenotazione(\''+sedeId+'\',\''+esc(sede.nome||"")+'\',\''+esc(sede.azienda_id||"")+'\')" style="flex:2;padding:11px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">📅 Prenota ora</button>';
    if(sdInstagram) headerH+='<a href="https://instagram.com/'+esc(sdInstagram.replace("@",""))+'" target="_blank" style="flex:1;padding:11px;background:var(--bg);color:var(--text-2);border:1px solid var(--border);border-radius:8px;font-size:13px;font-weight:500;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">📷</a>';
    if(az.sito_web) headerH+='<a href="'+esc(az.sito_web)+'" target="_blank" style="flex:1;padding:11px;background:var(--bg);color:var(--text-2);border:1px solid var(--border);border-radius:8px;font-size:13px;font-weight:500;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center">🌐</a>';
    headerH+='</div>';

    header.innerHTML=headerH;
    wrap.appendChild(header);

    // ── TAB NAV ──
    var tabNav=document.createElement("div");
    tabNav.style.cssText="background:var(--surface);border-bottom:1px solid var(--border);display:flex;overflow-x:auto;scrollbar-width:none;position:sticky;top:52px;z-index:9;";
    var TABS=[["info","ℹ️ Info"],["recensioni","⭐ Recensioni ("+recCount+")"],["notizie","📢 Notizie"],["foto","📸 Foto"],["offerte","🎁 Offerte"]];
    tabNav.innerHTML=TABS.map(function(t,i){
      return '<button data-stab="'+t[0]+'" onclick="switchSchedaTab(\''+t[0]+'\',\''+sedeId+'\')" style="padding:10px 14px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:'+(i===0?"700":"500")+';color:'+(i===0?"var(--brand)":"var(--text-2)")+';border-bottom:2px solid '+(i===0?"var(--brand)":"transparent")+';white-space:nowrap;flex-shrink:0;font-family:var(--font)">'+t[1]+'</button>';
    }).join("");
    wrap.appendChild(tabNav);

    // ── CONTENUTO TAB ──
    var tabContent=document.createElement("div"); tabContent.id="scheda-tab-content";
    wrap.appendChild(tabContent);

    c.innerHTML=""; c.appendChild(wrap);

    // Salva dati in window per uso nei tab
    window._schedaData={
      sede, az, recensioni, postAz:postAz||[], offerte:offerte||[], galleriaPost:galleriaPost||[],
      sedeId, puoRecensire, avgVoto, recCount,
      sdOrari, sdDescrizione, sdTags, sdFascia, sdTipiCucina, sdInstagram, sdTelefono, sdGalleria
    };

    renderTabInfo();
  };

  window.switchSchedaTab=function(tab, sedeId){
    document.querySelectorAll("[data-stab]").forEach(function(b){
      var att=b.dataset.stab===tab;
      b.style.color=att?"var(--brand)":"var(--text-2)";
      b.style.borderBottomColor=att?"var(--brand)":"transparent";
      b.style.fontWeight=att?"700":"500";
    });
    if(tab==="info") renderTabInfo();
    else if(tab==="recensioni") renderTabRecensioni();
    else if(tab==="notizie") renderTabNotizie();
    else if(tab==="foto") renderTabFoto();
    else if(tab==="offerte") renderTabOfferte();
  };

  // ── TAB INFO ──────────────────────────────────────────────────────────────
  function renderTabInfo(){
    var el=document.getElementById("scheda-tab-content"); if(!el) return;
    var d=window._schedaData; if(!d) return;
    var az=d.az, sede=d.sede;
    var h='<div style="padding:16px">';

    // Descrizione
    if(d.sdDescrizione){
      h+='<div style="margin-bottom:16px">';
      h+='<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">Il locale</div>';
      h+='<div style="font-size:14px;color:var(--text-2);line-height:1.6">'+esc(d.sdDescrizione)+'</div>';
      h+='</div>';
    }

    // Info pratiche
    h+='<div style="background:var(--bg);border-radius:10px;overflow:hidden;margin-bottom:16px">';
    var infoItems=[];
    if(sede.indirizzo||sede.citta) infoItems.push(["📍","Indirizzo",(sede.indirizzo||"")+(sede.citta?" · "+sede.citta:"")]);
    if(d.sdTelefono) infoItems.push(["📞","Telefono",d.sdTelefono]);
    if(az.fascia_prezzo){var fasciaDesc={"€":"economico","€€":"medio","€€€":"alto","€€€€":"fine dining"}[az.fascia_prezzo]||""; infoItems.push(["💶","Fascia prezzo",az.fascia_prezzo+" · "+fasciaDesc]);}
    if(az.sito_web) infoItems.push(["🌐","Sito web",az.sito_web]);
    if(az.instagram) infoItems.push(["📷","Instagram",az.instagram]);

    infoItems.forEach(function(item,i){
      h+='<div style="display:flex;align-items:flex-start;gap:10px;padding:11px 13px;'+(i<infoItems.length-1?"border-bottom:1px solid var(--border)":"")+'">';
      h+='<span style="font-size:18px;width:24px;flex-shrink:0">'+item[0]+'</span>';
      h+='<div><div style="font-size:11px;color:var(--text-3);font-weight:500;text-transform:uppercase;letter-spacing:.04em">'+esc(item[1])+'</div>';
      h+='<div style="font-size:13px;color:var(--text);margin-top:1px">'+esc(item[2])+'</div></div>';
      h+='</div>';
    });
    h+='</div>';

    // Tags / caratteristiche
    if(d.sdTags&&d.sdTags.length){
      h+='<div style="margin-bottom:16px">';
      h+='<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">Caratteristiche</div>';
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
      d.sdTags.forEach(function(t){h+='<span style="background:var(--brand-light);color:var(--brand);border-radius:6px;padding:5px 10px;font-size:12px;font-weight:500">'+esc(t)+'</span>';});
      h+='</div></div>';
    }

    // Tipo cucina
    if(d.sdTipiCucina){
      h+='<div style="margin-bottom:16px">';
      h+='<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">Tipo di cucina</div>';
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
      d.sdTipiCucina.split(" · ").forEach(function(t){h+='<span style="background:var(--bg);color:var(--text-2);border-radius:6px;padding:5px 10px;font-size:12px;border:1px solid var(--border)">'+esc(t)+'</span>';});
      h+='</div></div>';
    }

    // Orari di apertura
    var orariAp = d.sdOrari || {};
    var GIORNI_L = [{k:'lun',l:'Lunedì'},{k:'mar',l:'Martedì'},{k:'mer',l:'Mercoledì'},{k:'gio',l:'Giovedì'},{k:'ven',l:'Venerdì'},{k:'sab',l:'Sabato'},{k:'dom',l:'Domenica'}];
    var hasOrari = Object.keys(orariAp).length > 0;
    if(hasOrari){
      var oggi = new Date().getDay(); // 0=dom,1=lun...
      var mapGiorno = {0:'dom',1:'lun',2:'mar',3:'mer',4:'gio',5:'ven',6:'sab'};
      var oggiKey = mapGiorno[oggi];
      h+='<div style="margin-bottom:16px">';
      h+='<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">🕐 Orari di apertura</div>';
      h+='<div style="background:var(--bg);border-radius:10px;overflow:hidden">';
      GIORNI_L.forEach(function(g){
        var o=orariAp[g.k]; var aperto=!o||o.aperto!==false; var isOggi=g.k===oggiKey;
        h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 13px;'+(isOggi?'background:var(--brand-light);':'')+';border-bottom:1px solid var(--border)">';
        h+='<span style="font-size:13px;font-weight:'+(isOggi?'700':'500')+';color:'+(isOggi?'var(--brand)':'var(--text)')+'">'+esc(g.l)+(isOggi?' (oggi)':'')+'</span>';
        if(!aperto){
          h+='<span style="font-size:12px;color:#dc2626;font-weight:600">Chiuso</span>';
        } else if(o){
          var slot=o.solo_cena?(o.cena_inizio+' – '+o.cena_fine):(o.pranzo_inizio+' – '+o.pranzo_fine+' / '+o.cena_inizio+' – '+o.cena_fine);
          h+='<span style="font-size:12px;color:var(--text-2)">'+esc(slot)+'</span>';
        } else {
          h+='<span style="font-size:12px;color:var(--text-2)">12:00 – 14:30 / 19:30 – 22:30</span>';
        }
        h+='</div>';
      });
      h+='</div></div>';
    }

    // Mappa
    if(sede.latitudine&&sede.longitudine){
      var mapUrl="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent((sede.indirizzo||"")+" "+(sede.citta||""));
      h+='<a href="'+mapUrl+'" target="_blank" style="display:flex;align-items:center;gap:10px;padding:13px;background:var(--bg);border-radius:10px;text-decoration:none;color:var(--text);margin-bottom:16px;border:1px solid var(--border)">';
      h+='<span style="font-size:24px">🗺️</span><div><div style="font-size:13px;font-weight:600">Ottieni indicazioni</div><div style="font-size:11px;color:var(--text-3);margin-top:1px">Apri in Google Maps</div></div><span style="margin-left:auto;color:var(--text-3)">›</span></a>';
    }

    h+='</div>';
    el.innerHTML=h;
  }

  // ── TAB RECENSIONI ────────────────────────────────────────────────────────
  function renderTabRecensioni(){
    var el=document.getElementById("scheda-tab-content"); if(!el) return;
    var d=window._schedaData; if(!d) return;
    var h='<div style="padding:14px">';

    // Sommario rating
    if(d.avgVoto>0){
      h+='<div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:16px">';
      h+='<div style="text-align:center"><div style="font-size:40px;font-weight:700;color:var(--text);line-height:1">'+d.avgVoto.toFixed(1)+'</div>';
      h+=stelleHTML(d.avgVoto,18);
      h+='<div style="font-size:11px;color:var(--text-3);margin-top:3px">'+d.recCount+' recensioni</div></div>';
      // Distribuzione stelle
      h+='<div style="flex:1">';
      for(var s=5;s>=1;s--){
        var cnt=(d.recensioni||[]).filter(function(r){return Math.round(r.voto)===s;}).length;
        var pct=d.recCount>0?Math.round((cnt/d.recCount)*100):0;
        h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
        h+='<span style="font-size:11px;color:var(--text-3);width:8px">'+s+'</span>';
        h+='<div style="flex:1;background:var(--border);border-radius:999px;height:5px;overflow:hidden"><div style="height:100%;background:#f59e0b;width:'+pct+'%"></div></div>';
        h+='<span style="font-size:11px;color:var(--text-3);width:24px;text-align:right">'+cnt+'</span>';
        h+='</div>';
      }
      h+='</div></div>';
    }

    // Bottone scrivi recensione
    if(d.puoRecensire){
      h+='<button onclick="apriModalRecensione(\''+d.sedeId+'\',\''+esc(d.sede.nome||"")+'\')" style="width:100%;padding:12px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:14px">✏️ Scrivi la tua recensione</button>';
    } else if(window._ME){
      h+='<div style="background:#fef3c7;border-radius:8px;padding:10px 13px;font-size:12px;color:#92400e;margin-bottom:14px">⚠️ Puoi recensire dopo una visita verificata</div>';
    }

    // Lista recensioni
    if(!d.recensioni||d.recensioni.length===0){
      h+='<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-title">Nessuna recensione ancora</div><div class="empty-sub">Sii il primo a condividere la tua esperienza</div></div>';
    } else {
      d.recensioni.forEach(function(r){
        var nome=(r.clienti_profilo&&r.clienti_profilo.nome_completo)||"Utente";
        var av=r.clienti_profilo&&r.clienti_profilo.avatar_url;
        h+='<div style="border-bottom:1px solid var(--border);padding:13px 0">';
        h+='<div style="display:flex;align-items:center;gap:9px;margin-bottom:7px">';
        h+='<div style="width:36px;height:36px;border-radius:50%;background:var(--brand-light);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--brand);flex-shrink:0;overflow:hidden">';
        h+=av?'<img src="'+esc(av)+'" style="width:100%;height:100%;object-fit:cover"/>':esc(nome.charAt(0).toUpperCase());
        h+='</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(nome)+'</div>';
        h+='<div style="display:flex;align-items:center;gap:6px;margin-top:2px">'+stelleHTML(r.voto,12);
        if(r.verificata) h+='<span style="font-size:10px;background:#f0fdf4;color:#16a34a;border-radius:4px;padding:1px 6px;font-weight:600">✓ Verificata</span>';
        h+='</div></div>';
        h+='<div style="font-size:11px;color:var(--text-3)">'+formatOra(r.created_at)+'</div>';
        h+='</div>';
        if(r.testo) h+='<div style="font-size:14px;color:var(--text-2);line-height:1.55">'+esc(r.testo)+'</div>';
        h+='</div>';
      });
    }
    h+='</div>';
    el.innerHTML=h;
  }

  // ── TAB NOTIZIE (stile Facebook) ─────────────────────────────────────────
  function renderTabNotizie(){
    var el=document.getElementById("scheda-tab-content"); if(!el) return;
    var d=window._schedaData; if(!d) return;
    var h='<div style="padding:14px">';

    if(!d.postAz||d.postAz.length===0){
      h+='<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-title">Nessuna notizia ancora</div><div class="empty-sub">Il locale non ha ancora pubblicato notizie o aggiornamenti</div></div>';
    } else {
      d.postAz.forEach(function(p){
        var totR=(p.reaz_fuoco||0)+(p.reaz_applauso||0)+(p.reaz_cuore||0);
        var nomeLoc=d.az.nome||d.sede.nome||"Locale";
        var logoLoc=d.az.logo_url||"";
        h+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden">';
        // Header post
        h+='<div style="display:flex;align-items:center;gap:10px;padding:12px">';
        if(logoLoc) h+='<img src="'+esc(logoLoc)+'" style="width:38px;height:38px;border-radius:8px;object-fit:cover;flex-shrink:0"/>';
        else h+='<div style="width:38px;height:38px;border-radius:8px;background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700;flex-shrink:0">'+esc(nomeLoc.charAt(0))+'</div>';
        h+='<div><div style="font-size:14px;font-weight:700;color:var(--text)">'+esc(nomeLoc)+'</div>';
        h+='<div style="font-size:11px;color:var(--text-3);margin-top:1px">'+formatOra(p.created_at)+'</div></div>';
        h+='</div>';
        // Contenuto
        if(p.testo&&p.testo.trim()&&p.testo.trim()!==" ") h+='<div style="padding:0 12px 10px;font-size:14px;line-height:1.55;color:var(--text)">'+esc(p.testo)+'</div>';
        if(p.media_url) h+='<img src="'+esc(p.media_url)+'" style="width:100%;max-height:360px;object-fit:cover;display:block"/>';
        // Reazioni
        if(totR>0){
          h+='<div style="padding:8px 12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-3)">'+totR+' reazioni</div>';
        }
        h+='</div>';
      });
    }
    h+='</div>';
    el.innerHTML=h;
  }

  // ── TAB FOTO ──────────────────────────────────────────────────────────────
  function renderTabFoto(){
    var el=document.getElementById("scheda-tab-content"); if(!el) return;
    var d=window._schedaData; if(!d) return;
    var az=d.az;
    var galleria=(az.foto_galleria||[]).concat((d.galleriaPost||[]).map(function(p){return p.media_url;}).filter(Boolean));
    var h='<div style="padding:14px">';
    if(galleria.length===0){
      h+='<div class="empty-state"><div class="empty-icon">📸</div><div class="empty-title">Nessuna foto ancora</div><div class="empty-sub">Le foto della community appariranno qui</div></div>';
    } else {
      h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">';
      galleria.forEach(function(url){
        h+='<div style="aspect-ratio:1;overflow:hidden;cursor:pointer" onclick="apriFullscreen(\''+esc(url)+'\')">';
        h+='<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"/>';
        h+='</div>';
      });
      h+='</div>';
    }
    h+='</div>';
    el.innerHTML=h;
  }

  // ── TAB OFFERTE ────────────────────────────────────────────────────────────
  function renderTabOfferte(){
    var el=document.getElementById("scheda-tab-content"); if(!el) return;
    var d=window._schedaData; if(!d) return;
    var h='<div style="padding:14px">';
    if(!d.offerte||d.offerte.length===0){
      h+='<div class="empty-state"><div class="empty-icon">🎁</div><div class="empty-title">Nessuna offerta attiva</div><div class="empty-sub">Le promozioni del locale appariranno qui</div></div>';
    } else {
      d.offerte.forEach(function(o){
        var disc=o.tipo==="percentuale"?("-"+o.valore+"%"):o.tipo==="importo"?("-€"+o.valore):"";
        h+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden">';
        h+='<div style="background:linear-gradient(135deg,var(--brand),var(--brand-mid));padding:16px;color:#fff">';
        h+='<div style="font-size:17px;font-weight:700">'+esc(o.titolo||"")+'</div>';
        if(disc) h+='<div style="font-size:28px;font-weight:800;margin-top:4px">'+esc(disc)+'</div>';
        h+='</div>';
        h+='<div style="padding:12px">';
        if(o.descrizione) h+='<div style="font-size:13px;color:var(--text-2);line-height:1.5;margin-bottom:10px">'+esc(o.descrizione)+'</div>';
        if(o.valida_al) h+='<div style="font-size:11px;color:var(--text-3);margin-bottom:10px">Valida fino al '+esc(o.valida_al)+'</div>';
                h+='<button onclick="apriFormPrenotazione(\''+d.sedeId+'\',\''+esc(d.sede.nome||"")+'\',\''+esc(d.sede.azienda_id||"")+'\'" style="width:100%;padding:10px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">📅 Prenota e usa l\'offerta</button>';
        h+='</div></div>';
      });
    }
    h+='</div>';
    el.innerHTML=h;
  }

  // ── FULLSCREEN FOTO ────────────────────────────────────────────────────────
  window.apriFullscreen=function(url){
    var overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;cursor:pointer;";
    overlay.innerHTML='<img src="'+esc(url)+'" style="max-width:100%;max-height:100%;object-fit:contain"/>';
    overlay.onclick=function(){overlay.remove();};
    document.body.appendChild(overlay);
  };

  // ── MODAL RECENSIONE ──────────────────────────────────────────────────────
  window.apriModalRecensione=function(sedeId, sedeNome){
    var sheet=document.getElementById("modal-sheet");
    document.getElementById("modal-pubblica").classList.add("open");
    window._votoRec=0;
    sheet.innerHTML='<div class="modal-handle"></div>'+
      '<div class="modal-title">⭐ Recensisci '+esc(sedeNome)+'</div>'+
      '<div style="font-size:12px;color:var(--text-3);margin-bottom:14px">✓ Recensione verificata tramite visita registrata</div>'+
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Il tuo voto</div>'+
      '<div id="stelle-rec" style="display:flex;gap:10px;margin-bottom:16px">'+
        [1,2,3,4,5].map(function(i){return '<span data-v="'+i+'" onclick="setVotoRec('+i+')" style="font-size:34px;cursor:pointer;opacity:.25;transition:opacity .15s">★</span>';}).join("")+
      '</div>'+
      '<textarea class="pub-textarea" id="rec-testo" placeholder="Racconta la tua esperienza: cibo, servizio, atmosfera..." style="min-height:110px"></textarea>'+
      '<button class="pub-btn" onclick="inviaRecensione(\''+sedeId+'\')">Pubblica recensione</button>';
  };

  window.setVotoRec=function(v){
    window._votoRec=v;
    document.querySelectorAll("#stelle-rec span").forEach(function(s,i){s.style.opacity=i<v?"1":".25";});
  };

  window.inviaRecensione=async function(sedeId){
    var voto=window._votoRec||0;
    var testo=document.getElementById("rec-testo")?.value?.trim();
    if(!voto){alert("Seleziona un voto");return;}
    if(!testo||testo.length<10){alert("Scrivi almeno 10 caratteri");return;}
    var btn=document.querySelector("#modal-sheet .pub-btn");
    if(btn){btn.textContent="Pubblicazione...";btn.disabled=true;}
    var {data:sede}=await supa.from("sedi").select("azienda_id").eq("id",sedeId).single();
    var {error}=await supa.from("recensioni").insert({
      user_id:window._ME.id, sede_id:sedeId,
      azienda_id:sede?.azienda_id||window.AZIENDA,
      voto, testo, verificata:true, fonte_verifica:"prenotazione_rfbook", visibile:true
    });
    if(btn){btn.textContent="Pubblica recensione";btn.disabled=false;}
    if(error){alert("Errore: "+error.message);return;}
    document.getElementById("modal-pubblica").classList.remove("open");
    window._votoRec=0;
    setTimeout(function(){
      alert("✅ Recensione pubblicata! Grazie.");
      apriSchedaLocale(sedeId);
    },200);
  };

  // ── FORM PRENOTAZIONE NATIVO ────────────────────────────────────────────────
  var _prenState = {};

  window.apriFormPrenotazione = async function(sedeId, sedeNome, aziendaId) {
    if(!window._ME){ window.richiedeLogin('prenotare'); return; }

    // Init tracking
    var SID = sessionStorage.getItem('rf_sid') || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    sessionStorage.setItem('rf_sid', SID);
    function rfTrack(tipo, elemento, extra) {
      fetch('https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/track', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({
          azienda_id: aziendaId||null, sede_id: sedeId||null,
          pagina: 'rfbook-prenotazione', pagina_id: sedeId||null,
          tipo, elemento: elemento||null,
          referrer: 'social.ristoflow-ai.com',
          utm_source: 'ristoflowbook', utm_medium: 'social',
          device: /Mobi/.test(navigator.userAgent)?'mobile':'desktop',
          session_id: SID
        }, extra||{}))
      }).catch(function(){});
    }

    rfTrack('view','form_aperto',{completato:false});

    _prenState = { sedeId, sedeNome, aziendaId, step:1, data:'', ora:'', coperti:2, nome:'', telefono:'', note:'', rfTrack };

    // Crea overlay bottom sheet
    var overlay = document.getElementById('pren-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'pren-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:800;display:flex;align-items:flex-end;';
      overlay.onclick = function(e){ if(e.target===overlay) chiudiFormPren(); };
      document.body.appendChild(overlay);
    }

    var sheet = document.getElementById('pren-sheet');
    if(!sheet){
      sheet = document.createElement('div');
      sheet.id = 'pren-sheet';
      sheet.style.cssText = 'background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-height:92vh;overflow-y:auto;padding:0 0 32px;';
      overlay.appendChild(sheet);
    }

    overlay.style.display = 'flex';
    renderStepPren(1);
  };

  function chiudiFormPren(){
    var o = document.getElementById('pren-overlay');
    if(o) o.style.display = 'none';
  }

  async function renderStepPren(step) {
    _prenState.step = step;
    var s = _prenState;
    var sheet = document.getElementById('pren-sheet');
    if(!sheet) return;

    // Header fisso
    var header = '<div style="position:sticky;top:0;background:var(--surface);z-index:2;padding:12px 16px 0;">' +
      '<div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 14px;"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<div style="font-size:17px;font-weight:800;color:var(--text)">📅 Prenota — '+esc(s.sedeNome)+'</div>' +
      '<button onclick="chiudiFormPren()" style="background:var(--bg);border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;color:var(--text-3)">✕</button>' +
      '</div>' +
      // Stepper
      '<div style="display:flex;align-items:center;gap:4px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);">' +
      [['1','Data'],['2','Orario'],['3','Dati']].map(function(t,i){
        var n=i+1, att=n===step, fatto=n<step;
        return '<div style="display:flex;align-items:center;gap:4px;flex:1;">' +
          '<div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:'+(fatto?'var(--brand)':att?'var(--brand)':'var(--border)')+';color:'+(fatto||att?'#fff':'var(--text-3)')+';">'+(fatto?'✓':t[0])+'</div>' +
          '<span style="font-size:11px;font-weight:'+(att?'700':'400')+';color:'+(att?'var(--brand)':'var(--text-3)')+'">'+t[1]+'</span>' +
          (i<2?'<div style="flex:1;height:1px;background:var(--border);margin:0 4px;"></div>':'') +
          '</div>';
      }).join('') +
      '</div></div>';

    var body = '<div style="padding:0 16px;">';

    if(step===1){
      // Step 1 — data + coperti
      var oggi = new Date();
      var maxDate = new Date(); maxDate.setDate(oggi.getDate()+60);
      var fmt = function(d){ return d.toISOString().split('T')[0]; };

      body += '<div style="margin-bottom:16px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;">📅 Scegli la data</div>' +
        '<input type="date" id="pren-data" value="'+esc(s.data||fmt(oggi))+'" min="'+fmt(oggi)+'" max="'+fmt(maxDate)+'" ' +
        'onchange="_prenState.data=this.value" ' +
        'style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-family:var(--font);color:var(--text);background:var(--bg);outline:none;box-sizing:border-box;">' +
        '</div>';

      body += '<div style="margin-bottom:20px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">👥 Numero di persone</div>' +
        '<div style="display:flex;align-items:center;gap:14px;">' +
        '<button onclick="cambiaCoprtiPren(-1)" style="width:42px;height:42px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg);font-size:22px;cursor:pointer;color:var(--text);">−</button>' +
        '<span id="pren-coperti-display" style="font-size:24px;font-weight:800;color:var(--text);min-width:32px;text-align:center;">'+s.coperti+'</span>' +
        '<button onclick="cambiaCoprtiPren(1)" style="width:42px;height:42px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg);font-size:22px;cursor:pointer;color:var(--text);">+</button>' +
        '<span style="font-size:13px;color:var(--text-3);">persone</span>' +
        '</div></div>';

      body += '<button onclick="prenStep2()" style="width:100%;padding:14px;background:var(--brand);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">Continua →</button>';

    } else if(step===2){
      // Step 2 — carica slot disponibili
      body += '<div id="pren-slot-wrap"><div style="text-align:center;padding:30px;color:var(--text-3);">⏳ Caricamento orari...</div></div>';
      body += '<div id="pren-step2-btn" style="margin-top:16px;display:none;">' +
        '<button onclick="prenStep3()" style="width:100%;padding:14px;background:var(--brand);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">Continua →</button>' +
        '</div>';
      body += '<button onclick="renderStepPren(1)" style="width:100%;padding:12px;background:none;border:none;font-size:13px;color:var(--text-3);cursor:pointer;margin-top:6px;">← Indietro</button>';

    } else if(step===3){
      // Step 3 — dati personali
      var meInfo = null;
      if(window._ME){
        var {data:profilo} = await supa.from('clienti_profilo').select('nome_completo,telefono').eq('user_id',window._ME.id).maybeSingle();
        meInfo = profilo;
      }

      body += '<div style="margin-bottom:12px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">👤 Nome e cognome *</div>' +
        '<input id="pren-nome" type="text" value="'+esc(s.nome||meInfo?.nome_completo||'')+'" placeholder="Mario Rossi" ' +
        'oninput="_prenState.nome=this.value" ' +
        'style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;font-family:var(--font);">' +
        '</div>';

      body += '<div style="margin-bottom:12px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">📱 Telefono *</div>' +
        '<input id="pren-tel" type="tel" value="'+esc(s.telefono||meInfo?.telefono||'')+'" placeholder="+39 333 1234567" ' +
        'oninput="_prenState.telefono=this.value" ' +
        'style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;font-family:var(--font);">' +
        '</div>';

      body += '<div style="margin-bottom:16px;">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">📝 Note (opzionale)</div>' +
        '<textarea id="pren-note" placeholder="Allergie, occasioni speciali, richieste..." ' +
        'oninput="_prenState.note=this.value" ' +
        'style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:var(--bg);color:var(--text);outline:none;box-sizing:border-box;resize:none;height:80px;font-family:var(--font);">'+esc(s.note||'')+'</textarea>' +
        '</div>';

      // Riepilogo
      body += '<div style="background:var(--brand-light,#e0f2fe);border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--brand);">' +
        '📅 '+esc(s.data)+' · ⏰ '+esc(s.ora)+' · 👥 '+s.coperti+' persone' +
        '</div>';

      body += '<div id="pren-error" style="display:none;background:#fee2e2;color:#991b1b;border-radius:8px;padding:10px;font-size:13px;margin-bottom:10px;"></div>';

      body += '<button onclick="inviaPrenotazionePren()" id="btn-invia-pren" style="width:100%;padding:14px;background:var(--brand);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">✅ Conferma prenotazione</button>';
      body += '<button onclick="renderStepPren(2)" style="width:100%;padding:12px;background:none;border:none;font-size:13px;color:var(--text-3);cursor:pointer;margin-top:6px;">← Indietro</button>';
    }

    body += '</div>';
    sheet.innerHTML = header + body;

    // Se step 2 carica gli slot
    if(step===2) caricaSlotPren();
  }

  window.cambiaCoprtiPren = function(delta){
    _prenState.coperti = Math.max(1, Math.min(20, (_prenState.coperti||2) + delta));
    var el = document.getElementById('pren-coperti-display');
    if(el) el.textContent = _prenState.coperti;
  };

  window.prenStep2 = function(){
    var data = document.getElementById('pren-data')?.value;
    if(!data){ alert('Seleziona una data'); return; }
    _prenState.data = data;
    _prenState.rfTrack && _prenState.rfTrack('step','seleziona_data',{step:'data',valore:data});
    renderStepPren(2);
  };

  async function caricaSlotPren(){
    var s = _prenState;
    var wrap = document.getElementById('pren-slot-wrap');
    if(!wrap) return;

    // Carica configurazione form prenotazione per questa sede
    var {data:forms} = await supa.from('booking_forms')
      .select('id,configurazione,nome_form')
      .eq('sede_id', s.sedeId)
      .eq('attivo', true)
      .limit(1);

    if(!forms||!forms.length){
      wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);font-size:14px;">⚠️ Questo locale non ha ancora configurato le prenotazioni online.</div>';
      return;
    }

    var form = forms[0];
    var conf = form.configurazione || {};
    var giornoData = new Date(s.data+'T12:00:00');
    var giorno = giornoData.getDay(); // 0=dom, 1=lun...

    // Mappa giorno → servizi disponibili
    var nomiGiorni = ['domenica','lunedi','martedi','mercoledi','giovedi','venerdi','sabato'];
    var nomeGiorno = nomiGiorni[giorno];
    var servizi = conf.servizi || {};
    var slots = [];

    ['pranzo','cena','aperitivo'].forEach(function(tipo){
      var srv = servizi[tipo];
      if(!srv || !srv.attivo) return;
      var giorni = srv.giorni || [];
      if(!giorni.includes(nomeGiorno) && !giorni.includes(giorno)) return;
      // Genera slot ogni 30 min
      var oraI = srv.ora_inizio || '12:00';
      var oraF = srv.ora_fine || '14:30';
      var cur = new Date('2000-01-01T'+oraI+':00');
      var end = new Date('2000-01-01T'+oraF+':00');
      while(cur < end){
        var hh = cur.getHours().toString().padStart(2,'0');
        var mm = cur.getMinutes().toString().padStart(2,'0');
        slots.push({ora: hh+':'+mm, tipo: tipo});
        cur.setMinutes(cur.getMinutes()+30);
      }
    });

    if(!slots.length){
      wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);font-size:14px;">😕 Nessun orario disponibile per questa data.<br><span style="font-size:12px;">Prova un altro giorno.</span></div>';
      return;
    }

    var h = '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">⏰ Scegli l\'orario</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">';
    slots.forEach(function(sl){
      var sel = sl.ora === _prenState.ora;
      h += '<button onclick="selezionaOraPren(\''+sl.ora+'\')" ' +
        'style="padding:10px 6px;border:1.5px solid '+(sel?'var(--brand)':'var(--border)')+';border-radius:10px;background:'+(sel?'var(--brand-light,#e0f2fe)':'var(--bg)')+';cursor:pointer;text-align:center;">' +
        '<div style="font-size:15px;font-weight:800;color:'+(sel?'var(--brand)':'var(--text)')+'">'+sl.ora+'</div>' +
        '<div style="font-size:10px;color:var(--text-3);margin-top:2px;">'+sl.tipo+'</div>' +
        '</button>';
    });
    h += '</div>';
    wrap.innerHTML = h;
    _prenState._formId = form.id;
  }

  window.selezionaOraPren = function(ora){
    _prenState.ora = ora;
    _prenState.rfTrack && _prenState.rfTrack('click','seleziona_slot',{step:'slot',valore:ora});
    // Aggiorna UI slot selezionato
    caricaSlotPren();
    var btnWrap = document.getElementById('pren-step2-btn');
    if(btnWrap) btnWrap.style.display = '';
  };

  window.prenStep3 = function(){
    if(!_prenState.ora){ alert('Seleziona un orario'); return; }
    _prenState.rfTrack && _prenState.rfTrack('step','vai_dati',{step:'dati',valore:_prenState.ora});
    renderStepPren(3);
  };

  window.inviaPrenotazionePren = async function(){
    var s = _prenState;
    var nome = (document.getElementById('pren-nome')?.value||'').trim();
    var telefono = (document.getElementById('pren-tel')?.value||'').trim();
    var note = (document.getElementById('pren-note')?.value||'').trim();
    var errEl = document.getElementById('pren-error');

    if(!nome){ errEl.textContent='Inserisci il tuo nome'; errEl.style.display=''; return; }
    if(!telefono){ errEl.textContent='Inserisci il telefono'; errEl.style.display=''; return; }
    errEl.style.display='none';

    var btn = document.getElementById('btn-invia-pren');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Invio...'; }

    s.rfTrack && s.rfTrack('click','btn_invia',{step:'submit'});

    try {
      var dataStr = s.data;
      var oraStr = s.ora + ':00';
      var {data:pren, error} = await supa.from('prenotazioni_tavoli').insert({
        sede_id: s.sedeId,
        azienda_id: s.aziendaId,
        form_id: s._formId || null,
        rfbook_user_id: window._ME?.id || null,
        cliente_nome: nome,
        cliente_telefono: telefono,
        coperti: s.coperti,
        data: dataStr,
        ora: oraStr,
        note: note || null,
        stato: 'in_attesa',
        canale: 'ristoflowbook',
        sorgente: 'social',
      }).select('id').single();

      if(error) throw error;

      s.rfTrack && s.rfTrack('submit','prenotazione_completata',{completato:true,step:'success',valore:s.data+' '+s.ora+' · '+s.coperti+' pers.'});

      // Aggiorna stato come completata dopo il giorno
      // Mostra successo
      var sheet = document.getElementById('pren-sheet');
      sheet.innerHTML = '<div style="padding:40px 20px;text-align:center;">' +
        '<div style="font-size:60px;margin-bottom:16px;">🎉</div>' +
        '<div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:8px;">Prenotazione confermata!</div>' +
        '<div style="font-size:14px;color:var(--text-2);line-height:1.6;margin-bottom:6px;">'+esc(s.sedeNome)+'</div>' +
        '<div style="background:var(--brand-light,#e0f2fe);border-radius:10px;padding:14px;margin:16px 0;font-size:14px;color:var(--brand);font-weight:600;">' +
        '📅 '+esc(s.data)+' · ⏰ '+esc(s.ora)+'<br>👥 '+s.coperti+' '+(s.coperti===1?'persona':'persone') +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-3);margin-bottom:24px;">Riceverai una conferma via WhatsApp al numero '+esc(telefono)+'</div>' +
        '<button onclick="chiudiFormPren()" style="width:100%;padding:14px;background:var(--brand);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">✓ Chiudi</button>' +
        '</div>';

    } catch(err) {
      s.rfTrack && s.rfTrack('error','errore_submit',{valore:err.message||'errore'});
      if(btn){ btn.disabled=false; btn.textContent='✅ Conferma prenotazione'; }
      var e = document.getElementById('pren-error');
      if(e){ e.textContent='Errore: '+(err.message||'riprova'); e.style.display=''; }
    }
  };

  window.toggleSeguiLocale=async function(aziendaId, btn){
    if(!window._ME){window.showAuth();return;}
    var {data:ex}=await supa.from("social_follower").select("id").eq("follower_id",window._ME.id).eq("following_id",aziendaId).maybeSingle();
    if(ex){
      await supa.from("social_follower").delete().eq("id",ex.id);
      if(btn){btn.textContent="+ Segui";btn.style.background="var(--bg)";btn.style.color="var(--brand)";}
    } else {
      await supa.from("social_follower").insert({follower_id:window._ME.id,following_id:aziendaId});
      if(btn){btn.textContent="✓ Segui";btn.style.background="var(--brand)";btn.style.color="#fff";}
    }
  };

})();
