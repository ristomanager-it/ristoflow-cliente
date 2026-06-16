// js/cultura.js — ricette, tradizioni, storie della cucina italiana
(function(){
  var supa=window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderCultura = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var{data:items}=await supa.from("rfbook_cultura").select("*").eq("visibile",true).order("created_at",{ascending:false}).limit(30);
    var h='<div class="pb-nav"><div style="padding:16px 16px 8px"><div style="font-size:22px;font-weight:900">🍕 Cultura & Ricette</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">Tradizioni, tecniche e segreti della cucina italiana</div></div>';
    var tipi=[{s:"tutti",l:"Tutto"},{s:"ricetta",l:"🍕 Ricette"},{s:"tradizione",l:"🏛️ Tradizioni"},{s:"tecnica",l:"🔪 Tecniche"},{s:"storia",l:"📚 Storie"}];
    h+='<div class="filtri-wrap"><div class="filtri-strip">';
    tipi.forEach(function(t){h+='<button class="filtro-btn" onclick="filtraCultura(\''+t.s+'\')">'+t.l+'</button>';});
    h+='</div></div>';
    h+='<div id="cultura-grid">';
    if(!items||items.length===0){
      h+='<div class="empty-state"><div class="empty-icon">🍕</div><div class="empty-title">Presto i primi contenuti</div><div class="empty-sub">Ricette, tradizioni e storie della cucina italiana</div></div>';
    } else {
      h+=renderCulturaGrid(items);
    }
    h+='</div></div>';
    c.innerHTML=h;
    window._culturaItems=items||[];
  };

  window.filtraCultura=function(tipo){
    var items=window._culturaItems||[];
    var filtered=tipo==="tutti"?items:items.filter(function(r){return r.tipo===tipo;});
    document.getElementById("cultura-grid").innerHTML=filtered.length?renderCulturaGrid(filtered):'<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nessun contenuto</div></div>';
    document.querySelectorAll(".filtri-strip .filtro-btn").forEach(function(b){b.classList.remove("active");});
    event.target.classList.add("active");
  };

  function renderCulturaGrid(items){
    var ico={ricetta:"🍕",tradizione:"🏛️",tecnica:"🔪",storia:"📚"};
    var h='<div class="ricette-grid">';
    items.forEach(function(r){
      h+='<div class="ricetta-card" onclick="apriContenuto(\''+r.id+'\')">';
      if(r.media_url) h+='<img class="ricetta-img" src="'+esc(r.media_url)+'" loading="lazy"/>';
      else h+='<div class="ricetta-img" style="display:flex;align-items:center;justify-content:center;font-size:48px;background:#f0f6fa">'+(ico[r.tipo]||"🍽️")+'</div>';
      h+='<div class="ricetta-body"><div class="ricetta-nome">'+esc(r.titolo||"")+'</div>';
      if(r.regione) h+='<div class="ricetta-meta">📍 '+esc(r.regione)+'</div>';
      if(r.tempo_min) h+='<div class="ricetta-tag">⏱ '+r.tempo_min+' min</div>';
      h+='</div></div>';
    });
    h+='</div>';
    return h;
  }

  window.apriContenuto=function(id){
    var item=(window._culturaItems||[]).find(function(r){return r.id==id;});
    if(!item) return;
    var c=document.getElementById("page-content");
    var h='<div class="pb-nav">';
    h+='<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);border-bottom:1px solid var(--border)"><button onclick="navTo(\'cultura\')" style="background:none;border:none;font-size:22px;cursor:pointer">←</button><div style="font-size:16px;font-weight:800">'+esc(item.titolo||"")+'</div></div>';
    if(item.media_url) h+='<img src="'+esc(item.media_url)+'" style="width:100%;max-height:280px;object-fit:cover"/>';
    h+='<div style="padding:20px">';
    if(item.regione) h+='<div style="font-size:12px;font-weight:700;color:var(--brand);margin-bottom:8px">📍 '+esc(item.regione)+'</div>';
    h+='<div style="font-size:20px;font-weight:900;margin-bottom:12px">'+esc(item.titolo||"")+'</div>';
    if(item.testo) h+='<div style="font-size:15px;line-height:1.7;color:var(--text-2)">'+esc(item.testo).replace(/\n/g,"<br/>")+'</div>';
    if(item.ingredienti&&typeof item.ingredienti==="object"){
      h+='<div style="font-size:14px;font-weight:800;margin:16px 0 8px">🛒 Ingredienti</div>';
      var ing=Array.isArray(item.ingredienti)?item.ingredienti:Object.values(item.ingredienti);
      h+='<ul style="padding-left:16px;font-size:14px;line-height:2">';
      ing.forEach(function(i){h+='<li>'+esc(String(i))+'</li>';});
      h+='</ul>';
    }
    h+='</div></div>';
    c.innerHTML=h;
  };
})();
