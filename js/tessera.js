// js/tessera.js — fidelity card, punti, premi
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderTessera = function(c){
    if(!window._ME){window.showAuth();return;}
    c.innerHTML='<div class="pb-nav"><div style="padding:16px 16px 8px"><div style="font-size:22px;font-weight:900">🎟️ Tessera Fidelity</div></div><div id="tessera-content"><div class="page-loader"><div class="spinner"></div></div></div></div>';
    caricaTessera();
  };

  async function caricaTessera(){
    var el=document.getElementById("tessera-content"); if(!el) return;
    var ME=window._ME;
    var {data:profilo}=await supa.from("clienti_profilo").select("*").eq("user_id",ME.id).maybeSingle();
    var ptSocial=(profilo&&profilo.punti_social)||0;
    var ptVisite=(profilo&&profilo.punti_totali)||0;
    var ptGlobali=ptSocial+ptVisite;
    var nome=(ME&&ME.user_metadata&&ME.user_metadata.nome_completo)||"Cliente";
    var livello="Bronzo",nextLiv=2000,nextNome="Argento";
    if(ptGlobali>=10000){livello="Platinum";nextLiv=20000;nextNome="Diamond";}
    else if(ptGlobali>=5000){livello="Oro";nextLiv=10000;nextNome="Platinum";}
    else if(ptGlobali>=2000){livello="Argento";nextLiv=5000;nextNome="Oro";}
    var livIco={"Bronzo":"🥉","Argento":"🥈","Oro":"🥇","Platinum":"💎","Diamond":"💎"}[livello]||"";
    var pct=Math.min(100,Math.round((ptGlobali/nextLiv)*100));
    var fmt=function(n){return n.toLocaleString("it-IT");};

    var h='';
    // CARD
    h+='<div style="background:linear-gradient(135deg,#0a3f57,#0E5A7A,#1a8fb5);margin:0 16px;border-radius:24px;padding:28px 24px;color:#fff;box-shadow:0 8px 32px rgba(14,90,122,.4)">';
    h+='<div style="font-size:11px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Rete Ristoflow</div>';
    h+='<div style="font-size:20px;font-weight:900;margin-bottom:20px">'+esc(nome)+'</div>';
    h+='<div style="display:flex;align-items:flex-end;justify-content:space-between">';
    h+='<div><div style="font-size:11px;font-weight:700;opacity:.7;text-transform:uppercase">Livello</div><div style="font-size:28px;font-weight:900;line-height:1.1">'+livIco+' '+livello+'</div></div>';
    h+='<div style="text-align:right"><div style="font-size:11px;opacity:.7">Punti globali</div><div style="font-size:32px;font-weight:900">'+fmt(ptGlobali)+'</div></div>';
    h+='</div></div>';

    // BARRA
    h+='<div style="margin:12px 16px 0;background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
    h+='<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:8px"><span>'+livIco+' '+livello+'</span><span>'+fmt(ptGlobali)+' / '+fmt(nextLiv)+'</span></div>';
    h+='<div style="background:#f0f6fa;border-radius:999px;height:10px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,#0E5A7A,#00c896);border-radius:999px;width:'+pct+'%"></div></div>';
    h+='<div style="font-size:12px;color:#94a3b8;margin-top:6px;text-align:center">Ancora '+fmt(Math.max(0,nextLiv-ptGlobali))+' punti per '+nextNome+'</div></div>';

    // COME GUADAGNARE
    h+='<div style="margin:12px 16px 0;background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
    h+='<div style="font-size:14px;font-weight:800;margin-bottom:12px">⭐ Come guadagnare punti</div>';
    [["📷","Pubblica un momento","+30"],["⏰","Pubblica una storia","+50"],["🍕","Condividi una ricetta","+80"],["⭐","Scrivi una recensione","+100"],["👥","Porta un amico","+150"],["📍","Visita un locale partner","+200"]].forEach(function(m){
      h+='<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f0f6fa"><span style="font-size:22px;width:32px;text-align:center">'+m[0]+'</span><span style="flex:1;font-size:13px;font-weight:600">'+m[1]+'</span><span style="background:#e8f4f8;color:#0E5A7A;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:800">'+m[2]+' pt</span></div>';
    });
    h+='</div>';

    // PREMI
    h+='<div style="margin:12px 16px 32px;background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
    h+='<div style="font-size:14px;font-weight:800;margin-bottom:4px">🌟 Premi Esclusivi Ristoflow</div>';
    h+='<div style="font-size:12px;color:var(--text-3);margin-bottom:16px">Riscattabili con i tuoi punti globali</div>';
    var premi=[
      {i:"☕",n:"Aperitivo per 2",d:"Aperitivo completo in un locale Ristoflow partner",s:800},
      {i:"🍽️",n:"Cena degustazione",d:"Menù degustazione per 2 in un ristorante Ristoflow",s:2500},
      {i:"🍷",n:"Corso Sommelier AIS L1",d:"Corso ufficiale AIS di avvicinamento al vino",s:5000},
      {i:"🍷",n:"Corso Sommelier AIS L2",d:"Corso AIS avanzato di analisi sensoriale",s:9000},
      {i:"🍕",n:"Corso professionale di cucina",d:"Corso intensivo presso una scuola partner",s:8000},
      {i:"✈️",n:"Weekend gastronomico",d:"2 notti + cena stellata per 2 in Italia",s:15000},
      {i:"🏛️",n:"Volo + soggiorno",d:"Volo A/R + 3 notti in una destinazione europea",s:25000}
    ];
    premi.forEach(function(p){
      var ok=ptGlobali>=p.s;
      h+='<div style="display:flex;align-items:flex-start;gap:14px;background:#fff;border-radius:16px;padding:14px;margin-bottom:8px;border-left:3px solid '+(ok?"#16a34a":"#e5e7eb")+';box-shadow:0 2px 8px rgba(0,0,0,.04)">';
      h+='<div style="font-size:32px;flex-shrink:0;width:44px;text-align:center">'+p.i+'</div>';
      h+='<div><div style="font-size:14px;font-weight:800">'+p.n+'</div><div style="font-size:12px;color:var(--text-2);margin-top:2px;line-height:1.4">'+p.d+'</div>';
      h+='<div style="font-size:12px;font-weight:700;color:var(--brand);margin-top:5px">'+fmt(p.s)+' punti globali</div>';
      h+='<div style="font-size:11px;font-weight:800;border-radius:999px;padding:3px 10px;margin-top:7px;display:inline-block;'+(ok?"background:#dcfce7;color:#16a34a":"background:#f3f4f6;color:#6b7280")+'">'+(ok?"✓ Riscattabile ora":"Mancano "+fmt(p.s-ptGlobali)+" pt")+'</div>';
      h+='</div></div>';
    });
    h+='<div style="margin-top:12px;font-size:12px;color:#94a3b8;text-align:center">Per riscattare: <a href="mailto:premi@ristoflow-ai.com" style="color:#0E5A7A;font-weight:700">premi@ristoflow-ai.com</a></div>';
    h+='</div>';

    el.innerHTML=h;
  }
})();
