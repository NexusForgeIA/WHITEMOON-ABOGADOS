/*
 * LEX — asistente guiado de MARTÍNEZ & ASOCIADOS
 * Widget de captación de leads para la demo de despacho de abogados
 * (civil, penal, laboral, mercantil e inmobiliario en Madrid).
 *
 * Clon estructural del asistente de FONGASCA: misma máquina de estados
 * (categoría → subservicio → [reclamación → cuantía] → zona → nombre → teléfono).
 * LEX es profesional, discreto y serio: NO ofrece asesoramiento jurídico concreto,
 * solo recoge los datos para que un abogado del despacho contacte al interesado.
 *
 * Al completar el flujo inserta el lead en Supabase (tabla leads_web)
 * usando la clave publishable (RLS: "Allow anonymous inserts").
 *
 * Sin dependencias. Se autoinyecta estilos y DOM.
 */
(function () {
  "use strict";
  if (window.__lexChatLoaded) return;
  window.__lexChatLoaded = true;

  /* ---------- Config ---------- */
  var SUPABASE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co";
  var SUPABASE_KEY = "sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV";
  var LEADS_TABLE = "leads_web";

  var ACCENT = "#1a4fd6";

  /* CallMeBot — aviso por WhatsApp al recibir el lead.
     Rellena CALLMEBOT_APIKEY con la apikey que CallMeBot asigna al número receptor.
     Sin apikey el aviso se omite (el lead se guarda igualmente en Supabase). */
  var CALLMEBOT_PHONE = "34643199580";
  var CALLMEBOT_APIKEY = "";

  /* ---------- Flujo de áreas (categoría → subservicio) ---------- */
  var CATEGORIAS = ["⚖️ Civil", "🛡️ Penal", "💼 Laboral", "🏢 Mercantil", "🏠 Inmobiliario", "📋 Otros"];
  var SUBSERVICIOS = {
    "Civil": ["Divorcio / Familia", "Herencias", "Contratos", "Reclamación de cantidad"],
    "Penal": ["Defensa penal", "Asistencia al detenido", "Recurso", "Soy víctima / denuncia"],
    "Laboral": ["Despido", "ERE / ERTE", "Reclamación salarial", "Accidente laboral"],
    "Mercantil": ["Constituir sociedad", "Concurso de acreedores", "Contratos mercantiles", "Reclamación de impagos"],
    "Inmobiliario": ["Compraventa", "Arrendamiento", "Comunidad de propietarios", "Desahucio"],
    "Otros": ["Consulta general", "Otra materia"]
  };
  /* Asuntos en los que pedimos cuantía estimada (equivalente a la rama de reformas de Fongasca) */
  var RECLAMACIONES = ["Reclamación de cantidad", "Reclamación salarial", "Reclamación de impagos"];
  var CUANTIAS = ["Menos de 3.000€", "3.000€ - 10.000€", "10.000€ - 50.000€", "Más de 50.000€"];
  var ZONAS = ["Madrid capital", "Comunidad de Madrid", "Otra provincia", "Online / videollamada"];

  /* ---------- Estado ---------- */
  var state = { categoria: "", servicio: "", reclama: false, cuantia: "", zona: "", nombre: "", telefono: "" };
  var els = {};

  /* ---------- Estilos ---------- */
  var css = "" +
    ".lex-fab{position:fixed;right:clamp(16px,3vw,28px);bottom:clamp(16px,3vw,28px);z-index:2147483000;" +
      "width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.5),0 0 0 6px rgba(26,79,214,.16);" +
      "transition:transform .15s ease}" +
    ".lex-fab:hover{transform:translateY(-2px)}" +
    ".lex-fab:active{transform:scale(.95)}" +
    ".lex-fab svg{width:28px;height:28px}" +
    ".lex-fab .lex-dot{position:absolute;top:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#1f8f3a;border:2px solid #0d0d0d}" +
    ".lex-fab[aria-expanded=true]{transform:scale(.9);opacity:.85}" +

    ".lex-panel{position:fixed;right:clamp(16px,3vw,28px);bottom:calc(clamp(16px,3vw,28px) + 74px);z-index:2147483000;" +
      "width:min(320px,calc(100vw - 32px));height:min(480px,calc(100vh - 120px));" +
      "background:#0d0d0d;border:1px solid #2a2a2a;border-radius:18px;overflow:hidden;display:none;flex-direction:column;" +
      "font-family:'Sora',system-ui,-apple-system,sans-serif;color:#F5F5F5;" +
      "box-shadow:0 24px 60px rgba(0,0,0,.6);opacity:0;transform:translateY(14px) scale(.98);" +
      "transition:opacity .22s cubic-bezier(.2,.7,.2,1),transform .22s cubic-bezier(.2,.7,.2,1)}" +
    ".lex-panel.open{display:flex}" +
    ".lex-panel.in{opacity:1;transform:none}" +

    ".lex-head{display:flex;align-items:center;gap:12px;padding:16px 16px;background:#161616;border-bottom:1px solid #2a2a2a;flex:none}" +
    ".lex-ava{width:42px;height:42px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#fff}" +
    ".lex-ava svg{width:22px;height:22px}" +
    ".lex-htxt b{display:block;font-size:15px;font-weight:700;letter-spacing:-.01em}" +
    ".lex-htxt span{display:flex;align-items:center;gap:6px;font-size:12px;color:#9a9a9a;margin-top:2px}" +
    ".lex-htxt span::before{content:'';width:7px;height:7px;border-radius:50%;background:#1f8f3a}" +
    ".lex-x{margin-left:auto;background:none;border:0;color:#9a9a9a;cursor:pointer;width:34px;height:34px;border-radius:9px;" +
      "display:flex;align-items:center;justify-content:center;transition:color .2s,background .2s}" +
    ".lex-x:hover{color:#F5F5F5;background:#1d1d1d}" +
    ".lex-x svg{width:20px;height:20px}" +

    ".lex-body{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}" +
    ".lex-body::-webkit-scrollbar{width:8px}.lex-body::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:8px}" +

    ".lex-row{display:flex;gap:9px;align-items:flex-end;max-width:88%}" +
    ".lex-row.bot{align-self:flex-start}" +
    ".lex-row.user{align-self:flex-end;flex-direction:row-reverse}" +
    ".lex-mini{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;" +
      "background:" + ACCENT + ";color:#fff}" +
    ".lex-mini svg{width:15px;height:15px}" +
    ".lex-bub{padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;border:1px solid transparent;text-wrap:pretty;white-space:pre-line}" +
    ".lex-row.bot .lex-bub{background:#161616;border-color:#2a2a2a;border-bottom-left-radius:5px}" +
    ".lex-row.user .lex-bub{background:" + ACCENT + ";color:#fff;font-weight:600;border-bottom-right-radius:5px}" +

    ".lex-opts{display:flex;flex-wrap:wrap;gap:7px;align-self:flex-start;max-width:96%;padding-left:32px;margin-top:-2px}" +
    ".lex-chip{background:#161616;border:1px solid #3a3a3a;color:#F5F5F5;font-family:inherit;font-size:13px;font-weight:500;" +
      "padding:8px 13px;border-radius:10px;cursor:pointer;min-height:36px;transition:border-color .18s,background .18s,transform .12s}" +
    ".lex-chip:hover{border-color:" + ACCENT + ";background:#1d1d1d}" +
    ".lex-chip:active{transform:scale(.97)}" +
    ".lex-chip.urg{border-color:" + ACCENT + ";color:" + ACCENT + ";font-weight:600}" +

    ".lex-foot{flex:none;border-top:1px solid #2a2a2a;padding:12px;background:#0d0d0d}" +
    ".lex-form{display:flex;gap:9px}" +
    ".lex-input{flex:1;background:#1d1d1d;border:1px solid #3a3a3a;color:#F5F5F5;border-radius:11px;padding:12px 14px;" +
      "font-family:inherit;font-size:15px;min-height:46px}" +
    ".lex-input::placeholder{color:#6f6f6f}" +
    ".lex-input:focus{outline:none;border-color:" + ACCENT + "}" +
    ".lex-send{flex:none;width:46px;height:46px;border-radius:11px;border:0;cursor:pointer;background:" + ACCENT + ";color:#fff;" +
      "display:flex;align-items:center;justify-content:center;transition:transform .12s}" +
    ".lex-send:hover{transform:translateY(-1px)}.lex-send:active{transform:scale(.95)}" +
    ".lex-send svg{width:20px;height:20px}" +
    ".lex-err{color:#ff8a8a;font-size:12.5px;padding:6px 4px 0}" +
    ".lex-foot-note{text-align:center;font-size:11px;color:#6f6f6f;padding-top:9px}" +

    ".lex-typing{display:flex;gap:4px;padding:13px 14px}" +
    ".lex-typing i{width:7px;height:7px;border-radius:50%;background:#6f6f6f;animation:lex-bounce 1.2s infinite ease-in-out}" +
    ".lex-typing i:nth-child(2){animation-delay:.15s}.lex-typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes lex-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +

    "@media (prefers-reduced-motion: reduce){" +
      ".lex-panel,.lex-fab,.lex-chip,.lex-send{transition:none}" +
      ".lex-typing i{animation:none}.lex-body{scroll-behavior:auto}}" +
    "@media (max-width:600px){.lex-panel{right:8px;left:8px;width:auto;bottom:84px;height:min(68vh,480px)}}";

  /* ---------- Iconos ---------- */
  var SCALE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M6 21h12M3 7h18M7 7l-3 7a3 3 0 0 0 6 0L7 7zm10 0l-3 7a3 3 0 0 0 6 0l-3-7z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  /* ---------- Construcción del DOM ---------- */
  function build() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var fab = document.createElement("button");
    fab.className = "lex-fab";
    fab.id = "lex-toggle";
    fab.setAttribute("aria-label", "Abrir chat con LEX, asistente de Martínez & Asociados");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = SCALE + '<span class="lex-dot" aria-hidden="true"></span>';

    var panel = document.createElement("div");
    panel.className = "lex-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat con LEX, asistente de Martínez & Asociados");
    panel.innerHTML =
      '<div class="lex-head">' +
        '<div class="lex-ava">' + SCALE + '</div>' +
        '<div class="lex-htxt"><b>LEX</b><span>Asistente · Martínez &amp; Asociados</span></div>' +
        '<button class="lex-x" aria-label="Cerrar chat">' + CLOSE + '</button>' +
      '</div>' +
      '<div class="lex-body" id="lex-body" aria-live="polite"></div>' +
      '<div class="lex-foot" id="lex-foot" style="display:none">' +
        '<form class="lex-form" id="lex-form" autocomplete="on">' +
          '<input class="lex-input" id="lex-input" type="text" autocomplete="name">' +
          '<button class="lex-send" type="submit" aria-label="Enviar">' + SEND + '</button>' +
        '</form>' +
        '<div class="lex-err" id="lex-err" style="display:none"></div>' +
        '<div class="lex-foot-note">Demo · sus datos llegan al equipo del despacho</div>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els.fab = fab;
    els.panel = panel;
    els.body = panel.querySelector("#lex-body");
    els.foot = panel.querySelector("#lex-foot");
    els.form = panel.querySelector("#lex-form");
    els.input = panel.querySelector("#lex-input");
    els.err = panel.querySelector("#lex-err");

    fab.addEventListener("click", toggle);
    panel.querySelector(".lex-x").addEventListener("click", close);
    els.form.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
  }

  /* ---------- Abrir / cerrar ---------- */
  var opened = false;
  function toggle() { panel().classList.contains("open") ? close() : open(); }
  function panel() { return els.panel; }

  function open() {
    els.panel.classList.add("open");
    els.fab.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () { els.panel.classList.add("in"); });
    if (!opened) { opened = true; startFlow(); }
  }
  function close() {
    els.panel.classList.remove("in");
    els.fab.setAttribute("aria-expanded", "false");
    setTimeout(function () { els.panel.classList.remove("open"); }, 220);
  }

  /* ---------- Render helpers ---------- */
  function scroll() { els.body.scrollTop = els.body.scrollHeight; }

  function botMsg(text, cb) {
    var typing = document.createElement("div");
    typing.className = "lex-row bot";
    typing.innerHTML = '<div class="lex-mini">' + SCALE + '</div><div class="lex-bub"><div class="lex-typing"><i></i><i></i><i></i></div></div>';
    els.body.appendChild(typing);
    scroll();
    var delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 480;
    setTimeout(function () {
      typing.querySelector(".lex-bub").innerHTML = "";
      typing.querySelector(".lex-bub").textContent = text;
      scroll();
      if (cb) cb();
    }, delay);
  }

  function userMsg(text) {
    var row = document.createElement("div");
    row.className = "lex-row user";
    row.innerHTML = '<div class="lex-bub"></div>';
    row.querySelector(".lex-bub").textContent = text;
    els.body.appendChild(row);
    scroll();
  }

  function options(list, onPick, urgentLabel) {
    var wrap = document.createElement("div");
    wrap.className = "lex-opts";
    list.forEach(function (label) {
      var b = document.createElement("button");
      b.className = "lex-chip" + (label === urgentLabel ? " urg" : "");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () {
        wrap.remove();
        userMsg(label);
        onPick(label);
      });
      wrap.appendChild(b);
    });
    els.body.appendChild(wrap);
    scroll();
    return wrap;
  }

  function showInput(placeholder, type, autocomplete) {
    els.foot.style.display = "block";
    els.input.value = "";
    els.input.placeholder = placeholder;
    els.input.type = type || "text";
    els.input.inputMode = type === "tel" ? "tel" : "text";
    els.input.setAttribute("autocomplete", autocomplete || "off");
    hideErr();
    setTimeout(function () { els.input.focus(); }, 60);
  }
  function hideInput() { els.foot.style.display = "none"; }
  function showErr(msg) { els.err.textContent = msg; els.err.style.display = "block"; }
  function hideErr() { els.err.style.display = "none"; }

  /* ---------- Máquina de estados ---------- */
  var step = "";

  function startFlow() {
    botMsg("Buenos días, soy LEX, asistente del despacho Martínez & Asociados ⚖️ La primera consulta es gratuita y confidencial. ¿Sobre qué área necesita asesoramiento?", function () {
      step = "categoria";
      options(CATEGORIAS, pickCategoria);
    });
  }

  function pickCategoria(label) {
    var cat = label.replace(/^\S+\s+/, "").trim();
    state.categoria = cat;
    var q = cat === "Otros" ? "¿Qué necesita?" : "¿Qué tipo de asunto de Derecho " + cat + " es?";
    botMsg(q, function () {
      step = "servicio";
      options(SUBSERVICIOS[cat], pickServicio, "Asistencia al detenido");
    });
  }

  function pickServicio(servicio) {
    state.servicio = servicio;
    if (RECLAMACIONES.indexOf(servicio) !== -1) {
      state.reclama = true;
      botMsg("¿Cuantía aproximada que se reclama?", function () {
        step = "cuantia";
        options(CUANTIAS, pickCuantia);
      });
      return;
    }
    askZona();
  }

  function pickCuantia(c) {
    state.cuantia = c;
    askZona();
  }

  function askZona() {
    botMsg("¿Dónde se encuentra usted o su asunto?", function () {
      step = "zona";
      options(ZONAS, pickZona);
    });
  }

  function pickZona(zona) {
    state.zona = zona;
    botMsg("¿Cuál es su nombre?", function () {
      step = "nombre";
      showInput("Escriba su nombre", "text", "name");
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var val = els.input.value.trim();
    if (step === "nombre") {
      if (val.length < 2) { showErr("Dígame su nombre, por favor."); return; }
      state.nombre = val;
      userMsg(val);
      hideInput();
      botMsg("¿Y su teléfono de contacto?", function () {
        step = "telefono";
        showInput("6XX XXX XXX", "tel", "tel");
      });
    } else if (step === "telefono") {
      var digits = val.replace(/\s+/g, "");
      if (!/^[6789]\d{8}$/.test(digits)) {
        showErr("Necesito un teléfono válido de 9 dígitos.");
        return;
      }
      state.telefono = digits;
      userMsg(val);
      hideInput();
      finish();
    }
  }

  function finish() {
    step = "done";
    saveLead();
    notifyWhatsApp();
    botMsg("✅ Hemos recibido su consulta, " + state.nombre + ".\nNuestro equipo le contactará para concretar su primera consulta gratuita.\n\nUn recordatorio: esto es una orientación inicial, no asesoramiento jurídico.");
  }

  /* ---------- Supabase ---------- */
  function saveLead() {
    var base = "Derecho " + state.categoria + " · " + state.servicio;
    var mensaje = state.reclama
      ? base + " · Cuantía: " + state.cuantia + " · Zona: " + state.zona
      : base + " · Zona: " + state.zona;
    var payload = {
      nombre: state.nombre,
      telefono: state.telefono,
      sector: "abogados",
      interes: base,
      mensaje: mensaje,
      origen: "abogados-demo"
    };
    try {
      fetch(SUPABASE_URL + "/rest/v1/" + LEADS_TABLE, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) console.warn("[LEX] No se pudo guardar el lead:", r.status);
      }).catch(function (err) {
        console.warn("[LEX] Error de red al guardar el lead:", err);
      });
    } catch (err) {
      console.warn("[LEX] Excepción al guardar el lead:", err);
    }
  }

  /* ---------- CallMeBot (aviso por WhatsApp) ---------- */
  function notifyWhatsApp() {
    if (!CALLMEBOT_APIKEY) {
      console.warn("[LEX] CallMeBot sin apikey: se omite el aviso por WhatsApp.");
      return;
    }
    var lines = ["Nuevo lead ABOGADOS (demo)", "Area: Derecho " + state.categoria, "Asunto: " + state.servicio];
    if (state.reclama) {
      lines.push("Cuantia: " + state.cuantia);
    }
    lines.push("Zona: " + state.zona, "Nombre: " + state.nombre, "Telefono: " + state.telefono);
    var url = "https://api.callmebot.com/whatsapp.php?phone=" + CALLMEBOT_PHONE +
      "&text=" + encodeURIComponent(lines.join("\n")) + "&apikey=" + CALLMEBOT_APIKEY;
    try {
      fetch(url, { method: "GET", mode: "no-cors" }).catch(function (err) {
        console.warn("[LEX] CallMeBot error de red:", err);
      });
    } catch (err) {
      console.warn("[LEX] CallMeBot excepción:", err);
    }
  }

  /* ---------- Init ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
