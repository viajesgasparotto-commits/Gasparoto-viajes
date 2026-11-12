# Asistente IA por WhatsApp (v23)

El asistente contesta en WhatsApp con los paquetes publicados en el panel, recomienda y manda el enlace del paquete para reservar y pagar con Pix.
Cuando hace falta una persona (reclamo, pedido a medida, traslado, "quiero hablar con alguien"), deja la charla marcada en **Panel › Asistente IA** y no contesta más en esa charla hasta que la devuelvas.

## Cómo se comporta

- Habla como un empleado de la agencia ("nosotros", "nuestro city tour"). Si el cliente pregunta directamente si es un robot, dice que es el asistente virtual y ofrece pasarlo con una persona.
- Vende: averigua fecha, personas e interés; recomienda una opción con precio y enlace; invita a reservar; ofrece un extra del catálogo cuando encaja; responde objeciones de precio y dudas. Sin urgencia falsa.
- Solo habla de lo que ofrece la agencia. A preguntas de turismo general (qué ver, dónde comer, clima, cambio…) responde con una frase y lleva la charla a un servicio del catálogo; no arma guías ni itinerarios propios.
- La venta se cierra siempre en la web: manda el enlace del paquete y el cliente elige fecha, personas y paga ahí. No toma reservas por chat.
- Pagos: la IA ve las reservas del cliente (busca por su número de WhatsApp). Si la reserva figura **pagada** (por ejemplo, por el Pix automático), se lo confirma. Si el cliente dice que pagó y no figura pagada, le pide el comprobante por WhatsApp. Nunca da un pago por acreditado si no figura pagado.
- Comprobantes: cuando el cliente manda una foto o un archivo, la IA no lo interpreta. El sistema le pregunta con botones: **"¿Es el comprobante de pago de una reserva?"** → *Sí, es comprobante* / *No, es otra cosa*.
  · *Sí* y la reserva ya figura pagada → le confirma la reserva (paquete, fecha, horario, personas).
  · *Sí* y no figura pagada → le dice que el equipo verifica y marca la charla **Verificar pago** (la IA sigue atendiendo).
  · *No* → "contame en qué te ayudo" y sigue la IA. No se marca nada.
- El texto de estas reglas está en `systemPrompt()` de `functions/lib/asistente.js`. Lo propio de la agencia (qué priorizar, extras, horarios) va en **Panel › Asistente IA › Indicaciones**.

## Número conectado

- **+54 9 11 6419-9083** (cuenta de WhatsApp "Gasparotto viajes", ID 1134587558814477). Identificador del número: `798217583382562`.
- Está en **coexistencia**: sigue funcionando en la app WhatsApp Business del celular. Si alguien del equipo responde desde el celular, la IA lo ve y se pausa en esa charla (se reactiva desde el panel con *Devolver a la IA*).
- Esa cuenta también está conectada a **Kommo**. Si Kommo tiene bots o respuestas automáticas, apagalas para que el cliente no reciba dos respuestas.
- Token: usuario del sistema **"Asistente IA"** (Business Settings › Usuarios del sistema), sin vencimiento, permisos de WhatsApp.

## Archivos

| Archivo | Qué hace |
|---|---|
| `functions/lib/ai.js` | Proveedor de IA: Gemini o Claude, según `IA_PROVEEDOR`. |
| `functions/lib/asistente.js` | El "cerebro": instrucciones, catálogo, historial, derivación a una persona, topes de uso. |
| `functions/lib/whatsapp.js` | Firma de Meta y envío de mensajes (Cloud API). |
| `functions/lib/api/whatsapp.js` | Webhook público `/api/whatsapp`. |
| `functions/lib/api/ia.js` | Rutas del panel (estado, prueba, indicaciones, conversaciones). |
| `scripts/test-ia.mjs` | Pruebas (`npm run test:ia`). |

## Paso 1: probar con Gemini (gratis), sin WhatsApp todavía

1. Sacá una clave en **https://aistudio.google.com/apikey** (botón *Create API key*).
2. En Cloudflare › Workers & Pages › gasparotto-viajes › Settings › Variables and secrets, agregá:
   - `IA_PROVEEDOR` = `gemini`
   - `GEMINI_API_KEY` = la clave (tipo **Secret**)
   Por consola: `npx wrangler pages secret put GEMINI_API_KEY --project-name gasparotto-viajes`
3. Desplegá (`npm run deploy`) y entrá al **Panel › Asistente IA**. En **Probar el asistente** escribí como si fueras un cliente.
4. Ajustá el comportamiento en **Indicaciones para el asistente** (qué recomendar primero, qué ofrecer como extra, horarios de atención…).

> En el plan gratuito, Google puede usar los mensajes para mejorar sus productos y tiene límites de uso por minuto y por día. Sirve para probar; para clientes reales conviene Claude (o Gemini pago).

## Paso 2: conectar WhatsApp (Meta)

1. En **developers.facebook.com** creá una app tipo *Business* y agregale el producto **WhatsApp**.
2. Agregá el número de la agencia (WhatsApp Manager › Números). Ese número pasa a la API: si hoy lo usás en la app WhatsApp Business del celular, mirá la opción de *coexistencia* que ofrece Meta al registrarlo, o usá un número nuevo para el asistente.
3. Creá un **token permanente**: Business Settings › Usuarios del sistema › Generar token, con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
4. Cargá en Cloudflare (todas como **Secret**):
   - `WHATSAPP_TOKEN` = el token permanente
   - `WHATSAPP_PHONE_ID` = el *Phone number ID* (WhatsApp › Configuración de la API)
   - `WHATSAPP_APP_SECRET` = App settings › Basic › *App secret*
   - `WHATSAPP_VERIFY_TOKEN` = cualquier texto largo que inventes (ej. `gv-webhook-8f3k29`)
5. Desplegá. En Meta › WhatsApp › Configuración › **Webhook**: URL de devolución = `https://gasparottoviajes.com/api/whatsapp` (la copiás del panel) y el mismo `WHATSAPP_VERIFY_TOKEN`. Tocá *Verificar y guardar* y suscribite a los campos **messages** y **smb_message_echoes** (este último avisa cuando alguien responde desde el celular).
6. Escribí al número desde otro celular. La charla aparece en el panel.

## Paso 3: pasar a Claude

1. Sacá una clave en **https://console.anthropic.com** › API Keys.
2. En Cloudflare: `ANTHROPIC_API_KEY` = la clave (Secret) y cambiá `IA_PROVEEDOR` a `claude`. Redesplegá.
3. Opcional: `CLAUDE_MODEL` para elegir otro modelo (por defecto `claude-sonnet-5-5`; `claude-haiku-5-5` es más barato).

No hay que tocar código: el panel muestra qué proveedor está activo.

## Controles

- `IA_ACTIVA=0` apaga todas las respuestas automáticas (los mensajes se siguen guardando).
- `IA_MAX_DIARIO` = tope de respuestas por día en todo el sitio (por defecto 400). Además, cada charla tiene un tope de 20 respuestas por hora.
- Si la IA falla o se pasa un tope, el cliente recibe "una persona te responde en breve" y la charla queda marcada para el equipo.
- **Verificar pago**: en Panel › Asistente IA, las charlas marcadas aparecen arriba. Mirá que el dinero haya entrado, marcá la reserva como pagada en **Reservas** y tocá **Pago verificado**.
- Desde el panel podés **responder como persona** (la IA queda en pausa en esa charla) y **devolverla a la IA**.
- Cada conversación nueva entra también a **Consultas**, con origen "Asistente IA".
- WhatsApp solo permite texto libre dentro de las 24 h desde el último mensaje del cliente.
- Audios, videos y stickers: le pide al cliente que escriba.
- Paquetes con cierre por WhatsApp (Disponibilidad › modo de reserva) no se pueden pagar en la web: para que la IA cierre sola, pasalos a **Pix**.
