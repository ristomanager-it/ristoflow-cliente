// js/booking.js — prenotazione con booking_form configurato
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  var GIORNI = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

  // Genera slot orari da un range (es. 12:00-14:30 ogni 30 min)
  function generaSlot(start, end){
    var slots = [];
    var [sh,sm] = start.split(":").map(Number);
    var [eh,em] = end.split(":").map(Number);
    var cur = sh*60+sm;
    var fine = eh*60+em;
    while(cur < fine){
      var h = String(Math.floor(cur/60)).padStart(2,"0");
      var m = String(cur%60).padStart(2,"0");
      slots.push(h+":"+m);
      cur += 30;
    }
    return slots;
  }

  // Genera tutti gli slot disponibili dai range orari configurati
  function tuttiSlot(orari){
    var slots = [];
    (orari||[]).forEach(function(o){ generaSlot(o.start, o.end).forEach(function(s){slots.push(s);}); });
    return slots;
  }

  // Controlla se una data è nel giorno disponibile (giorni = array [0-6] dove 1=Lun)
  function giornoDisponibile(dateStr, giorni){
    if(!giorni||!giorni.length) return true;
    var d = new Date(dateStr);
    return giorni.includes(d.getDay());
  }

  window.renderPrenota = async function(c){
    if(!window._ME){window.showAuth();return;}
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var{data:sedi}=await supa.from("sedi").select("id,nome,indirizzo,citta,azienda_id").eq("attiva",true).order("nome");
    var wrap=document.createElement("div"); wrap.className="pb-nav";
    var hdr=document.createElement("div"); hdr.style.cssText="padding:16px 16px 8px";
    hdr.innerHTML='<div style="font-size:22px;font-weight:900">📅 Prenota un tavolo</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">Scegli il locale</div>';
    wrap.appendChild(hdr);
    if(!sedi||sedi.length===0){
      var em=document.createElement("div"); em.className="empty-state";
      em.innerHTML='<div class="empty-icon">📅</div><div class="empty-title">Nessun locale disponibile</div>';
      wrap.appendChild(em);
    } else {
      sedi.forEach(function(s){
        var card=document.createElement("div"); card.className="locale-card"; card.style.cursor="pointer";
        var body=document.createElement("div"); body.className="locale-card-body"; body.style.padding="20px";
        var nome=document.createElement("div"); nome.className="locale-card-nome"; nome.textContent=s.nome||"";
        var ind=document.createElement("div"); ind.className="locale-card-tipo"; ind.textContent=(s.indirizzo||"")+(s.citta?" · "+s.citta:"");
        var btn=document.createElement("div"); btn.style.marginTop="12px";
        btn.innerHTML='<span style="background:var(--brand);color:#fff;border-radius:999px;padding:6px 16px;font-size:13px;font-weight:700">📅 Prenota ora</span>';
        body.appendChild(nome); body.appendChild(ind); body.appendChild(btn); card.appendChild(body);
        card.addEventListener("click",(function(id,n,az){return function(){window.apriFormPrenotazione(id,n,az);};})(s.id,s.nome,s.azienda_id));
        wrap.appendChild(card);
      });
    }
    c.innerHTML=""; c.appendChild(wrap);
  };

  window.apriFormPrenotazione = async function(sedeId, sedeNome, aziendaId){
    // Cerca il booking_form configurato
    var{data:form}=await supa.from("booking_forms")
      .select("id,nome,config")
      .eq("azienda_id", aziendaId||window.AZIENDA)
      .eq("attivo", true)
      .maybeSingle();

    var cfg = form?.config || null;
    var orari = cfg?.availability?.orari || null;
    var giorni = cfg?.availability?.giorni || null;
    var titleText = cfg?.text?.title || "Prenota un tavolo";
    var subtitleText = cfg?.text?.subtitle || sedeNome;
    var hasNote = cfg?.fields?.note !== false;
    var policyText = cfg?.policy?.enabled ? cfg.policy.text : null;
    var bgColor = cfg?.branding?.background_color || "#fff";
    var emoji = cfg?.emoji || "🍽️";

    var oggi = new Date().toISOString().split("T")[0];
    var slots = orari ? tuttiSlot(orari) : ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];

    var nomeV=(window._ME&&window._ME.user_metadata&&window._ME.user_metadata.nome_completo)||"";
    var telV=(window._ME&&window._ME.user_metadata&&window._ME.user_metadata.telefono)||"";

    var sheet=document.getElementById("modal-sheet");
    sheet.innerHTML="";
    sheet.style.background=bgColor;

    // Header form
    var handle=document.createElement("div"); handle.className="modal-handle"; sheet.appendChild(handle);

    var hdr=document.createElement("div"); hdr.style.cssText="text-align:center;margin-bottom:20px";
    hdr.innerHTML='<div style="font-size:36px;margin-bottom:6px">'+emoji+'</div>'+
      '<div style="font-size:18px;font-weight:900;color:var(--text)">'+esc(titleText)+'</div>'+
      (subtitleText?'<div style="font-size:13px;color:var(--text-2);margin-top:4px">'+esc(subtitleText)+'</div>':"");
    sheet.appendChild(hdr);

    // Se ci sono giorni configurati, mostra info
    if(giorni&&giorni.length){
      var giorniLabel=giorni.map(function(g){return GIORNI[g];}).join(", ");
      var info=document.createElement("div");
      info.style.cssText="background:#e8f4f8;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:600;color:#0E5A7A;margin-bottom:14px;text-align:center";
      info.textContent="📅 Aperto: "+giorniLabel;
      sheet.appendChild(info);
    }

    function addLabel(txt){ var l=document.createElement("div");l.style.cssText="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:4px;margin-top:10px";l.textContent=txt;sheet.appendChild(l); }
    function addInput(id,type,ph,v){var i=document.createElement("input");i.className="pub-input";i.id=id;i.type=type||"text";i.placeholder=ph;if(v)i.value=v;sheet.appendChild(i);return i;}

    addLabel("Nome e cognome");
    addInput("pren-nome","text","Mario Rossi",nomeV);
    addLabel("Telefono");
    addInput("pren-tel","tel","+39 333 000 0000",telV);
    addLabel("Data");
    var dateInput=addInput("pren-data","date","");
    dateInput.min=oggi;
    // Disabilita giorni non disponibili
    if(giorni&&giorni.length){
      dateInput.addEventListener("change",function(){
        if(!giornoDisponibile(this.value,giorni)){
          var giorniLabel=giorni.map(function(g){return GIORNI[g];}).join(", ");
          alert("Il locale è aperto solo: "+giorniLabel+"\nScegli un altro giorno.");
          this.value="";
        }
      });
    }

    addLabel("Orario");
    var sel=document.createElement("select"); sel.className="pub-input"; sel.id="pren-ora";
    slots.forEach(function(o){var op=document.createElement("option");op.value=o;op.textContent=o;sel.appendChild(op);});
    sheet.appendChild(sel);

    addLabel("Numero persone");
    var sel2=document.createElement("select"); sel2.className="pub-input"; sel2.id="pren-coperti";
    [1,2,3,4,5,6,7,8,10,12,15,20].forEach(function(n){var op=document.createElement("option");op.value=n;op.textContent=n+(n===1?" persona":" persone");sel2.appendChild(op);});
    sheet.appendChild(sel2);

    if(hasNote){
      addLabel("Note (occasione, intolleranze...)");
      var ta=document.createElement("textarea"); ta.className="pub-textarea"; ta.id="pren-note"; ta.placeholder="Compleanno, intolleranza al glutine..."; ta.style.minHeight="70px"; sheet.appendChild(ta);
    }

    // Campi custom del form
    if(cfg?.fields?.custom&&cfg.fields.custom.length){
      cfg.fields.custom.forEach(function(field){
        addLabel(field.label+(field.required?" *":""));
        if(field.type==="checkbox"&&field.options&&field.options.length){
          field.options.forEach(function(opt){
            var row=document.createElement("label"); row.style.cssText="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:6px;cursor:pointer";
            var cb=document.createElement("input"); cb.type="checkbox"; cb.value=opt; cb.className="pren-custom-cb";
            row.appendChild(cb); row.appendChild(document.createTextNode(opt));
            sheet.appendChild(row);
          });
        }
      });
    }

    // Policy
    if(policyText){
      var pol=document.createElement("div"); pol.style.cssText="background:#f9f9f9;border-radius:10px;padding:12px;font-size:12px;color:#64748b;margin:12px 0;line-height:1.5;border:1px solid #e5e7eb";
      pol.textContent=policyText; sheet.appendChild(pol);
      var polRow=document.createElement("label"); polRow.style.cssText="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:12px;cursor:pointer";
      var polCb=document.createElement("input"); polCb.type="checkbox"; polCb.id="pren-policy";
      polRow.appendChild(polCb); polRow.appendChild(document.createTextNode("Ho letto e accetto le condizioni"));
      sheet.appendChild(polRow);
    }

    var confirmBtn=document.createElement("button"); confirmBtn.className="pub-btn"; confirmBtn.textContent="Conferma prenotazione";
    confirmBtn.addEventListener("click",function(){window.inviaPrenotazione(sedeId,sedeNome,aziendaId,form?.id||null,!!policyText);});
    sheet.appendChild(confirmBtn);

    document.getElementById("modal-pubblica").classList.add("open");
  };

  window.inviaPrenotazione = async function(sedeId, sedeNome, aziendaId, formId, hasPolicy){
    var nome=document.getElementById("pren-nome")?.value?.trim();
    var tel=document.getElementById("pren-tel")?.value?.trim();
    var data=document.getElementById("pren-data")?.value;
    var ora=document.getElementById("pren-ora")?.value;
    var coperti=parseInt(document.getElementById("pren-coperti")?.value||2);
    var note=document.getElementById("pren-note")?.value?.trim()||"";

    if(!nome||!tel||!data||!ora){alert("Compila tutti i campi obbligatori");return;}

    if(hasPolicy){
      var pol=document.getElementById("pren-policy");
      if(!pol||!pol.checked){alert("Devi accettare le condizioni per procedere");return;}
    }

    // Raccoglie campi custom checkbox
    var custom=[];
    document.querySelectorAll(".pren-custom-cb:checked").forEach(function(cb){custom.push(cb.value);});
    if(custom.length) note=(note?note+"\n":"")+custom.join(", ");

    var btn=document.querySelector("#modal-sheet .pub-btn");
    if(btn){btn.textContent="Prenotazione in corso...";btn.disabled=true;}

    var token=(await supa.auth.getSession()).data.session?.access_token;
    var res=await fetch(window.EF_BASE+"/social-prenota",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({
        sede_id:sedeId, sede_nome:sedeNome,
        cliente_nome:nome, cliente_telefono:tel,
        data, ora, coperti, note,
        azienda_id:aziendaId||window.AZIENDA,
        form_id:formId||null,
        rfbook_user_id:window._ME?.id||null
      })
    });

    if(btn){btn.textContent="Conferma prenotazione";btn.disabled=false;}

    if(!res.ok){
      var err=await res.json().catch(function(){return{};});
      alert("Errore: "+(err.error||"sconosciuto")); return;
    }

    var result=await res.json();
    document.getElementById("modal-pubblica").classList.remove("open");
    setTimeout(function(){
      alert("✅ Prenotazione confermata!\n"+sedeNome+"\n"+data+" ore "+ora+"\n"+coperti+" "+(coperti===1?"persona":"persone")+(result.punti_assegnati?"\n\n+"+result.punti_assegnati+" punti guadagnati 🎉":""));
    },200);
  };

})();
