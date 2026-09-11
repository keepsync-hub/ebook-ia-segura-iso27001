import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const TABLA = '3Spzbq8nEcvRFqSj';
const ORIGEN_LANDING = 'https://keepsync-hub.github.io';

const ESQUEMA = [
  { id: 'fecha', displayName: 'fecha', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'numero', displayName: 'numero', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
  { id: 'nombre', displayName: 'nombre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'correo', displayName: 'correo', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'empresa', displayName: 'empresa', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'cargo', displayName: 'cargo', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'estado', displayName: 'estado', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
  { id: 'precio_usd', displayName: 'precio_usd', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
  { id: 'pagado', displayName: 'pagado', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true },
  { id: 'origen', displayName: 'origen', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }
];

const CODIGO_DECIDIR = 'const TOTAL = 20;\n'
  + 'const PRECIO = 15;\n'
  + 'const PRECIO_NORMAL = 25;\n'
  + '\n'
  + '// Link de pago del precio de lanzamiento.\n'
  + "const LINK_PAGO = 'https://www.webpay.cl/form-pay/420561';\n"
  + '\n'
  + "const req = $('Reserva entrante').first().json;\n"
  + 'const b = req.body || req;\n'
  + '\n'
  + "const correo  = String(b.email || '').trim().toLowerCase();\n"
  + "const nombre  = String(b.nombre || '').trim();\n"
  + "const empresa = String(b.empresa || '').trim();\n"
  + "const cargo   = String(b.cargo || '').trim();\n"
  + "const origen  = String(b.origen || 'landing').trim();\n"
  + '\n'
  + '// "Leer reservas" trae alwaysOutputData, así que puede colarse un item vacío.\n'
  + '// Una fila real siempre tiene correo: eso la distingue del item sintético.\n'
  + 'const filas = $input.all().map(function (i) { return i.json; })\n'
  + '  .filter(function (f) { return f && f.correo; });\n'
  + '\n'
  + 'const previa = filas.filter(function (f) {\n'
  + '  return String(f.correo).trim().toLowerCase() === correo;\n'
  + '})[0] || null;\n'
  + '\n'
  + "const reservados = filas.filter(function (f) { return f.estado === 'reservado'; });\n"
  + 'const ultimo = reservados.reduce(function (max, f) {\n'
  + '  return Number(f.numero) > max ? Number(f.numero) : max;\n'
  + '}, 0);\n'
  + '\n'
  + '// Tres caminos: ya estaba, queda cupo, o se acabaron los 20.\n'
  + '// `estadoFila` es lo que se guarda; `estadoRespuesta` es lo que ve el navegador.\n'
  + 'let estadoFila, estadoRespuesta, cupo, fecha, pagado, precio;\n'
  + '\n'
  + 'if (previa) {\n'
  + '  estadoFila = previa.estado;\n'
  + "  estadoRespuesta = previa.estado === 'lista_espera' ? 'lista_espera' : 'ya_reservado';\n"
  + '  cupo = Number(previa.numero) || 0;\n'
  + '  fecha = previa.fecha;\n'
  + '  pagado = previa.pagado === true;\n'
  + '  precio = Number(previa.precio_usd) || PRECIO_NORMAL;\n'
  + '} else if (reservados.length < TOTAL) {\n'
  + "  estadoFila = 'reservado';\n"
  + "  estadoRespuesta = 'reservado';\n"
  + '  cupo = ultimo + 1;\n'
  + '  fecha = $now.toISO();\n'
  + '  pagado = false;\n'
  + '  precio = PRECIO;\n'
  + '} else {\n'
  + "  estadoFila = 'lista_espera';\n"
  + "  estadoRespuesta = 'lista_espera';\n"
  + '  cupo = 0;\n'
  + '  fecha = $now.toISO();\n'
  + '  pagado = false;\n'
  + '  precio = PRECIO_NORMAL;\n'
  + '}\n'
  + '\n'
  + "const tomados = reservados.length + (estadoRespuesta === 'reservado' ? 1 : 0);\n"
  + 'const restantes = Math.max(0, TOTAL - tomados);\n'
  + '\n'
  + "const pila = 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif';\n"
  + "const saludo = nombre ? '¡Hola, ' + nombre.split(' ')[0] + '!' : '¡Hola!';\n"
  + '\n'
  + 'let asunto, cuerpo;\n'
  + '\n'
  + "if (estadoRespuesta === 'lista_espera') {\n"
  + "  asunto = 'Quedó en la lista de espera — IA Segura ISO 27001';\n"
  + "  cuerpo = '<p>' + saludo + '</p>'\n"
  + "    + '<p>Las ' + TOTAL + ' copias del precio de lanzamiento ya estaban tomadas cuando llegó su '\n"
  + "    + 'reserva, así que lo dejamos en la <strong>lista de espera</strong>.</p>'\n"
  + "    + '<p>Le escribimos apenas el ebook <strong>IA Segura ISO 27001</strong> esté disponible a su '\n"
  + "    + 'precio normal de <strong>USD ' + PRECIO_NORMAL + '</strong>. No tiene que hacer nada más.</p>';\n"
  + '} else {\n'
  + "  const encabezado = estadoRespuesta === 'ya_reservado'\n"
  + "    ? '<p>Su correo ya tenía reservado el <strong>cupo #' + cupo + '</strong>, así que le reenviamos el link de pago.</p>'\n"
  + "    : '<p>Su reserva quedó tomada: <strong>cupo #' + cupo + ' de ' + TOTAL + '</strong>.</p>';\n"
  + '\n'
  + "  asunto = 'Cupo #' + cupo + ' reservado — complete el pago de USD ' + PRECIO;\n"
  + "  cuerpo = '<p>' + saludo + '</p>'\n"
  + '    + encabezado\n'
  + "    + '<p>Al reservar le abrimos la ventana de pago. Si la cerró, o prefirió dejarlo para '\n"
  + "    + 'después, este es el mismo link: son <strong>USD ' + PRECIO + '</strong> en vez de USD ' + PRECIO_NORMAL + '.</p>'\n"
  + "    + '<p style=\"margin:28px 0\">'\n"
  + "    + '<a href=\"' + LINK_PAGO + '\" style=\"background:#f97316;color:#0a0f16;text-decoration:none;'\n"
  + "    + 'font-weight:700;padding:14px 26px;border-radius:9px;display:inline-block\">Pagar USD ' + PRECIO + '</a>'\n"
  + "    + '</p>'\n"
  + "    + '<p style=\"font-size:13px;color:#6a6255\">Si el botón no le funciona, copie este enlace: '\n"
  + "    + '<a href=\"' + LINK_PAGO + '\">' + LINK_PAGO + '</a></p>'\n"
  + "    + '<p>Su cupo ya está tomado y se confirma cuando entra el pago. Apenas eso pase le llega '\n"
  + "    + 'el enlace de descarga (PDF y EPUB) a este mismo correo.</p>';\n"
  + '}\n'
  + '\n'
  + "const html = '<div style=\"' + pila + ';color:#2f2a22;line-height:1.65;max-width:560px\">'\n"
  + '  + cuerpo\n'
  + '  + \'<p style="margin-top:30px;padding-top:18px;border-top:1px solid #e5ded0;color:#6a6255;font-size:14px">\'\n'
  + "  + 'Rodrigo Figueroa · IA Segura ISO 27001'\n"
  + "  + '</p></div>';\n"
  + '\n'
  + 'return [{\n'
  + '  json: {\n'
  + '    fecha: fecha,\n'
  + '    numero: cupo,\n'
  + '    nombre: nombre,\n'
  + '    correo: correo,\n'
  + '    empresa: empresa,\n'
  + '    cargo: cargo,\n'
  + '    estado: estadoFila,\n'
  + '    precio_usd: precio,\n'
  + '    pagado: pagado,\n'
  + '    origen: origen,\n'
  + '    asunto: asunto,\n'
  + '    html: html,\n'
  + '    respuesta: { ok: true, estado: estadoRespuesta, cupo: cupo, restantes: restantes }\n'
  + '  }\n'
  + '}];';

const CODIGO_CUPOS = 'const TOTAL = 20;\n'
  + '\n'
  + '// Solo las reservas cuentan contra el cupo; la lista de espera no ocupa lugar.\n'
  + '// El filtro del nodo anterior ya acota a estado = reservado; acá solo se descarta\n'
  + '// el item sintético que deja alwaysOutputData cuando la tabla está vacía.\n'
  + 'const tomados = $input.all().filter(function (i) {\n'
  + '  return i.json && i.json.correo;\n'
  + '}).length;\n'
  + '\n'
  + 'return [{\n'
  + '  json: {\n'
  + '    total: TOTAL,\n'
  + '    tomados: tomados,\n'
  + '    restantes: Math.max(0, TOTAL - tomados),\n'
  + '    precio: 15,\n'
  + '    precio_normal: 25,\n'
  + "    link_pago: 'https://www.webpay.cl/form-pay/420561'\n"
  + '  }\n'
  + '}];';

const reservaEntrante = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Reserva entrante',
    parameters: {
      httpMethod: 'POST',
      path: 'ebook-iso27001/reserva',
      responseMode: 'responseNode',
      options: {
        allowedOrigins: ORIGEN_LANDING,
        ignoreBots: true,
        onlyRunIf: '={{ !$json.body?.website && /.+@.+\\..+/.test($json.body?.email || "") }}'
      }
    },
    notes: 'El honeypot y el correo se filtran acá: una petición que no pasa recibe 200 y no crea ejecución.'
  },
  output: [{ body: { nombre: 'Ana Pérez', email: 'ana@empresa.cl', empresa: 'Empresa', cargo: 'Gerenta de TI', origen: 'hero' } }]
});

const leerReservas = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Leer reservas',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: TABLA, cachedResultName: 'reservas_ebook_iso27001' },
      returnAll: true
    },
    notes: 'alwaysOutputData para que la primera reserva de todas, con la tabla vacía, igual llegue al Code.'
  },
  output: [{ id: 1, correo: 'ana@empresa.cl', numero: 1, estado: 'reservado' }]
});

const decidirCupo = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Decidir cupo y correo',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: CODIGO_DECIDIR },
    notes: 'Acá vive LINK_PAGO y toda la regla de negocio: reservado / ya_reservado / lista_espera.'
  },
  output: [{
    fecha: '2026-09-11T14:00:00.000-04:00',
    numero: 1,
    nombre: 'Ana Pérez',
    correo: 'ana@empresa.cl',
    empresa: 'Empresa',
    cargo: 'Gerenta de TI',
    estado: 'reservado',
    precio_usd: 15,
    pagado: false,
    origen: 'hero',
    asunto: 'Cupo #1 reservado — complete el pago de USD 15',
    html: '<div>…</div>',
    respuesta: { ok: true, estado: 'reservado', cupo: 1, restantes: 19 }
  }]
});

const guardarReserva = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Guardar la reserva',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: { __rl: true, mode: 'id', value: TABLA, cachedResultName: 'reservas_ebook_iso27001' },
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'correo', condition: 'eq', keyValue: expr('{{ $json.correo }}') }]
      },
      columns: {
        mappingMode: 'defineBelow',
        matchingColumns: ['correo'],
        value: {
          fecha: expr('{{ $json.fecha }}'),
          numero: expr('{{ $json.numero }}'),
          nombre: expr('{{ $json.nombre }}'),
          correo: expr('{{ $json.correo }}'),
          empresa: expr('{{ $json.empresa }}'),
          cargo: expr('{{ $json.cargo }}'),
          estado: expr('{{ $json.estado }}'),
          precio_usd: expr('{{ $json.precio_usd }}'),
          pagado: expr('{{ $json.pagado }}'),
          origen: expr('{{ $json.origen }}')
        },
        schema: ESQUEMA
      },
      options: {}
    },
    notes: 'Upsert por correo en vez de insert: el mismo correo dos veces actualiza su fila, nunca duplica.'
  },
  output: [{ id: 1, correo: 'ana@empresa.cl', numero: 1 }]
});

const responderReserva = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder al navegador',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify($(\'Decidir cupo y correo\').first().json.respuesta) }}'),
      options: {}
    },
    notes: 'Va después de guardar y antes de Gmail: el navegador confirma rápido y el correo no bloquea.'
  }
});

const correoConfirmacion = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Correo de confirmación',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $(\'Decidir cupo y correo\').first().json.correo }}'),
      subject: expr('{{ $(\'Decidir cupo y correo\').first().json.asunto }}'),
      emailType: 'html',
      message: expr('{{ $(\'Decidir cupo y correo\').first().json.html }}'),
      options: { appendAttribution: false, senderName: 'Rodrigo Figueroa' }
    },
    credentials: { gmailOAuth2: { id: 'cYhcyiH1LcyrXUWz', name: 'Gmail OAuth2 API' } },
    notes: 'Si Gmail falla la reserva ya está guardada y el navegador ya recibió su confirmación.'
  },
  output: [{ id: 'msg-1', threadId: 'thread-1' }]
});

const cuposEntrante = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Consulta de cupos',
    parameters: {
      httpMethod: 'GET',
      path: 'ebook-iso27001/cupos',
      responseMode: 'responseNode',
      options: { allowedOrigins: ORIGEN_LANDING, ignoreBots: true }
    },
    notes: 'Lo llama la landing al cargar, para el contador del hero y del cierre.'
  },
  output: [{ query: {} }]
});

const leerCupos = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Leer cupos tomados',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: TABLA, cachedResultName: 'reservas_ebook_iso27001' },
      matchType: 'allConditions',
      filters: {
        conditions: [{ keyName: 'estado', condition: 'eq', keyValue: 'reservado' }]
      },
      returnAll: true
    }
  },
  output: [{ id: 1, correo: 'ana@empresa.cl', estado: 'reservado' }]
});

const contarCupos = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Contar cupos',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: CODIGO_CUPOS }
  },
  output: [{ total: 20, tomados: 1, restantes: 19, precio: 15, precio_normal: 25, link_pago: 'https://www.webpay.cl/form-pay/420561' }]
});

const responderCupos = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder cupos',
    parameters: { respondWith: 'firstIncomingItem', options: {} }
  }
});

const notaPago = sticky(
  '## Antes de activar\n\nEditar `LINK_PAGO` en **Decidir cupo y correo**. Mientras diga `PENDIENTE`, el correo de confirmación manda a la gente a una URL que no existe.',
  [decidirCupo],
  { color: 3 }
);

export default workflow('ebook-iso27001-reservas', 'Ebook IA Segura ISO 27001 · Reservas (GitHub Pages)')
  .add(reservaEntrante)
  .to(leerReservas)
  .to(decidirCupo)
  .to(guardarReserva)
  .to(responderReserva)
  .to(correoConfirmacion)
  .add(cuposEntrante)
  .to(leerCupos)
  .to(contarCupos)
  .to(responderCupos)
  .add(notaPago);
