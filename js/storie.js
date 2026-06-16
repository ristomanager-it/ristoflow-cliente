// js/storie.js — editor storie 24h + viewer
(function(){
  var supa = window._supa;
var _seFile=null,_seAudioFile=null;

window.apriEditorStoria=function(){
  var me=window._socialME||null;
  if(!me){if(window.showAuth)window.showAuth();return;}
  _seFile=null;_seAudioFile=null;
  document.getElementById("se-media-wrap").innerHTML='<div class="se-empty-bg">&#127869;&#65039;</div>';
  var ti=document.getElementById("se-text-input");if(ti)ti.value="";
  var to=document.getElementById("se-text-overlay");if(to)to.style.display="none";
  var sb=document.getElementById("se-sticker-bar");if(sb)sb.style.display="none";
  var mb=document.getElementById("se-musica-bar");if(mb)mb.style.display="none";
  var sl=document.getElementById("se-stickers-layer");if(sl)sl.innerHTML="";
  document.getElementById("storia-editor").classList.add("open");
};

window.chiudiEditorStoria=function(){
  document.getElementById("storia-editor").classList.remove("open");
};

window.seToggleText=function(){
  var el=document.getElementById("se-text-overlay");
  el.style.display=el.style.display==="none"?"flex":"none";
  if(el.style.display!=="none"){var t=document.getElementById("se-text-input");if(t)t.focus();}
};

window.seToggleStickerBar=function(){
  var el=document.getElementById("se-sticker-bar");
  el.style.display=el.style.display==="none"?"flex":"none";
};

window.seToggleMusicaBar=function(){
  var el=document.getElementById("se-musica-bar");
  el.style.display=el.style.display==="none"?"block":"none";
};

window.seApriMusicaGalleria=function(){
  document.getElementById("se-audio-input").click();
};

window.seFileSelected=function(input){
  var f=input.files[0];if(!f)return;
  _seFile=f;
  var url=URL.createObjectURL(f);
  var wrap=document.getElementById("se-media-wrap");
  if(f.type.startsWith("video/")){
    wrap.innerHTML='<video src="'+url+'" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"></video>';
  }else{
    wrap.innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover"/>';
  }
};

window.seCaricaMusica=function(input){
  var f=input.files[0];if(!f)return;
  _seAudioFile=f;
  var nome=f.name.replace(/\.[^.]+$/,"").substring(0,30);
  document.getElementById("se-musica-nome").textContent="&#127925; "+nome;
  seAddSticker("&#127925;","musica-"+nome);
  document.getElementById("se-musica-bar").style.display="none";
};

window.seAddSticker=function(emoji,valore){
  var layer=document.getElementById("se-stickers-layer");
  var s=document.createElement("div");
  s.className="se-sticker";
  s.textContent=(emoji+" "+(valore||"")).trim();
  s.style.left="30%";s.style.top="35%";
  // Touch drag
  var ox=0,oy=0,sx=0,sy=0;
  s.addEventListener("touchstart",function(e){
    var t=e.touches[0];ox=t.clientX;oy=t.clientY;
    var r=s.getBoundingClientRect();sx=r.left;sy=r.top;
    s.style.transform="none";s.style.left=sx+"px";s.style.top=sy+"px";
  },{passive:true});
  s.addEventListener("touchmove",function(e){
    var t=e.touches[0];
    s.style.left=(sx+t.clientX-ox)+"px";s.style.top=(sy+t.clientY-oy)+"px";
  },{passive:true});
  var lt=0;
  s.addEventListener("touchend",function(){var n=Date.now();if(n-lt<300)s.remove();lt=n;});
  layer.appendChild(s);
  document.getElementById("se-sticker-bar").style.display="none";
};

window.seAddStickerPrompt=function(emoji,label){
  // Su mobile usa un input nel DOM invece di prompt()
  var existing=document.getElementById("se-inline-input-wrap");
  if(existing)existing.remove();
  var wrap=document.createElement("div");
  wrap.id="se-inline-input-wrap";
  wrap.style.cssText="position:absolute;bottom:160px;left:14px;right:14px;background:rgba(0,0,0,.8);border-radius:14px;padding:14px;z-index:20;";
  wrap.innerHTML='<div style="color:#fff;font-size:13px;font-weight:700;margin-bottom:8px">'+label+'</div>'+
    '<input id="se-inline-inp" style="width:100%;padding:10px;border-radius:8px;border:none;font-size:15px;box-sizing:border-box;outline:none;" placeholder="Scrivi..."/>'+
    '<div style="display:flex;gap:8px;margin-top:10px;">'+
    '<button onclick="seConfInlineInput(\''+emoji+'\')" style="flex:1;padding:10px;background:#0E5A7A;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">Aggiungi</button>'+
    '<button onclick="document.getElementById(\'se-inline-input-wrap\').remove()" style="padding:10px 16px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">Annulla</button>'+
    '</div>';
  document.getElementById("storia-editor").appendChild(wrap);
  setTimeout(function(){var i=document.getElementById("se-inline-inp");if(i)i.focus();},100);
};

window.seConfInlineInput=function(emoji){
  var inp=document.getElementById("se-inline-inp");
  var val=inp?inp.value.trim():"";
  if(val)seAddSticker(emoji,val);
  var w=document.getElementById("se-inline-input-wrap");if(w)w.remove();
};

window.sePublish=async function(){
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var ME=window._socialME;
  if(!ME){alert("Accedi prima");return;}
  var AZIENDA="b331365f-17db-4dda-aa2f-77a09427fe42";
  var testo=(document.getElementById("se-text-input")||{}).value||"";
  testo=testo.trim();
  // Raccoglie sticker
  var stickerTexts=[];
  document.querySelectorAll(".se-sticker").forEach(function(s){
    if(s.textContent.trim())stickerTexts.push(s.textContent.trim());
  });
  if(stickerTexts.length)testo=(testo?testo+"\n\n":"")+stickerTexts.join(" · ");
  if(!testo&&!_seFile){alert("Aggiungi almeno una foto o un testo!");return;}
  var btn=document.querySelector(".se-pubblica-btn");
  if(btn){btn.textContent="Pubblicazione...";btn.disabled=true;}
  var mediaUrl=null;
  if(_seFile){
    var ext=_seFile.name.split(".").pop().toLowerCase();
    var path="stories/"+ME.id+"-"+Date.now()+"."+ext;
    var up=await supa.storage.from("social-media").upload(path,_seFile,{cacheControl:"3600",upsert:false});
    if(up.error){alert("Errore upload: "+up.error.message);if(btn){btn.textContent="&#9200; Pubblica storia";btn.disabled=false;}return;}
    mediaUrl=supa.storage.from("social-media").getPublicUrl(path).data.publicUrl;
  }
  var payload={user_id:ME.id,testo:testo||" ",tipo:"storia",categoria:"esperienze",visibile:true,punti_assegnati:50,azienda_id:AZIENDA,scade_at:new Date(Date.now()+86400000).toISOString()};
  if(mediaUrl)payload.media_url=mediaUrl;
  var{error}=await supa.from("social_post").insert(payload);
  if(error){alert("Errore: "+error.message);if(btn){btn.textContent="&#9200; Pubblica storia";btn.disabled=false;}return;}
  try{await supa.rpc("aggiungi_punti_cliente",{p_user_id:ME.id,p_punti:50,p_motivo:"storia_pubblicata"});}catch(e){}
  chiudiEditorStoria();
  if(btn){btn.textContent="&#9200; Pubblica storia";btn.disabled=false;}
  setTimeout(function(){alert("Storia pubblicata! Visibile per 24 ore.");},200);
};

// ── POST MENU ─────────────────────────────────────────────────────────────────
window.apriPostMenu=function(e,postId){
  e.stopPropagation();
  var sheet=document.getElementById("post-menu-sheet");
  var overlay=document.getElementById("post-menu-overlay");
  sheet.innerHTML='<div style="width:40px;height:4px;background:#e5e7eb;border-radius:999px;margin:0 auto 12px"></div>'+
    '<div class="post-menu-item" onclick="modificaPost(\''+postId+'\')">&#9998; Modifica post</div>'+
    '<div class="post-menu-item danger" onclick="eliminaPost(\''+postId+'\')">&#128465; Elimina post</div>'+
    '<div class="post-menu-item" onclick="chiudiPostMenu()">Annulla</div>';
  overlay.classList.add("open");
};
window.chiudiPostMenu=function(){
  document.getElementById("post-menu-overlay").classList.remove("open");
};
window.eliminaPost=async function(postId){
  var ME=window._socialME;
  if(!ME||!confirm("Eliminare questo post?"))return;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  await supa.from("social_post").delete().eq("id",postId).eq("user_id",ME.id);
  chiudiPostMenu();
  if(window.navTo)window.navTo("scopri");
};
window.modificaPost=async function(postId){
  var ME=window._socialME;if(!ME)return;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var{data:p}=await supa.from("social_post").select("testo").eq("id",postId).eq("user_id",ME.id).maybeSingle();
  if(!p)return;
  var nuovoTesto=prompt("Modifica:",p.testo&&p.testo.trim()!==" "?p.testo:"");
  if(nuovoTesto===null)return;
  await supa.from("social_post").update({testo:nuovoTesto||" "}).eq("id",postId).eq("user_id",ME.id);
  chiudiPostMenu();
  if(window.navTo)window.navTo("scopri");
};

// Event delegation per dots
document.addEventListener("click",function(e){
  var d=e.target.closest(".post-dots");
  if(d&&d.dataset.pid)apriPostMenu(e,d.dataset.pid);
});

// ── MESSAGGI ──────────────────────────────────────────────────────────────────
var _chatConvId=null,_chatAltroNome=null,_chatSub=null;

window.renderMessaggi=async function(c){
  var ME=window._socialME;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  if(!ME){if(window.showAuth)window.showAuth();return;}
  c.innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
  var{data:convs}=await supa.from("messaggi_conversazioni")
    .select("id,partecipante_1,partecipante_2,ultimo_messaggio,ultimo_messaggio_at")
    .or("partecipante_1.eq."+ME.id+",partecipante_2.eq."+ME.id)
    .order("ultimo_messaggio_at",{ascending:false});

  var altriIds=(convs||[]).map(function(c){return c.partecipante_1===ME.id?c.partecipante_2:c.partecipante_1;});
  var profiliMap={};
  if(altriIds.length){
    var{data:pf}=await supa.from("clienti_profilo").select("user_id,nome_completo,avatar_url").in("user_id",altriIds);
    (pf||[]).forEach(function(p){profiliMap[p.user_id]=p;});
  }

  var h='<div class="pb-nav">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;">';
  h+='<div style="font-size:22px;font-weight:900">&#128172; Messaggi</div>';
  h+='<button onclick="apriNuovaChat()" style="background:var(--brand);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;">+ Nuova</button>';
  h+='</div>';

  if(!convs||convs.length===0){
    h+='<div class="empty-state"><div class="empty-icon">&#128172;</div><div class="empty-title">Nessun messaggio</div><div class="empty-sub">Inizia una conversazione</div></div>';
  }else{
    convs.forEach(function(conv){
      var altroId=conv.partecipante_1===ME.id?conv.partecipante_2:conv.partecipante_1;
      var pr=profiliMap[altroId]||{};
      var nome=pr.nome_completo||"Utente";
      var av=pr.avatar_url?'<img src="'+pr.avatar_url+'"/>':nome.charAt(0).toUpperCase();
      var ora=conv.ultimo_messaggio_at?new Date(conv.ultimo_messaggio_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):"";
      h+='<div class="msg-conv-item" onclick="apriChat(\''+conv.id+'\',\''+altroId+'\',\''+nome.replace(/'/g,"&#39;")+'\')">'+
        '<div class="msg-conv-av">'+av+'</div>'+
        '<div class="msg-conv-body"><div class="msg-conv-nome">'+nome+'</div>'+
        '<div class="msg-conv-preview">'+(conv.ultimo_messaggio||"")+'</div></div>'+
        '<div class="msg-conv-time">'+ora+'</div>'+
        '</div>';
    });
  }
  h+='</div>';
  c.innerHTML=h;
};

window.apriNuovaChat=async function(){
  var ME=window._socialME;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var{data:utenti}=await supa.from("clienti_profilo").select("user_id,nome_completo").neq("user_id",ME.id).order("nome_completo").limit(60);
  var sheet=document.getElementById("post-menu-sheet");
  var overlay=document.getElementById("post-menu-overlay");
  var items=(utenti||[]).map(function(u){
    return '<div class="post-menu-item" onclick="avviaChat(\''+u.user_id+'\',\''+( u.nome_completo||"Utente").replace(/'/g,"&#39;")+'\')">'+( u.nome_completo||"Utente")+'</div>';
  }).join("");
  sheet.innerHTML='<div style="width:40px;height:4px;background:#e5e7eb;border-radius:999px;margin:0 auto 12px"></div>'+
    '<div style="font-size:16px;font-weight:800;margin-bottom:12px">Nuova conversazione</div>'+
    '<input placeholder="Cerca utente..." style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:10px;box-sizing:border-box;outline:none;" oninput="this.nextElementSibling.querySelectorAll(\'.post-menu-item\').forEach(function(el){el.style.display=el.textContent.toLowerCase().includes(this.value.toLowerCase())?\'flex\':\'none\';}.bind(this))"/>'+
    '<div style="max-height:50vh;overflow-y:auto;">'+items+'</div>'+
    '<div class="post-menu-item" onclick="chiudiPostMenu()">Annulla</div>';
  overlay.classList.add("open");
};

window.avviaChat=async function(altroId,altroNome){
  chiudiPostMenu();
  var ME=window._socialME;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var p1=ME.id<altroId?ME.id:altroId;
  var p2=ME.id<altroId?altroId:ME.id;
  var{data:ex}=await supa.from("messaggi_conversazioni").select("id").eq("partecipante_1",p1).eq("partecipante_2",p2).maybeSingle();
  if(ex){
    apriChat(ex.id,altroId,altroNome);
  }else{
    var{data:nv}=await supa.from("messaggi_conversazioni").insert({partecipante_1:p1,partecipante_2:p2}).select("id").single();
    if(nv)apriChat(nv.id,altroId,altroNome);
  }
};

window.apriChat=async function(convId,altroId,altroNome){
  _chatConvId=convId;_chatAltroNome=altroNome;
  document.getElementById("chat-nome-el").textContent=altroNome||"Chat";
  document.getElementById("chat-messages-el").innerHTML='<div class="page-loader"><div class="spinner"></div></div>';
  document.getElementById("chat-screen").classList.add("open");
  await _caricaMsg();
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  if(_chatSub)supa.removeChannel(_chatSub);
  _chatSub=supa.channel("chat"+convId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messaggi",filter:"conversazione_id=eq."+convId},_caricaMsg)
    .subscribe();
};

async function _caricaMsg(){
  if(!_chatConvId)return;
  var ME=window._socialME;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var{data:msgs}=await supa.from("messaggi").select("*").eq("conversazione_id",_chatConvId).order("created_at",{ascending:true}).limit(100);
  var el=document.getElementById("chat-messages-el");if(!el)return;
  if(!msgs||msgs.length===0){el.innerHTML='<div style="text-align:center;padding:32px;color:#9ca3af;font-size:14px">Nessun messaggio. Dì ciao!</div>';return;}
  el.innerHTML=msgs.map(function(m){
    var out=m.mittente_id===ME.id;
    var ora=new Date(m.created_at).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    return '<div class="msg-bubble '+(out?"out":"in")+'">'+( m.testo||"")+'<div class="msg-time">'+ora+'</div></div>';
  }).join("");
  el.scrollTop=el.scrollHeight;
}

window.chiudiChat=function(){
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  if(_chatSub)supa.removeChannel(_chatSub);
  _chatSub=null;_chatConvId=null;
  document.getElementById("chat-screen").classList.remove("open");
};

window.inviaChatMsg=async function(){
  var ME=window._socialME;
  if(!ME||!_chatConvId)return;
  var supa=window._supa;if(!supa){console.warn("supa non pronto");return;}
  var inp=document.getElementById("chat-input-el");
  var testo=inp.value.trim();if(!testo)return;
  inp.value="";inp.style.height="auto";
  await supa.from("messaggi").insert({conversazione_id:_chatConvId,mittente_id:ME.id,testo});
  await supa.from("messaggi_conversazioni").update({ultimo_messaggio:testo,ultimo_messaggio_at:new Date().toISOString()}).eq("id",_chatConvId);
  await _caricaMsg();
};

// ── BRIDGE ME ─────────────────────────────────────────────────────────────────
// Il client Supabase viene creato dentro l'IIFE con window.supabase.createClient
// Aspettiamo che window.supabase (la libreria CDN) sia caricata
// Bridge: usa il client già creato dal primo script
(function(){
  var check=setInterval(function(){
    if(window._supa){
      clearInterval(check);
      window._supa.auth.getSession().then(function(r){
        if(r.data&&r.data.session)window._socialME=r.data.session.user;
      });
      window._supa.auth.onAuthStateChange(function(ev,sess){
        window._socialME=sess?sess.user:null;
      });
    }
  },100);
  setTimeout(function(){clearInterval(check);},5000);
})();


</body>
  window.renderStorie = function(c){
    // Apre direttamente l'editor
    window.apriEditorStoria();
  };
})();
