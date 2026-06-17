// js/booking.js — prenotazione tavolo via Edge Function
(function(){
  var supa = window._supa;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderPrenota = async function(c){
    if(!window._ME){window.showAuth();return;}
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var {data:sedi}=await supa.from("sedi").select("id,nome,indirizzo,citta").eq("azienda_id",window.AZIENDA).eq("attiva",true).order("nome");
    var wrap=document.createElement("div"); wrap.className="pb-nav";
    var hdr=document.createElement("div"); hdr.style.cssText="padding:16px 16px 8px";
    hdr.innerHTML='<div style="font-size:22px;font-weight:900">📅 Prenota un tavolo</div><div style="font-size:13px;color:var(--text-2);margin-top:4px">Scegli il locale e la data</div>';
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
        card.addEventListener("click",(function(id,n){return function(){window.apriFormPrenotazione(id,n);};})(s.id,s.nome));
        wrap.appendChild(card);
      });
    }
    c.innerHTML=""; c.appendChild(wrap);
  };

  window.apriFormPrenotazione = function(sedeId, sedeNome){
    var oggi=new Date().toISOString().split("T")[0];
    var orari=["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];
    var sheet=document.getElementById("modal-sheet");
    var nomeV=(window._ME&&window._ME.user_metadata&&window._ME.user_metadata.nome_completo)||"";
    var telV=(window._ME&&window._ME.user_metadata&&window._ME.user_metadata.telefono)||"";
    sheet.innerHTML="";
    var handle=document.createElement("div"); handle.className="modal-handle"; sheet.appendChild(handle);
    var title=document.createElement("div"); title.className="modal-title"; title.textContent="📅 "+sedeNome; sheet.appendChild(title);
    function addInput(id,type,ph,v){var i=document.createElement("input");i.className="pub-input";i.id=id;i.type=type||"text";i.placeholder=ph;if(v)i.value=v;sheet.appendChild(i);}
    addInput("pren-nome","text","Nome e cognome",nomeV);
    addInput("pren-tel","tel","Telefono",telV);
    addInput("pren-data","date","Data"); document.getElementById("pren-data").min=oggi;
    var sel=document.createElement("select"); sel.className="pub-input"; sel.id="pren-ora";
    orari.forEach(function(o){var op=document.createElement("option");op.value=o;op.textContent=o;sel.appendChild(op);}); sheet.appendChild(sel);
    var sel2=document.createElement("select"); sel2.className="pub-input"; sel2.id="pren-coperti";
    [1,2,3,4,5,6,7,8].forEach(function(n){var op=document.createElement("option");op.value=n;op.textContent=n+(n===1?" persona":" persone");sel2.appendChild(op);}); sheet.appendChild(sel2);
    var ta=document.createElement("textarea"); ta.className="pub-textarea"; ta.id="pren-note"; ta.placeholder="Note speciali (occasione, intolleranze...)"; ta.style.minHeight="70px"; sheet.appendChild(ta);
    var btn=document.createElement("button"); btn.className="pub-btn"; btn.textContent="Conferma prenotazione";
    btn.addEventListener("click",function(){window.inviaPrenotazione(sedeId,sedeNome);});
    sheet.appendChild(btn);
    document.getElementById("modal-pubblica").classList.add("open");
  };

  window.inviaPrenotazione = async function(sedeId, sedeNome){
    var nome=document.getElementById("pren-nome")?.value?.trim();
    var tel=document.getElementById("pren-tel")?.value?.trim();
    var data=document.getElementById("pren-data")?.value;
    var ora=document.getElementById("pren-ora")?.value;
    var coperti=parseInt(document.getElementById("pren-coperti")?.value||2);
    var note=document.getElementById("pren-note")?.value?.trim();
    if(!nome||!tel||!data){alert("Compila nome, telefono e data");return;}
    var btn=document.querySelector("#modal-sheet .pub-btn");
    if(btn){btn.textContent="Prenotazione...";btn.disabled=true;}

    // Cerca il booking_form configurato per questa sede/azienda
    var{data:sede}=await supa.from("sedi").select("azienda_id").eq("id",sedeId).single();
    var aziendaId=sede?.azienda_id||window.AZIENDA;
    var{data:form}=await supa.from("booking_forms")
      .select("id,nome,config")
      .eq("azienda_id",aziendaId)
      .eq("attivo",true)
      .maybeSingle();

    // Edge Function per prenotazione (crea record + invia WhatsApp conferma)
    var token=(await supa.auth.getSession()).data.session?.access_token;
    var res=await fetch(window.EF_BASE+"/social-prenota",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({
        sede_id:sedeId, sede_nome:sedeNome,
        cliente_nome:nome, cliente_telefono:tel,
        data, ora, coperti, note:note||"",
        azienda_id:aziendaId,
        form_id:form?.id||null,
        rfbook_user_id:window._ME?.id||null
      })
    });

    if(btn){btn.textContent="Conferma prenotazione";btn.disabled=false;}
    if(!res.ok){var err=await res.json().catch(function(){return{};});alert("Errore: "+(err.error||"sconosciuto"));return;}
    document.getElementById("modal-pubblica").classList.remove("open");
    setTimeout(function(){alert("✅ Prenotazione confermata!\n"+sedeNome+"\n"+data+" ore "+ora+"\n"+coperti+" persone\n\nRiceverai conferma WhatsApp.");},200);
  };

})();
