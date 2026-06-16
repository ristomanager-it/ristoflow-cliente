// js/feed.js — feed principale e ricette
(function(){
  var supa = window._supa;
  var myReaz = window._myReaz || (window._myReaz = {});
  var filtroAttivo = "tutti";

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function formatData(ts){if(!ts)return"";return new Date(ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});}
  function stelleHTML(v){var s="";for(var i=0;i<5;i++)s+=i<v?"⭐":"☆";return s;}

  window.setFiltro = function(s){ filtroAttivo=s; window.navTo("scopri"); };

  // ── STORIA ENCODED ────────────────────────────────────────────────────────────
  window.apriStoriaEncoded = function(el){
    try{
      var g = JSON.parse(decodeURIComponent(el.dataset.g));
      window.apriStoria(g, 0);
    }catch(e){ console.warn("apriStoriaEncoded:", e); }
  };

  // ── VIEWER STORIE ─────────────────────────────────────────────────────────────
  var _storieList=[], _storiaIdx=0, _storiaTimer=null;

  window.apriStoria = function(items, idx){
    if(!items||!items.length) return;
    _storieList=items; _storiaIdx=idx||0;
    document.getElementById("storia-viewer").classList.add("open");
    mostraStoria(_storiaIdx);
  };

  function mostraStoria(idx){
    if(_storiaTimer) clearTimeout(_storiaTimer);
    var s=_storieList[idx]; if(!s){chiudiStoriaViewer();return;}
    var nome=s.nome_completo||s.nome||"?";
    document.getElementById("storia-av-el").textContent=nome.charAt(0).toUpperCase();
    document.getElementById("storia-nome-el").textContent=nome;
    var media=document.getElementById("storia-media-el");
    if(s.media_url){
      var isVid=/\.(mp4|mov|webm)(\?|$)/i.test(s.media_url);
      if(isVid){var v=document.createElement("video");v.src=s.media_url;v.autoplay=true;v.playsInline=true;v.muted=true;v.style.cssText="max-width:100%;max-height:100%";media.innerHTML="";media.appendChild(v);}
      else{var img=document.createElement("img");img.src=s.media_url;img.style.cssText="max-width:100%;max-height:100%;object-fit:contain";media.innerHTML="";media.appendChild(img);}
    }else{media.innerHTML='<div style="font-size:80px;color:#fff">🍷</div>';}
    var tEl=document.getElementById("storia-testo-el");
    var t=s.testo&&s.testo.trim()&&s.testo.trim()!==" ";
    tEl.innerHTML=t?'<p>'+esc(s.testo)+'</p>':"";
    var prog=document.getElementById("storia-progress");
    prog.innerHTML=_storieList.map(function(_,i){return'<div class="storia-bar"><div class="storia-bar-fill" id="sp-'+i+'"></div></div>';}).join("");
    for(var i=0;i<idx;i++){var f=document.getElementById("sp-"+i);if(f)f.style.width="100%";}
    var fill=document.getElementById("sp-"+idx);
    if(fill){setTimeout(function(){fill.style.transition="width 5s linear";fill.style.width="100%";},50);}
    _storiaTimer=setTimeout(function(){_storiaIdx++;mostraStoria(_storiaIdx);},5000);
  }

  window.chiudiStoriaViewer = function(){
    if(_storiaTimer) clearTimeout(_storiaTimer);
    document.getElementById("storia-viewer").classList.remove("open");
    _storieList=[]; _storiaIdx=0; _storiaTimer=null;
  };

  // ── POST MENU (3 PUNTINI) ─────────────────────────────────────────────────────
  window.apriPostMenu = function(e, postId){
    e.stopPropagation();
    var sheet=document.getElementById("post-menu-sheet");
    var overlay=document.getElementById("post-menu-overlay");
    sheet.innerHTML=
      '<div style="width:40px;height:4px;background:#e5e7eb;border-radius:999px;margin:0 auto 12px"></div>'+
      '<div class="post-menu-item" onclick="modificaPost(\''+postId+'\')">✏️ Modifica post</div>'+
      '<div class="post-menu-item danger" onclick="eliminaPost(\''+postId+'\')">🗑 Elimina post</div>'+
      '<div class="post-menu-item" onclick="chiudiPostMenu()">Annulla</div>';
    overlay.classList.add("open");
  };

  window.chiudiPostMenu = function(){
    document.getElementById("post-menu-overlay").classList.remove("open");
  };

  window.eliminaPost = async function(postId){
    if(!window._ME||!confirm("Eliminare questo post?")) return;
    var{error}=await supa.from("social_post").delete().eq("id",postId).eq("user_id",window._ME.id);
    if(error){alert("Errore: "+error.message);return;}
    chiudiPostMenu();
    // Rimuove il post dal DOM senza ricaricare il feed
    var el=document.getElementById("post-"+postId);
    if(el) el.remove();
  };

  window.modificaPost = async function(postId){
    if(!window._ME) return;
    var{data:p}=await supa.from("social_post").select("testo").eq("id",postId).eq("user_id",window._ME.id).maybeSingle();
    if(!p) return;
    var nuovoTesto=prompt("Modifica:",p.testo&&p.testo.trim()!==" "?p.testo:"");
    if(nuovoTesto===null) return;
    await supa.from("social_post").update({testo:nuovoTesto||" "}).eq("id",postId).eq("user_id",window._ME.id);
    chiudiPostMenu();
    window.navTo("scopri");
  };

  // ── REAZIONI A TENDINA ────────────────────────────────────────────────────────
  var _reazOpen = null;

  // 15 emoji disponibili — mappate su 3 campi DB (fuoco=❤️like, applauso=👏bravo, cuore=🔥top)
  var EMOJI_PICKER = [
    {e:"❤️",k:"fuoco",c:"reaz_fuoco"},
    {e:"😍",k:"fuoco",c:"reaz_fuoco"},
    {e:"🔥",k:"cuore",c:"reaz_cuore"},
    {e:"👏",k:"applauso",c:"reaz_applauso"},
    {e:"🤤",k:"fuoco",c:"reaz_fuoco"},
    {e:"😋",k:"fuoco",c:"reaz_fuoco"},
    {e:"🍷",k:"applauso",c:"reaz_applauso"},
    {e:"🍕",k:"applauso",c:"reaz_applauso"},
    {e:"⭐",k:"cuore",c:"reaz_cuore"},
    {e:"🤩",k:"cuore",c:"reaz_cuore"},
    {e:"💯",k:"cuore",c:"reaz_cuore"},
    {e:"👍",k:"fuoco",c:"reaz_fuoco"},
    {e:"🙌",k:"applauso",c:"reaz_applauso"},
    {e:"😮",k:"cuore",c:"reaz_cuore"},
    {e:"💪",k:"applauso",c:"reaz_applauso"},
  ];

  window.toggleReazMenu = function(postId, evt){
    evt.stopPropagation();
    if(_reazOpen===postId){ chiudiReazMenu(); return; }
    chiudiReazMenu();
    _reazOpen=postId;
    var wrap=document.getElementById("act-reaz-"+postId);
    if(!wrap) return;
    var menu=document.createElement("div");
    menu.id="reaz-menu-"+postId;
    menu.style.cssText="position:absolute;bottom:calc(100% + 8px);left:0;background:#fff;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.2);padding:10px 12px;display:flex;flex-wrap:wrap;gap:4px;z-index:50;border:1px solid #e5e7eb;max-width:220px;";
    EMOJI_PICKER.forEach(function(r){
      var b=document.createElement("button");
      b.style.cssText="font-size:24px;line-height:1;border:none;background:none;cursor:pointer;padding:5px;border-radius:10px;transition:background .1s";
      b.textContent=r.e;
      b.onmouseover=function(){this.style.background="#f0f6fa";};
      b.onmouseout=function(){this.style.background="none";};
      (function(emoji,k,c){
        b.onclick=function(ev){
          ev.stopPropagation();
          // Aggiorna icona bottone
          var btn=wrap.querySelector("button");
          if(btn) btn.textContent=emoji;
          reagisciEmoji(postId,emoji,k,c);
          chiudiReazMenu();
        };
      })(r.e,r.k,r.c);
      menu.appendChild(b);
    });
    wrap.style.position="relative";
    wrap.appendChild(menu);
    setTimeout(function(){document.addEventListener("click",chiudiReazMenu,{once:true});},50);
  };

  function chiudiReazMenu(){
    if(_reazOpen!==null){
      var m=document.getElementById("reaz-menu-"+_reazOpen);
      if(m) m.remove();
      _reazOpen=null;
    }
  }

  // ── REAGISCI ─────────────────────────────────────────────────────────────────
  // reagisciEmoji salva l'emoji scelta dall'utente
  window.reagisciEmoji = async function(postId, emoji, emojiKey, campo){
    if(!window._ME){window.showAuth();return;}
    var prev=myReaz[postId]||null;
    if(prev===emoji){
      await supa.from("social_reactions").delete().eq("user_id",window._ME.id).eq("post_id",postId);
      try{await supa.rpc("decrementa_reaction",{p_post_id:postId,p_campo:campo});}catch(e){}
      delete myReaz[postId]; return;
    }
    if(prev){
      // togli la vecchia
      var oldCampo=_emojiCampoMap[prev]||campo;
      try{await supa.rpc("decrementa_reaction",{p_post_id:postId,p_campo:oldCampo});}catch(e){}
    }
    await supa.from("social_reactions").upsert({user_id:window._ME.id,post_id:postId,emoji},{onConflict:"user_id,post_id"});
    try{await supa.rpc("incrementa_reaction",{p_post_id:postId,p_campo:campo});}catch(e){}
    myReaz[postId]=emoji;
  };

  // mappa emoji → campo DB per rimozione corretta
  var _emojiCampoMap={};
  EMOJI_PICKER.forEach(function(r){_emojiCampoMap[r.e]=r.c;});

  window.reagisci = async function(postId, emojiKey, campo){
    if(!window._ME){window.showAuth();return;}
    var emojiMap={fuoco:"😍",applauso:"👏",cuore:"🔥"};
    var emoji=emojiMap[emojiKey];
    var prev=myReaz[postId]||null;
    var updBtn=function(id,c,on){var e=document.getElementById("reaz-btn-"+id+"-"+c);if(e)e.classList.toggle("liked",on);};
    if(prev===emoji){
      await supa.from("social_reactions").delete().eq("user_id",window._ME.id).eq("post_id",postId);
      try{await supa.rpc("decrementa_reaction",{p_post_id:postId,p_campo:campo});}catch(e){}
      updBtn(postId,campo,false); delete myReaz[postId]; return;
    }
    if(prev){
      var cpMap={"😍":"reaz_fuoco","👏":"reaz_applauso","🔥":"reaz_cuore"};
      var cp=cpMap[prev];
      if(cp){try{await supa.rpc("decrementa_reaction",{p_post_id:postId,p_campo:cp});}catch(e){}updBtn(postId,cp,false);}
    }
    await supa.from("social_reactions").upsert({user_id:window._ME.id,post_id:postId,emoji},{onConflict:"user_id,post_id"});
    try{await supa.rpc("incrementa_reaction",{p_post_id:postId,p_campo:campo});}catch(e){}
    updBtn(postId,campo,true); myReaz[postId]=emoji;
  };

  // ── COMMENTI ─────────────────────────────────────────────────────────────────
  window.toggleCommenti = async function(postId){
    var list=document.getElementById("cmtlist-"+postId);
    if(!list) return;
    if(list.classList.toggle("open")) await caricaCommenti(postId);
  };

  async function caricaCommenti(postId){
    var items=document.getElementById("cmtitems-"+postId); if(!items) return;
    // Query senza join per evitare 400
    var{data:cc}=await supa.from("social_commenti").select("id,user_id,testo,created_at").eq("post_id",postId).order("created_at",{ascending:true}).limit(30);
    var cnt=document.getElementById("cmtcount-"+postId);
    if(cnt&&cc) cnt.textContent=cc.length>0?cc.length+" commenti":"";
    if(!cc||cc.length===0){items.innerHTML='<div style="padding:0 14px 8px;font-size:13px;color:var(--text-3)">Nessun commento.</div>';return;}

    // Carica nomi separatamente
    var userIds=[...new Set(cc.map(function(c){return c.user_id;}).filter(Boolean))];
    var nomiMap={};
    if(userIds.length){
      var{data:profili}=await supa.from("clienti_profilo").select("user_id,nome_completo").in("user_id",userIds);
      (profili||[]).forEach(function(p){nomiMap[p.user_id]=p.nome_completo;});
    }

    var h="";
    cc.forEach(function(c){
      var nome=nomiMap[c.user_id]||"Utente";
      var data=new Date(c.created_at).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
      h+='<div class="commento-row"><div class="commento-av">'+esc(nome.charAt(0).toUpperCase())+'</div>';
      h+='<div class="commento-bubble"><div class="commento-nome">'+esc(nome)+'</div><div class="commento-testo">'+esc(c.testo)+'</div><div class="commento-data">'+data+'</div></div></div>';
    });
    items.innerHTML=h;
  }

  window.inviaCommento = async function(postId){
    if(!window._ME){window.showAuth();return;}
    var input=document.getElementById("cmtinput-"+postId);
    var testo=input?input.value.trim():"";
    if(!testo) return;
    input.value="";
    var{error}=await supa.from("social_commenti").insert({post_id:postId,user_id:window._ME.id,testo});
    if(!error) await caricaCommenti(postId);
  };

  // ── RENDER FEED ───────────────────────────────────────────────────────────────
  window.renderFeed = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var ME=window._ME;

    var q=supa.from("v_social_feed").select("*").eq("visibile",true).neq("tipo","storia").order("created_at",{ascending:false}).limit(20);
    if(filtroAttivo!=="tutti") q=q.eq("categoria",filtroAttivo);

    var [{data:posts},{data:reaz}]=await Promise.all([
      q,
      ME?supa.from("social_reactions").select("post_id,emoji").eq("user_id",ME.id):{data:[]}
    ]);
    if(reaz) reaz.forEach(function(r){myReaz[r.post_id]=r.emoji;});

    var h='<div class="pb-nav">';

    // Storie strip
    h+='<div class="storie-wrap"><div class="storie-strip">';
    h+='<div class="storia-item" onclick="apriPubblica(\'storia\')"><div class="storia-add-ring"><div class="storia-add-inner">+</div></div><div class="storia-label">La tua</div></div>';
    var{data:storieDB}=await supa.from("v_social_feed").select("id,user_id,nome_completo,avatar_url,media_url,testo,created_at").eq("tipo","storia").eq("visibile",true).gt("scade_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(20);
    if(storieDB&&storieDB.length>0){
      var gruppi={};
      storieDB.forEach(function(s){if(!gruppi[s.user_id])gruppi[s.user_id]=[];gruppi[s.user_id].push(s);});
      Object.keys(gruppi).forEach(function(uid){
        var g=gruppi[uid],s=g[0],nome=s.nome_completo||"?";
        var av=s.avatar_url?'<img src="'+esc(s.avatar_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>':esc(nome.charAt(0).toUpperCase());
        h+='<div class="storia-item" onclick="apriStoriaEncoded(this)" data-g="'+encodeURIComponent(JSON.stringify(g))+'"><div class="storia-ring"><div class="storia-inner" style="overflow:hidden;font-size:18px;font-weight:800;color:var(--brand)">'+av+'</div></div><div class="storia-label">'+esc(nome.split(" ")[0])+'</div></div>';
      });
    }
    h+='</div></div>';

    // Filtri
    var filtri=[{s:"tutti",i:"🏠",l:"Feed"},{s:"esperienze",i:"📷",l:"Momenti"},{s:"ricette",i:"🍕",l:"Ricette"},{s:"recensioni",i:"⭐",l:"Recensioni"},{s:"offerte",i:"🎁",l:"Offerte"},{s:"lavoro",i:"💼",l:"Lavoro"}];
    h+='<div class="filtri-wrap"><div class="filtri-strip">';
    filtri.forEach(function(f){h+='<button class="filtro-btn'+(filtroAttivo===f.s?" active":"")+'" onclick="setFiltro(\''+f.s+'\')">'+f.i+' '+f.l+'</button>';});
    h+='</div></div>';

    if(!posts||posts.length===0){
      h+='<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-title">Nessun contenuto</div><div class="empty-sub">Sii il primo a pubblicare!</div><button class="empty-btn" onclick="apriPubblica()">Pubblica ora</button></div>';
    } else {
      posts.forEach(function(p){
        var autore=p.nome_completo||"Anonimo";
        var locale=p.nome_locale||"";
        var miaR=myReaz[p.id]||null;
        var totR=(p.reaz_fuoco||0)+(p.reaz_applauso||0)+(p.reaz_cuore||0);
        var emj=[]; if(p.reaz_fuoco>0)emj.push("😍"); if(p.reaz_applauso>0)emj.push("👏"); if(p.reaz_cuore>0)emj.push("🔥");
        var cat=p.categoria||"esperienze";
        var isMine=ME&&p.user_id===ME.id;

        h+='<div class="feed-post" id="post-'+p.id+'">';

        // Header post
        h+='<div class="post-header">';
        h+='<div class="post-avatar">'+esc(autore.charAt(0).toUpperCase())+'</div>';
        h+='<div class="post-meta"><div class="post-nome">'+esc(autore)+'</div>';
        h+='<div class="post-sub">'+formatData(p.created_at);
        if(locale) h+=' · <span class="badge badge-locale">📍 '+esc(locale)+'</span>';
        if(p.tipo_utente==="titolare") h+=' <span class="badge badge-titolare">🏛 Titolare</span>';
        h+='</div></div>';
        // Tre puntini solo su propri post
        if(isMine) h+='<div onclick="apriPostMenu(event,\''+p.id+'\')" style="font-size:20px;color:var(--text-3);cursor:pointer;padding:4px 8px;line-height:1">···</div>';
        h+='</div>';

        // Contenuto
        if(p.testo&&p.testo.trim()!==" ") h+='<div class="post-testo">'+esc(p.testo)+'</div>';
        if(p.media_url) h+='<img class="post-img" src="'+esc(p.media_url)+'" loading="lazy"/>';
        if(cat==="recensioni"&&p.voto) h+='<div class="stelle-wrap">'+stelleHTML(p.voto)+'<span class="badge badge-verificato">✓ Verificata</span></div>';

        // Contatori reazioni
        h+='<div class="post-counts"><div class="counts-left">';
        if(emj.length>0){h+='<div class="counts-emojis">';emj.forEach(function(e){h+='<span>'+e+'</span>';});h+='</div>'+totR;}
        h+='</div><div class="counts-right" id="cmtcount-'+p.id+'" onclick="toggleCommenti('+p.id+')"></div></div>';

        // AZIONI: emoji a sx (tendina) + commenta a dx
        h+='<div class="post-actions">';
        // Bottone reazioni a tendina — lato sx
                        h+='<div id="act-reaz-'+p.id+'" style="position:relative;display:inline-flex">';
        var _reazIcon=miaR||"❤️";
        h+='<button class="action-btn'+(miaR?" liked":"")+'" onclick="toggleReazMenu(\''+p.id+'\',event)" style="font-size:20px;padding:8px 10px;min-width:0">'+_reazIcon+'</button>';
        h+='</div>';
        // Bottone commenta — lato dx
        h+='<button class="action-btn" onclick="toggleCommenti('+p.id+')" style="margin-left:auto"><span class="act-icon">💬</span> Commenta</button>';
        h+='</div>';

        // Sezione commenti
        h+='<div class="commenti-list" id="cmtlist-'+p.id+'">';
        h+='<div id="cmtitems-'+p.id+'" style="padding-top:8px"></div>';
        h+='<div class="commento-input-row"><div class="commento-av">'+(ME&&ME.user_metadata&&ME.user_metadata.nome_completo?ME.user_metadata.nome_completo.charAt(0).toUpperCase():"?")+'</div>';
        h+='<input class="commento-input" id="cmtinput-'+p.id+'" type="text" placeholder="Commenta..." onkeydown="if(event.key===\'Enter\')inviaCommento('+p.id+')"/>';
        h+='<button class="commento-send-btn" onclick="inviaCommento('+p.id+')">▶</button></div>';
        h+='</div>';

        h+='</div>'; // fine feed-post
      });
    }
    h+='</div>';
    c.innerHTML=h;

    // Carica conteggi commenti
    if(posts&&posts.length>0){
      posts.forEach(async function(p){
        var{count}=await supa.from("social_commenti").select("*",{count:"exact",head:true}).eq("post_id",p.id);
        var el=document.getElementById("cmtcount-"+p.id);
        if(el&&count>0) el.textContent=count+" commenti";
      });
    }
  };

  // ── RICETTE ───────────────────────────────────────────────────────────────────
  window.renderRicette = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var{data:ricette}=await supa.from("v_social_feed").select("*").eq("categoria","ricette").eq("visibile",true).order("created_at",{ascending:false}).limit(40);
    var h='<div class="pb-nav"><div style="padding:16px 16px 12px"><div style="font-size:22px;font-weight:900">Ricette 🍕</div></div>';
    h+='<div style="padding:0 12px 10px"><input style="width:100%;padding:11px 16px;border:1.5px solid var(--border);border-radius:999px;font-size:14px;background:var(--surface);outline:none;font-family:inherit" placeholder="Cerca ricetta..."/></div>';
    if(!ricette||ricette.length===0){
      h+='<div class="empty-state"><div class="empty-icon">🍕</div><div class="empty-title">Nessuna ricetta</div><button class="empty-btn" onclick="apriPubblica(\'ricetta\')">Pubblica ricetta</button></div>';
    } else {
      h+='<div class="ricette-grid">';
      ricette.forEach(function(r){
        var titolo=r.testo?r.testo.split("\n")[0].substring(0,40):"Ricetta";
        h+='<div class="ricetta-card">';
        if(r.media_url) h+='<img class="ricetta-img" src="'+esc(r.media_url)+'" loading="lazy" style="display:block"/>';
        else h+='<div class="ricetta-img">🍷</div>';
        h+='<div class="ricetta-body"><div class="ricetta-nome">'+esc(titolo)+'</div><div class="ricetta-meta">di '+(r.nome_completo||"Anonimo")+'</div></div></div>';
      });
      h+='</div>';
    }
    h+='</div>';
    c.innerHTML=h;
  };

})();
