# ROADMAP — WhiteMoon Abogados Demo

## Estado actual
- Demo estática con chatbot cliente (JS puro)
- Flujo conversacional por áreas legales
- Lead final enviado por WhatsApp 643199580
- Sin backend, sin base de datos, sin IA real

---

## CAPA 1 — Agente IA para captación de leads
> Prioridad: ALTA — implementar con primer cliente real

### 1.1 Conectar Laura IA (Edge Function)
- Reemplazar chatbot scripted por Edge Function whitemoon-chat
- URL: https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/whitemoon-chat
- Laura v22 ya tiene contexto legal completo
- Flujo: saludo → auditoría → recomendación pack → cierre

### 1.2 Guardar leads en Supabase
- Tabla: leads_web (proyecto mlaqtniujnvfxcvcourm)
- Columnas: nombre, telefono, sector='Legal', interes, origen='demo-abogados'
- Notificación WhatsApp 643199580

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

Combina Capa 1 + Capa 2 en un producto WhiteMoon:

| Pack | Precio | Incluye |
|------|--------|---------|
| Abogados Spark | 499€ + 199€/mes | Agente IA captación en web |
| Abogados Core | 1.800€ + 199€/mes | Web + SEO + Agente IA |
| Abogados Pro | A definir | Web + Agente captación + Herramienta interna |

---

## DISEÑO — Mejoras pendientes
- [ ] Micrófono Web Speech API para consultas por voz
- [ ] Sección de plazos legales con números grandes (20 días, 24h)
- [ ] Calculadora de indemnizaciones (despido)
- [ ] Calculadora de plazos procesales
- [ ] Sección FAQ con las preguntas más frecuentes por área
- [ ] Blog con artículos de derecho español para SEO

---

## SEO/GEO pendiente (cuando sea web real)
- [ ] Schema LocalBusiness + LegalService
- [ ] FAQPage sincronizado schema↔DOM
- [ ] BreadcrumbList con "Agente IA" en item 2
- [ ] llms.txt + robots.txt con bots IA
- [ ] og:image JPG 1200x630
- [ ] Sitemap con todas las URLs
