// js/offerte.js — promo e sconti
(function(){
  var supa=window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderOfferte = async function(c){
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var{data:offerte}=await supa.from("network_offerte").select("id,titolo,descrizione,tipo,valore,valida_al,sede_id,sedi(nome)").eq("attiva",true).order("created_at",{ascending:false});
    var wrap=document.createElement("div"); wrap.className="pb-nav";
    var hdr=document.createElement("div"); hdr.style.cssText="padding:16px 16px 8px";
    hdr.innerHTML='<div style="font-size:22px;font-weight:900">🎁 Offerte & Sconti</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">Esclusive per iscritti RistoflowBook</div>';
    wrap.appendChild(hdr);
    if(!offerte||offerte.length===0){
      var em=document.createElement("div"); em.className="empty-state";
      em.innerHTML='<div class="empty-icon">🎁</div><div class="empty-title">Nessuna offerta attiva</div><div class="empty-sub">Le offerte dei locali partner appariranno qui</div>';
      wrap.appendChild(em);
    } else {
      offerte.forEach(function(o){
        var discVal=o.tipo==="percentuale"?("-"+o.valore+"%"):o.tipo==="importo"?("-€"+o.valore):"";
        var sedeName=(o.sedi&&o.sedi.nome)||"";
        var card=document.createElement("div");
        card.style.cssText="background:#fff;border-radius:16px;margin:0 12px 12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)";
        var top=document.createElement("div");
        top.style.cssText="background:linear-gradient(135deg,#0E5A7A,#00c896);padding:20px;color:#fff";
        if(sedeName){var s1=document.createElement("div");s1.style.cssText="font-size:11px;font-weight:700;opacity:.8;text-transform:uppercase";s1.textContent=sedeName;top.appendChild(s1);}
        var h2=document.createElement("div"); h2.style.cssText="font-size:18px;font-weight:900;margin-top:4px"; h2.textContent=o.titolo||""; top.appendChild(h2);
        if(discVal){var disc=document.createElement("div");disc.style.cssText="font-size:32px;font-weight:900;margin-top:6px";disc.textContent=discVal;top.appendChild(disc);}
        var body=document.createElement("div"); body.style.padding="16px";
        if(o.descrizione){var desc=document.createElement("div");desc.style.cssText="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:10px";desc.textContent=o.descrizione;body.appendChild(desc);}
        if(o.valida_al){var scad=document.createElement("div");scad.style.cssText="font-size:12px;color:#94a3b8;margin-bottom:10px";scad.textContent="Valida fino al "+o.valida_al;body.appendChild(scad);}
        var btn=document.createElement("button");
        btn.style.cssText="background:#0E5A7A;color:#fff;border:none;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;width:100%";
        btn.textContent="📅 Prenota e usa l'offerta";
        btn.addEventListener("click",function(){window.navTo("prenota");});
        body.appendChild(btn); card.appendChild(top); card.appendChild(body); wrap.appendChild(card);
      });
    }
    c.innerHTML=""; c.appendChild(wrap);
  };
})();
