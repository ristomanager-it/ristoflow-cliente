// js/feed.js — feed principale e ricette
(function(){
  var supa = window._supa;
  var myReaz = window._myReaz || (window._myReaz = {});
  var filtroAttivo = "tutti";

  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function formatData(ts){if(!ts)return"";return new Date(ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});}
  function stelleHTML(v){var s="";for(var i=0;i<5;i++)s+=i<v?"⭐":"☆";return s;}

  window.setFiltro = function(s){ filtroAttivo=s; window.navTo("scopri"); };

  window.renderFeed = async function(c){
    c.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    var ME = window._ME;

    var q = supa.from("v_social_feed").select("*").eq("visibile",true).neq("tipo","storia").order("created_at",{ascending:false}).limit(20);
    if(filtroAttivo!=="tutti") q=q.eq("categoria",filtroAttivo);

    var [{data:posts},{data:reaz}] = await Promise.all([
      q,
      ME ? supa.from("social_reactions").select("post_id,emoji").eq("user_id",ME.id) : {data:[]}
    ]);

    if(reaz) reaz.forEach(function(r){myReaz[r.post_id]=r.emoji;});

    var h = '<div class="pb-nav">';

    // Storie strip
    h += '<div class="storie-wrap"><div class="storie-strip">';
    h += '<div class="storia-item" onclick="apriPubblica(\'storia\')"><div class="storia-add-ring"><div class="storia-add-inner">+</div></div><div class="storia-label">La tua</div></div>';
    var {data:storieDB} = await supa.from("v_social_feed")
      .select("id,user_id,nome_completo,avatar_url,media_url,testo,created_at")
      .eq("tipo","storia").eq("visibile",true).gt("scade_at",new Date().toISOString())
      .order("created_at",{ascending:false}).limit(20);
    if(storieDB&&storieDB.length>0){
      var gruppi={};
      storieDB.forEach(function(s){if(!gruppi[s.user_id])gruppi[s.user_id]=[];gruppi[s.user_id].push(s);});
      Object.keys(gruppi).forEach(function(uid){
        var g=gruppi[uid],s=g[0],nome=s.nome_completo||"?";
        var av=s.avatar_url?'<img src="'+esc(s.avatar_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>':esc(nome.charAt(0).toUpperCase());
        h+='<div class="storia-item" onclick="apriStoriaEncoded(this)" data-g="'+encodeURIComponent(JSON.stringify(g))+'"><div class="storia-ring"><div class="storia-inner" style="overflow:hidden;font-size:18px;font-weight:800;color:var(--brand)">'+av+'</div></div><div class="storia-label">'+esc(nome.split(" ")[0])+'</div></div>';
      });
    }
    h += '</div></div>';

    // Filtri
    var filtri=[{s:"tutti",i:"🏠",l:"Feed"},{s:"esperienze",i:"📷",l:"Momenti"},{s:"ricette",i:"🍕",l:"Ricette"},{s:"recensioni",i:"⭐",l:"Recensioni"},{s:"offerte",i:"🎁",l:"Offerte"},{s:"lavoro",i:"💼",l:"Lavoro"}];
    h += '<div class="filtri-wrap"><div class="filtri-strip">';
    filtri.forEach(function(f){h+='<button class="filtro-btn'+(filtroAttivo===f.s?" active":"")+" onclick=\"setFiltro('"+f.s+"')\">"+f.i+' '+f.l+'</button>';});
    h += '</div></div>';

    if(!posts||posts.length===0){
      h += '<div class="empty-state"><div class="empty-icon">🍽️</div><div class="empty-title">Nessun contenuto</div><div class="empty-sub">Sii il primo a pubblicare!</div><button class="empty-btn" onclick="apriPubblica()">Pubblica ora</button></div>';
    } else {
      posts.forEach(function(p){
        var autore=p.nome_completo||"Anonimo", locale=p.nome_locale||"";
        var miaR=myReaz[p.id]||null;
        var totR=(p.reaz_fuoco||0)+(p.reaz_applauso||0)+(p.reaz_cuore||0);
        var emj=[]; if(p.reaz_fuoco>0)emj.push("😍"); if(p.reaz_applauso>0)emj.push("👏"); if(p.reaz_cuore>0)emj.push("🔥");
        var cat=p.categoria||"esperienze";
        var catL={esperienze:"📷 Momento",ricette:"🍕 Ricetta",recensioni:"⭐ Recensione",offerte:"🎁 Offerta",lavoro:"💼 Lavoro"}[cat]||cat;
        h+='<div class="feed-post" id="post-'+p.id+'">';
        h+='<div class="post-header"><div class="post-avatar">'+esc(autore.charAt(0).toUpperCase())+'</div>';
        h+='<div class="post-meta"><div class="post-nome">'+esc(autore)+'</div>';
        h+='<div class="post-sub">'+formatData(p.created_at);
        if(locale) h+=' · <span class="badge badge-locale">📍 '+esc(locale)+'</span>';
        h+=' <span class="badge badge-cat">'+catL+'</span>';
        if(p.tipo_utente==="titolare") h+=' <span class="badge badge-titolare">🏛 Titolare</span>';
        h+='</div></div>';
        h+='<div class="post-dots" data-pid="'+p.id+'" style="font-size:20px;color:var(--text-3);cursor:pointer;padding:4px 8px">···</div>';
        h+='</div>';
        if(p.testo) h+='<div class="post-testo">'+esc(p.testo)+'</div>';
        if(p.media_url) h+='<img class="post-img" src="'+esc(p.media_url)+'" loading="lazy"/>';
        else if(cat==="esperienze") h+='<div class="post-img-placeholder">🍷</div>';
        if(cat==="recensioni"&&p.voto) h+='<div class="stelle-wrap">'+stelleHTML(p.voto)+'<span class="badge badge-verificato">✓ Verificata</span></div>';
        h+='<div class="post-counts"><div class="counts-left">';
        if(emj.length>0){h+='<div class="counts-emojis">';emj.forEach(function(e){h+='<span>'+e+'</span>';});h+='</div>'+totR;}
        h+='</div><div class="counts-right" id="cmtcount-'+p.id+'" onclick="toggleCommenti('+p.id+')"></div></div>';
        h+='<div class="post-actions">';
        h+='<button class="action-btn'+(miaR==="😍"?" liked":"")+" onclick=\"reagisci("+p.id+",\'fuoco\',\'reaz_fuoco\')\"><span class=\"act-icon\">😍</span> Mi piace</button>";
        h+='<button class="action-btn'+(miaR==="👏"?" liked":"")+" onclick=\"reagisci("+p.id+",\'applauso\',\'reaz_applauso\')\"><span class=\"act-icon\">👏</span> Bravo!</button>";
        h+='<button class="action-btn'+(miaR==="🔥"?" liked":"")+" onclick=\"reagisci("+p.id+",\'cuore\',\'reaz_cuore\')\"><span class=\"act-icon\">🔥</span> Top!</button>";
        h+='<button class="action-btn" onclick="toggleCommenti('+p.id+')"><span class="act-icon">💬</span> Commenta</button>';
        h+='</div>';
        h+='<div class="commenti-list" id="cmtlist-'+p.id+'">';
        h+='<div id="cmtitems-'+p.id+'" style="padding-top:8px"><div style="padding:0 14px 8px;font-size:13px;color:var(--text-3)">Caricamento...</div></div>';
        h+='<div class="commento-input-row"><div class="commento-av">'+(window._ME&&window._ME.user_metadata&&window._ME.user_metadata.nome_completo?window._ME.user_metadata.nome_completo.charAt(0).toUpperCase():"?")+'</div>';
        h+='<input class="commento-input" id="cmtinput-'+p.id+'" type="text" placeholder="Commenta..." onkeydown="if(event.key===\'Enter\')inviaCommento('+p.id+')"/>';
        h+='<button class="commento-send-btn" onclick="inviaCommento('+p.id+')">▶</button></div></div></div>';
      });
    }
    h += '</div>';
    c.innerHTML = h;

    // Carica conteggi commenti
    if(posts&&posts.length>0){
      posts.forEach(async function(p){
        var {count} = await supa.from("social_commenti").select("*",{count:"exact",head:true}).eq("post_id",p.id);
        var el = document.getElementById("cmtcount-"+p.id);
        if(el&&count>0) el.textContent = count+" commenti";
      });
    }
  };

  window.reagisci = async function(postId, emojiKey, campo){
    if(!window._ME){window.showAuth();return;}
    var emojiMap = {fuoco:"😍", applauso:"👏", cuore:"🔥"};
    var emoji = emojiMap[emojiKey];
    var prev = myReaz[postId]||null;
    var updBtn = function(id,c,on){var e=document.getElementById("reaz-"+id+"-"+c);if(e)e.classList.toggle("liked",on);};
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

  window.toggleCommenti = async function(postId){
    var list = document.getElementById("cmtlist-"+postId);
    if(!list) return;
    if(list.classList.toggle("open")) await caricaCommenti(postId);
  };

  async function caricaCommenti(postId){
    var items = document.getElementById("cmtitems-"+postId);
    if(!items) return;
    var {data:cc} = await supa.from("social_commenti").select("*,clienti_profilo(nome_completo)").eq("post_id",postId).order("created_at",{ascending:true}).limit(30);
    var cnt = document.getElementById("cmtcount-"+postId);
    if(cnt&&cc) cnt.textContent = cc.length>0?cc.length+" commenti":"";
    if(!cc||cc.length===0){items.innerHTML='<div style="padding:0 14px 8px;font-size:13px;color:var(--text-3)">Nessun commento.</div>';return;}
    var h="";
    cc.forEach(function(c){
      var nome=(c.clienti_profilo&&c.clienti_profilo.nome_completo)||"Anonimo";
      h+='<div class="commento-row"><div class="commento-av">'+esc(nome.charAt(0).toUpperCase())+'</div>';
      h+='<div class="commento-bubble"><div class="commento-nome">'+esc(nome)+'</div><div class="commento-testo">'+esc(c.testo)+'</div><div class="commento-data">'+formatData(c.created_at)+'</div></div></div>';
    });
    items.innerHTML = h;
  }

  window.inviaCommento = async function(postId){
    if(!window._ME){window.showAuth();return;}
    var input = document.getElementById("cmtinput-"+postId);
    var testo = input?input.value.trim():"";
    if(!testo) return;
    input.value = "";
    var {error} = await supa.from("social_commenti").insert({post_id:postId,user_id:window._ME.id,testo});
    if(!error) await caricaCommenti(postId);
  };

  window.renderRicette = async function(c){
    c.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    var {data:ricette} = await supa.from("v_social_feed").select("*").eq("categoria","ricette").eq("visibile",true).order("created_at",{ascending:false}).limit(40);
    var h='<div class="pb-nav"><div style="padding:16px 16px 12px"><div style="font-size:22px;font-weight:900">Ricette 🍕</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">Dai segreti della cucina</div></div>';
    h+='<div style="padding:0 12px 10px"><input style="width:100%;padding:11px 16px;border:1.5px solid var(--border);border-radius:999px;font-size:14px;font-family:inherit;background:var(--surface);outline:none;" placeholder="Cerca ricetta..."/></div>';
    if(!ricette||ricette.length===0){
      h+='<div class="empty-state"><div class="empty-icon">🍕</div><div class="empty-title">Nessuna ricetta ancora</div><button class="empty-btn" onclick="apriPubblica(\'ricetta\')">Pubblica ricetta</button></div>';
    } else {
      h+='<div class="ricette-grid">';
      ricette.forEach(function(r){
        var titolo=r.testo?r.testo.split("\n")[0].substring(0,40):"Ricetta";
        h+='<div class="ricetta-card">';
        if(r.media_url) h+='<img class="ricetta-img" src="'+esc(r.media_url)+'" loading="lazy" style="display:block"/>';
        else h+='<div class="ricetta-img">🍷</div>';
        h+='<div class="ricetta-body"><div class="ricetta-nome">'+esc(titolo)+'</div><div class="ricetta-meta">di '+(r.nome_completo||"Anonimo")+'</div><div class="ricetta-tag">Ricetta</div></div></div>';
      });
      h+='</div>';
    }
    h+='</div>';
    c.innerHTML = h;
  };

})();
