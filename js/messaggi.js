// js/messaggi.js — chat 1:1 realtime
(function(){
  var supa=window._supa;
  var _chatConvId=null,_chatSub=null;
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  window.renderMessaggi = async function(c){
    var ME=window._ME;
    if(!ME){window.showAuth();return;}
    c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    var{data:convs}=await supa.from("messaggi_conversazioni").select("id,partecipante_1,partecipante_2,ultimo_messaggio,ultimo_messaggio_at").or("partecipante_1.eq."+ME.id+",partecipante_2.eq."+ME.id).order("ultimo_messaggio_at",{ascending:false});
    var altriIds=(convs||[]).map(function(c){return c.partecipante_1===ME.id?c.partecipante_2:c.partecipante_1;});
    var profiliMap={};
    if(altriIds.length){var{data:pf}=await supa.from("clienti_profilo").select("user_id,nome_completo,avatar_url").in("user_id",altriIds);(pf||[]).forEach(function(p){profiliMap[p.user_id]=p;});}
    var h='<div class="pb-nav"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px"><div style="font-size:22px;font-weight:900">💬 Messaggi</div><button onclick="apriNuovaChat()" style="background:var(--brand);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">+ Nuova</button></div>';
    if(!convs||convs.length===0){
      h+='<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">Nessun messaggio</div><div class="empty-sub">Inizia una conversazione</div></div>';
    } else {
      convs.forEach(function(conv){
        var altroId=conv.partecipante_1===ME.id?conv.partecipante_2:conv.partecipante_1;
        var pr=profiliMap[altroId]||{};
        var nome=pr.nome_completo||"Utente";
        var av=pr.avatar_url?'<img src="'+esc(pr.avatar_url)+'"/>':esc(nome.charAt(0).toUpperCase());
        var ora=conv.ultimo_messaggio_at?new Date(conv.ultimo_messaggio_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):"";
        h+='<div class="msg-conv-item" onclick="apriChat(\''+conv.id+'\',\''+esc(altroId)+'\',\''+esc(nome)+'\')"><div class="msg-conv-av">'+av+'</div><div class="msg-conv-body"><div class="msg-conv-nome">'+esc(nome)+'</div><div class="msg-conv-preview">'+(conv.ultimo_messaggio||"")+'</div></div><div class="msg-conv-time">'+ora+'</div></div>';
      });
    }
    h+='</div>';
    c.innerHTML=h;
  };

  window.apriNuovaChat = async function(){
    var ME=window._ME;
    var{data:utenti}=await supa.from("clienti_profilo").select("user_id,nome_completo").neq("user_id",ME.id).order("nome_completo").limit(60);
    var sheet=document.getElementById("post-menu-sheet");
    var overlay=document.getElementById("post-menu-overlay");
    var items=(utenti||[]).map(function(u){return'<div class="post-menu-item" onclick="avviaChat(\''+esc(u.user_id)+'\',\''+esc(u.nome_completo||"Utente")+'\')">'+esc(u.nome_completo||"Utente")+'</div>';}).join("");
    sheet.innerHTML='<div style="width:40px;height:4px;background:#e5e7eb;border-radius:999px;margin:0 auto 12px"></div><div style="font-size:16px;font-weight:800;margin-bottom:12px">Nuova conversazione</div><input placeholder="Cerca utente..." style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:10px;box-sizing:border-box;outline:none;" oninput="this.nextElementSibling.querySelectorAll(\'.post-menu-item\').forEach(function(el){el.style.display=el.textContent.toLowerCase().includes(this.value.toLowerCase())?\'flex\':\'none\';}.bind(this))"/><div style="max-height:50vh;overflow-y:auto;">'+items+'</div><div class="post-menu-item" onclick="chiudiPostMenu()">Annulla</div>';
    overlay.classList.add("open");
  };

  window.avviaChat = async function(altroId, altroNome){
    window.chiudiPostMenu();
    var ME=window._ME;
    var p1=ME.id<altroId?ME.id:altroId, p2=ME.id<altroId?altroId:ME.id;
    var{data:ex}=await supa.from("messaggi_conversazioni").select("id").eq("partecipante_1",p1).eq("partecipante_2",p2).maybeSingle();
    if(ex){ window.apriChat(ex.id,altroId,altroNome); }
    else {
      var{data:nv}=await supa.from("messaggi_conversazioni").insert({partecipante_1:p1,partecipante_2:p2}).select("id").single();
      if(nv) window.apriChat(nv.id,altroId,altroNome);
    }
  };

  window.apriChat = async function(convId, altroId, altroNome){
    _chatConvId=convId;
    document.getElementById("chat-nome-el").textContent=altroNome||"Chat";
    document.getElementById("chat-messages-el").innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
    document.getElementById("chat-screen").classList.add("open");
    await caricaMsg();
    if(_chatSub) supa.removeChannel(_chatSub);
    _chatSub=supa.channel("chat"+convId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messaggi",filter:"conversazione_id=eq."+convId},caricaMsg).subscribe();
  };

  async function caricaMsg(){
    if(!_chatConvId) return;
    var ME=window._ME;
    var{data:msgs}=await supa.from("messaggi").select("*").eq("conversazione_id",_chatConvId).order("created_at",{ascending:true}).limit(100);
    var el=document.getElementById("chat-messages-el"); if(!el) return;
    if(!msgs||msgs.length===0){el.innerHTML='<div style="text-align:center;padding:32px;color:#9ca3af;font-size:14px">Nessun messaggio. Dì ciao!</div>';return;}
    el.innerHTML=msgs.map(function(m){
      var out=m.mittente_id===ME.id;
      var ora=new Date(m.created_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
      return '<div class="msg-bubble '+(out?"out":"in")+'">'+esc(m.testo||"")+'<div class="msg-time">'+ora+'</div></div>';
    }).join("");
    el.scrollTop=el.scrollHeight;
  }

  window.chiudiChat = function(){
    if(_chatSub) supa.removeChannel(_chatSub);
    _chatSub=null; _chatConvId=null;
    document.getElementById("chat-screen").classList.remove("open");
  };

  window.inviaChatMsg = async function(){
    var ME=window._ME; if(!ME||!_chatConvId) return;
    var inp=document.getElementById("chat-input-el");
    var testo=inp.value.trim(); if(!testo) return;
    inp.value=""; inp.style.height="auto";
    await supa.from("messaggi").insert({conversazione_id:_chatConvId,mittente_id:ME.id,testo});
    await supa.from("messaggi_conversazioni").update({ultimo_messaggio:testo,ultimo_messaggio_at:new Date().toISOString()}).eq("id",_chatConvId);
    await caricaMsg();
  };
})();
