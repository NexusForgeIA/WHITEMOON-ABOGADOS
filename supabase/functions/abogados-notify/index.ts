import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// abogados-notify — captura de lead + aviso por Telegram de una nueva CONSULTA
// de la demo WhiteMoon · Martínez & Asociados (chatbot "LEX").
//
// Mismo patrón que talleres-notify en cuanto al aviso (token de Telegram solo en
// Secrets, verify_jwt:false, guard nombre+telefono -> 400). La diferencia es que
// aquí el INSERT en leads_web también se hace server-side con la service role:
// así el cliente no maneja NINGUNA clave de Supabase, ni siquiera la publishable,
// y no hay riesgo de insertar la fila dos veces.
//
// Recibe (POST JSON): { despacho, nombre, telefono, interes, mensaje,
//                       cita_dia, cita_hora, origen, test? }
//
// El cliente puede llamar por sendBeacon con Content-Type text/plain: aquí se
// parsea con req.json() sin mirar el Content-Type, así el beacon sigue siendo
// una petición simple y no dispara preflight CORS.
//
// Secrets usados (nunca en cliente):
//   - TELEGRAM_BOT_TOKEN        : token del bot de Telegram (obligatorio)
//   - TELEGRAM_CHAT_ID          : chat destino; si falta se usa CHAT_ID_FALLBACK
//   - SUPABASE_URL              : inyectado por la plataforma
//   - SUPABASE_SERVICE_ROLE_KEY : inyectado por la plataforma
//
// IMPORTANTE: es una SOLICITUD de consulta de una DEMO, no una cita confirmada.
//
// Regla del proyecto: si el insert o el envío fallan → console.warn, nunca
// interrumpe la conversación del chatbot.
//
// Desplegar con:
//   supabase functions deploy abogados-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm

// El chat_id no es un secreto (solo identifica el destino); el token sí lo es.
const CHAT_ID_FALLBACK = "861432965";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const data = (payload.args ?? payload) as Record<string, unknown>;
  const despacho = String(data.despacho ?? "Martínez & Asociados").trim() ||
    "Martínez & Asociados";
  const nombre = String(data.nombre ?? "").trim();
  const telefono = String(data.telefono ?? "").trim();
  const interes = String(data.interes ?? "").trim();
  const mensaje = String(data.mensaje ?? "").trim() || interes;
  const origen = String(data.origen ?? "demo-abogados").trim() || "demo-abogados";
  const citaDia = String(data.cita_dia ?? "").trim();
  const citaHora = String(data.cita_hora ?? "").trim();
  const soloPrueba = data.test === true;

  // Guard de lead incompleto — estándar WhiteMoon.
  // Un lead solo es válido con nombre Y teléfono: sin ambos no se inserta
  // nada ni se avisa.
  if (!nombre || !telefono) {
    return json({ ok: false, error: "lead incompleto" }, 400);
  }

  const digits = telefono.replace(/\D/g, "");

  // La cita es opcional: el lead puede cerrarse sin pasar por la agenda.
  const citaTexto = (citaDia || citaHora)
    ? `${citaDia || "-"}${citaHora ? " a las " + citaHora : ""}`
    : "";

  // 1) Lead en leads_web (service role → no requiere clave en el cliente)
  let stored = false;
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supaUrl && supaKey) {
      const r = await fetch(`${supaUrl}/rest/v1/leads_web`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          nombre: nombre || null,
          telefono: telefono || null,
          sector: "abogados",
          interes: interes || "consulta",
          mensaje: mensaje || null,
          origen,
          cita_dia: citaDia || null,
          cita_hora: citaHora || null,
          fecha: new Date().toISOString(),
        }),
      });
      stored = r.ok;
      if (!r.ok) {
        console.warn("[abogados-notify] insert leads_web falló:", r.status, await r.text());
      }
    } else {
      console.warn("[abogados-notify] sin SUPABASE_URL/SERVICE_ROLE_KEY, lead no guardado");
    }
  } catch (e) {
    console.warn("[abogados-notify] error insertando lead:", e);
  }

  // 2) Aviso por Telegram
  const message =
    (soloPrueba
      ? `🧪 PRUEBA — demo WhiteMoon · ${despacho}\n\n`
      : `⚖️ NUEVA CONSULTA — demo WhiteMoon · ${despacho}\n\n`) +
    `👤 ${nombre}\n` +
    `📱 ${telefono}\n` +
    `📋 Área: ${interes || "-"}\n` +
    (citaTexto ? `📅 Cita informativa: ${citaTexto}\n` : "") +
    `📝 ${mensaje || "-"}\n` +
    `🔗 Origen: ${origen}\n\n` +
    "⚠️ Lead de una WEB DE DEMOSTRACIÓN: es una SOLICITUD, no una cita confirmada.\n" +
    (digits.length >= 9 ? `📲 CONTACTAR: https://wa.me/34${digits}` : "");

  let notified = false;
  try {
    const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const tgChat = Deno.env.get("TELEGRAM_CHAT_ID") || CHAT_ID_FALLBACK;
    if (tgToken) {
      const r = await fetch(
        `https://api.telegram.org/bot${tgToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ chat_id: tgChat, text: message }),
        },
      );
      notified = r.ok;
      if (!r.ok) {
        console.warn("[abogados-notify] Telegram falló:", r.status, await r.text());
      }
    } else {
      console.warn("[abogados-notify] sin TELEGRAM_BOT_TOKEN, mensaje:", message);
    }
  } catch (e) {
    console.warn("[abogados-notify] error enviando Telegram:", e);
  }

  return json({ ok: true, stored, notified });
});
