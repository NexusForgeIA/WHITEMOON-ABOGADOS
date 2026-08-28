# ROADMAP — WhiteMoon Abogados Demo

## Estado actual
- Web estática (HTML/CSS/JS puro) con el molde visual de WHITEMOON-TALLERES-COCHES
  repintado con el design system WhiteMoon (Sora, `--bg #08080d`, `--p #7c4dff`)
- Chatbot LEX inline: detecta el área legal, la explica, **agenda día y hora**
  (L-V 9:00-19:00) y recoge nombre + teléfono. Scripted, sin LLM todavía
- **Backend Supabase** (proyecto `mlaqtniujnvfxcvcourm`):
  - El cliente inserta el lead en `leads_web` con la publishable key
    (RLS insert-only para `anon`), incluidos `cita_dia` y `cita_hora`
  - Edge Function `abogados-notify` (`verify_jwt:false`) → **aviso por Telegram**,
    con el token en Secrets. Solo notifica: no toca la BBDD, así la captura del
    lead no depende de ella y no hay filas duplicadas
- 10 áreas de práctica, `/aviso-legal/`, `robots.txt`, `sitemap.xml` y `llms.txt`
- Sin IA real: LEX no llama a ningún modelo (ver 1.1)

---

## CAPA 1 — Agente IA para captación de leads
> Prioridad: ALTA — implementar con primer cliente real

### 1.1 Conectar Laura IA (Edge Function)
- Reemplazar chatbot scripted por Edge Function whitemoon-chat
- URL: https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/whitemoon-chat
- Laura v22 ya tiene contexto legal completo
- Flujo: saludo → auditoría → recomendación pack → cierre

### 1.2 Guardar leads en Supabase — ✅ HECHO
- Tabla: `leads_web` (proyecto `mlaqtniujnvfxcvcourm`)
- Columnas: `nombre`, `telefono`, `sector='abogados'`, `interes`, `mensaje`,
  `origen='demo-abogados'`, `cita_dia`, `cita_hora`
- INSERT desde el cliente con la publishable key (`fetch` con `keepalive:true`)
- Aviso por **Telegram** vía Edge Function `abogados-notify`, con guard de lead
  incompleto (sin nombre o sin teléfono → 400)
- Nota: `sendBeacon` no sirve para el INSERT — PostgREST rechaza `text/plain`
  (PGRST102) y con `application/json` habría preflight CORS. Sí se usa como
  respaldo en la llamada a la Edge Function.

### 1.3 Token CDN
- Añadir license-check.js cuando haya cliente real de pago
- Token formato: WM-xxxxxxxxxxxxxxxx
- Sin token → chatbot desaparece

### 1.4 wmOpenChat del sistema WhiteMoon
- Sustituir toggleChat() por wmOpenChat()
- Consistencia con el resto de demos WhiteMoon

---

## CAPA 2 — Herramienta interna para abogados
> Prioridad: MEDIA — implementar si hay demanda real

Basada en: https://github.com/betobetico/claude-para-abogados
Adaptación del repo oficial claude-for-legal de Anthropic para derecho español.

### Módulos disponibles (20 áreas):
- Mercantil — revisión contratos, NDAs, adendas
- Societario — due diligence, acuerdos sociales, cierre
- Laboral — despidos, contratación, indemnizaciones
- Propiedad Intelectual — marcas, licencias OSS, infracción
- Procesal — plazos, demandas, cronologías
- Privacidad — ARCO-POL, EIPD, encargos de tratamiento
- Fiscal — calendario AEAT, declaraciones, consultas DGT
- Administrativo — procedimiento, contratación pública
- Inmobiliario — arrendamientos, compraventa
- Concursal — insolvencia, reestructuración
- Familia — convenio regulador, pensiones
- Protección de datos — RAT, brechas, AEPD
- Startups — constitución SL, stock options, rondas
- Gobernanza IA — EU AI Act, evaluaciones impacto
- Clínica jurídica — intake, memos, plazos
- Estudiante Derecho — socrático, IRAC, oposiciones

### Agentes programados (17):
- Vigilante de normativa (BOE/DOUE)
- Debrief semanal de contratos
- Vigilante de data room
- Vigilante de renovaciones
- y 13 más

### MCPs por desarrollar (alta prioridad):
- CENDOJ — jurisprudencia del CGPJ
- BOE — legislación y disposiciones
- EUR-Lex — legislación UE
- AEPD — resoluciones y guías

### Reglas de responsabilidad (OBLIGATORIAS en producción):
- Toda salida requiere revisión humana por abogado colegiado
- No constituye asesoramiento jurídico
- El abogado que usa la herramienta es quien decide, no la IA
- Resultados son borradores para revisión profesional
- Errores normativos posibles — verificar siempre

---

## CAPA 3 — Pack Abogados IA completo
> Prioridad: BAJA — cuando haya demanda validada

Combina Capa 1 + Capa 2 sobre los packs de la tarifa 2026 (sin tarifa propia de
sector). **Fuente de verdad: https://whitemoon.es/precios/ — comprobar ahí antes
de citar cualquier importe.**

| Encaje para un despacho | Pack | Precio (tarifa 2026) |
|---|---|---|
| Agente IA de captación en la web | Spark | 499€ + 99€/mes |
| Web + SEO/GEO + Agente IA | Core Spark Web | 899€ + 99€/mes |
| + herramienta interna sobre su documentación | Core RAG | 2.499€ + 199€/mes |

Ninguno tiene permanencia.

---

## DISEÑO — Mejoras pendientes
- [ ] Micrófono Web Speech API para consultas por voz
- [ ] Sección de plazos legales con números grandes (20 días, 24h)
- [ ] Calculadora de indemnizaciones (despido)
- [ ] Calculadora de plazos procesales
- [x] Sección FAQ con las preguntas más frecuentes (6, sincronizadas con schema)
- [ ] Blog con artículos de derecho español para SEO

---

## SEO/GEO — ✅ HECHO
- [x] Schema `["LocalBusiness","LegalService"]`
- [x] FAQPage sincronizado schema↔DOM
- [x] BreadcrumbList con "Agente IA" en item 2 (ancla `#agente-ia`)
- [x] llms.txt + robots.txt con bots IA (GPTBot, ClaudeBot, PerplexityBot,
      Google-Extended, …)
- [x] og:image JPG 1200x630 (`og.jpg`)
- [x] Sitemap con todas las URLs (home y `/aviso-legal/`)
- [x] Fotos en WebP + fallback JPG, con `width`/`height`/`alt`
- [x] `title` ≤65c terminado en " · WhiteMoon", `meta` ≤160c, canonical
      self-referente y og sincronizado en cada página
