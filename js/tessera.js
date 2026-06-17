// js/tessera.js — fidelity multi-locale + punti globali Ristoflow
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderTessera = function(c){
    if(!window._ME){window.showAuth();return;}
    c.innerHTML='<div class="pb-nav" id="tessera-wrap"><div style="padding:16px 16px 8px"><div style="font-size:22px;font-weight:900">🎟️ Le mie Tessere</div></div><div id="tessera-content"><div class="page-loader"><div class="spinner"></div></div></div></div>';
    caricaTessere();
  };

  async function caricaTessere(){
    var el=document.getElementById("tessera-content"); if(!el) return;
    var ME=window._ME;

    // Carica profilo globale + tessere per locale
    var [{data:profilo},{data:tessere}] = await Promise.all([
      supa.from("clienti_profilo").select("*").eq("user_id",ME.id).maybeSingle(),
      supa.from("fidelity_tessere")
        .select("id,azienda_id,punti_locali,visite,importo_speso,livello,attiva,aziende(nome,logo_url,tipo_locale,tipo_cucina)")
        .eq("rfbook_user_id",ME.id).eq("attiva",true)
    ]);

    var ptGlobali=((profilo?.punti_totali||0)+(profilo?.punti_social||0));
    var nome=(ME.user_metadata?.nome_completo)||"Cliente";
    var livGlobale=ptGlobali>=10000?"Platinum":ptGlobali>=5000?"Oro":ptGlobali>=2000?"Argento":"Bronzo";
    var livIco={"Bronzo":"🥉","Argento":"🥈","Oro":"🥇","Platinum":"💎"}[livGlobale]||"🥉";
    var nextLiv=ptGlobali>=10000?20000:ptGlobali>=5000?10000:ptGlobali>=2000?5000:2000;
    var nextNome=ptGlobali>=10000?"Diamond":ptGlobali>=5000?"Platinum":ptGlobali>=2000?"Oro":"Argento";
    var pct=Math.min(100,Math.round((ptGlobali/nextLiv)*100));
    var fmt=function(n){return (n||0).toLocaleString("it-IT");};

    var h='';

    // ── TESSERA GLOBALE RISTOFLOW ────────────────────────────────────────────────
    h+='<div style="margin:0 16px 20px">';
    h+='<div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Tessera Globale Ristoflow</div>';
    h+='<div style="background:linear-gradient(135deg,#0a3f57 0%,#0E5A7A 50%,#1a8fb5 100%);border-radius:20px;padding:24px;color:#fff;box-shadow:0 8px 32px rgba(14,90,122,.35);position:relative;overflow:hidden">';
    h+='<div style="position:absolute;top:-30px;right:-30px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.05)"></div>';
    h+='<div style="position:absolute;bottom:-20px;left:-20px;width:100px;height:100px;border-radius:50%;background:rgba(0,200,150,.08)"></div>';
    h+='<div style="font-size:10px;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">Rete Ristoflow</div>';
    h+='<div style="font-size:19px;font-weight:900;margin-bottom:16px">'+esc(nome)+'</div>';
    h+='<div style="display:flex;align-items:flex-end;justify-content:space-between">';
    h+='<div><div style="font-size:10px;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.06em">Livello</div>';
    h+='<div style="font-size:26px;font-weight:900;line-height:1.1">'+livIco+' '+livGlobale+'</div></div>';
    h+='<div style="text-align:right"><div style="font-size:10px;opacity:.6">Punti globali</div>';
    h+='<div style="font-size:34px;font-weight:900;line-height:1">'+fmt(ptGlobali)+'</div></div>';
    h+='</div></div>';

    // Barra progresso
    h+='<div style="background:#fff;border-radius:14px;padding:14px;margin-top:10px;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
    h+='<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px"><span>'+livIco+' '+livGlobale+'</span><span>'+fmt(ptGlobali)+' / '+fmt(nextLiv)+'</span></div>';
    h+='<div style="background:#f0f6fa;border-radius:999px;height:8px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,#0E5A7A,#00c896);border-radius:999px;width:'+pct+'%;transition:width .6s ease"></div></div>';
    h+='<div style="font-size:11px;color:#94a3b8;margin-top:5px;text-align:center">'+fmt(Math.max(0,nextLiv-ptGlobali))+' punti per raggiungere '+nextNome+'</div>';
    h+='</div>';

    // Come guadagnare punti globali
    h+='<div style="background:#fff;border-radius:14px;padding:14px;margin-top:10px;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
    h+='<div style="font-size:13px;font-weight:800;margin-bottom:10px">⭐ Come guadagni punti globali</div>';
    [["📷","+30","Pubblica un momento"],["⏰","+50","Pubblica una storia"],["🍕","+80","Condividi una ricetta"],["⭐","+100","Scrivi una recensione verificata"],["📅","+50","Effettua una prenotazione"],["👥","+150","Porta un amico"]].forEach(function(m){
      h+='<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0f6fa">';
      h+='<span style="font-size:18px;width:28px;text-align:center">'+m[0]+'</span>';
      h+='<span style="flex:1;font-size:13px;font-weight:600;color:#374151">'+m[2]+'</span>';
      h+='<span style="background:#e8f4f8;color:#0E5A7A;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:800">'+m[1]+' pt</span>';
      h+='</div>';
    });
    h+='</div></div>';

    // ── TESSERE LOCALI ───────────────────────────────────────────────────────────
    h+='<div style="margin:0 16px 20px">';
    h+='<div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Tessere Locali</div>';

    if(!tessere||tessere.length===0){
      h+='<div style="background:#fff;border-radius:14px;padding:24px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.05)">';
      h+='<div style="font-size:36px;margin-bottom:8px">🏛️</div>';
      h+='<div style="font-size:15px;font-weight:700;margin-bottom:6px">Nessuna tessera locale ancora</div>';
      h+='<div style="font-size:13px;color:#64748b;line-height:1.5;margin-bottom:16px">Prenota un tavolo in un locale Ristoflow per ottenere la tua tessera fidelity</div>';
      h+='<button onclick="navTo(\'locali\')" style="background:var(--brand);color:#fff;border:none;border-radius:999px;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer">🏛️ Scopri i locali</button>';
      h+='</div>';
    } else {
      tessere.forEach(function(t){
        var az=t.aziende||{};
        var nomeAz=az.nome||"Locale";
        var livLoc=t.livello||"Bronzo";
        var livLocIco={"Bronzo":"🥉","Argento":"🥈","Oro":"🥇","Platinum":"💎"}[livLoc]||"🥉";
        var pLocali=t.punti_locali||0;
        var visite=t.visite||0;
        var speso=parseFloat(t.importo_speso||0);
        var tipi=(az.tipo_cucina||[]).slice(0,2).join(" · ");

        h+='<div style="background:#fff;border-radius:16px;margin-bottom:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)">';

        // Header tessera locale
        h+='<div style="background:linear-gradient(135deg,#1a3a4a,#0E5A7A);padding:18px 18px 14px;color:#fff;position:relative">';
        if(az.logo_url) h+='<img src="'+esc(az.logo_url)+'" style="position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:10px;object-fit:cover;border:2px solid rgba(255,255,255,.3)"/>';
        h+='<div style="font-size:10px;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Tessera Fedeltà</div>';
        h+='<div style="font-size:17px;font-weight:900;margin-bottom:2px">'+esc(nomeAz)+'</div>';
        if(tipi) h+='<div style="font-size:11px;opacity:.7">'+esc(tipi)+'</div>';
        h+='<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:14px">';
        h+='<div><div style="font-size:10px;opacity:.6;text-transform:uppercase">Livello</div><div style="font-size:18px;font-weight:900">'+livLocIco+' '+livLoc+'</div></div>';
        h+='<div style="text-align:right"><div style="font-size:10px;opacity:.6">Punti locale</div><div style="font-size:28px;font-weight:900;line-height:1">'+fmt(pLocali)+'</div></div>';
        h+='</div></div>';

        // Stats tessera
        h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #f0f6fa">';
        [["📅",visite,"Visite"],["💶","€"+speso.toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0}),"Speso"],["🎟️",fmt(pLocali),"Punti"]].forEach(function(s){
          h+='<div style="padding:12px;text-align:center;border-right:1px solid #f0f6fa"><div style="font-size:16px">'+s[0]+'</div><div style="font-size:16px;font-weight:800;color:#0E5A7A">'+s[1]+'</div><div style="font-size:10px;color:#94a3b8;font-weight:600">'+s[2]+'</div></div>';
        });
        h+='</div>';

        // QR code e azioni
        h+='<div style="padding:14px;display:flex;gap:10px">';
        h+='<button onclick="apriSchedaLocale(\''+esc(t.azienda_id)+'\')" style="flex:1;padding:10px;background:#f0f6fa;color:#0E5A7A;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">🏛️ Vai al locale</button>';
        h+='<button onclick="mostraQR(\''+esc(t.id)+'\')" style="flex:1;padding:10px;background:var(--brand);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">📱 Mostra QR</button>';
        h+='</div></div>';
      });
    }
    h+='</div>';

    // ── NOTE INFORMATIVE ────────────────────────────────────────────────────────
    h+='<div style="margin:0 16px 32px;background:#f0fdf4;border-radius:14px;padding:16px;border:1px solid #bbf7d0">';
    h+='<div style="font-size:13px;font-weight:800;color:#15803d;margin-bottom:8px">ℹ️ Come funzionano i punti</div>';
    h+='<div style="font-size:12px;color:#166534;line-height:1.7">';
    h+='<b>Punti locale</b> — accumulati visitando un locale specifico. Spendibili solo in quel locale per sconti e premi del locale.<br>';
    h+='<b>Punti globali Ristoflow</b> — somma di tutto (visite + social). Sbloccano i premi Ristoflow.<br>';
    h+='I punti scadono dopo 18 mesi di inattività.';
    h+='</div></div>';

    el.innerHTML=h;
  }

  // ── QR CODE TESSERA ──────────────────────────────────────────────────────────
  window.mostraQR = async function(tesseraId){
    var{data:t}=await supa.from("fidelity_tessere").select("qr_token,aziende(nome)").eq("id",tesseraId).single();
    if(!t) return;
    var sheet=document.getElementById("modal-sheet");
    document.getElementById("modal-pubblica").classList.add("open");
    sheet.innerHTML='<div class="modal-handle"></div>'+
      '<div class="modal-title" style="text-align:center">📱 '+esc(t.aziende?.nome||"Tessera")+'</div>'+
      '<div style="text-align:center;padding:20px 0">';

    // QR code via qrcodejs CDN
    var qrDiv=document.createElement("div"); qrDiv.id="qr-tessera"; qrDiv.style.cssText="display:inline-block;padding:16px;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.1)";
    sheet.appendChild(qrDiv);

    var qrUrl="https://ristoflow-ai.com/fidelity?token="+encodeURIComponent(t.qr_token||tesseraId);

    // Carica qrcode.js se non presente
    if(!window.QRCode){
      var s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.onload=function(){
        new window.QRCode(document.getElementById("qr-tessera"),{text:qrUrl,width:200,height:200,colorDark:"#0E5A7A",colorLight:"#fff"});
      };
      document.head.appendChild(s);
    } else {
      new window.QRCode(document.getElementById("qr-tessera"),{text:qrUrl,width:200,height:200,colorDark:"#0E5A7A",colorLight:"#fff"});
    }

    var info=document.createElement("div"); info.style.cssText="font-size:12px;color:#64748b;margin-top:16px;padding:0 20px;text-align:center;line-height:1.5";
    info.textContent="Mostra questo QR al locale per accumulare punti o riscattare premi";
    sheet.appendChild(info);

    var close=document.createElement("button"); close.className="pub-btn"; close.textContent="Chiudi"; close.style.marginTop="16px";
    close.onclick=function(){document.getElementById("modal-pubblica").classList.remove("open");};
    sheet.appendChild(close);
  };

})();
