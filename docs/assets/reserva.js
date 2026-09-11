/* Reservas del ebook "IA Segura ISO 27001".
 *
 * Un solo workflow de n8n atiende las dos rutas:
 *   GET  /cupos   -> { total, restantes, precio, precio_normal }  (contador del hero y del cierre)
 *   POST /reserva -> { ok, estado, cupo, restantes }              (la reserva)
 *
 * Regla de oro de esta página: si n8n no responde, la página NO se ve rota.
 * El contador se queda con el texto que ya venía en el HTML y el formulario
 * sigue enviable — quien reserva no tiene por qué enterarse de nuestros problemas.
 */
(function () {
  'use strict';

  var BASE         = 'https://keepsync-hub.app.n8n.cloud/webhook/ebook-iso27001';
  var URL_CUPOS    = BASE + '/cupos';
  var URL_RESERVA  = BASE + '/reserva';

  var TOTAL         = 20;
  var PRECIO        = 10;
  var PRECIO_NORMAL = 25;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var forms    = Array.prototype.slice.call(document.querySelectorAll('form.reserva'));
  var contadores = Array.prototype.slice.call(document.querySelectorAll('[data-cupos]'));

  /* ─────────────────────────  utilidades  ───────────────────────── */

  function pedir(url, opciones, ms) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var corte = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    if (ctrl) opciones.signal = ctrl.signal;
    return fetch(url, opciones)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { clearTimeout(corte); });
  }

  function estado(form, tono, texto) {
    var p = form.querySelector('.form-status');
    if (!p) return;
    p.className = 'form-status is-on is-' + tono;
    p.textContent = texto;
  }

  function limpiarEstado(form) {
    var p = form.querySelector('.form-status');
    if (p) { p.className = 'form-status'; p.textContent = ''; }
  }

  /* ─────────────────────────  contador de cupos  ───────────────────────── */

  function pintarCupos(restantes) {
    var texto;
    var agotado = restantes <= 0;

    if (agotado) {
      texto = 'Las ' + TOTAL + ' copias a USD ' + PRECIO + ' ya están tomadas. Precio actual: USD ' + PRECIO_NORMAL + '.';
    } else if (restantes === 1) {
      texto = 'Queda 1 copia de ' + TOTAL + ' a USD ' + PRECIO + '.';
    } else {
      texto = 'Quedan ' + restantes + ' de ' + TOTAL + ' copias a USD ' + PRECIO + '.';
    }

    contadores.forEach(function (el) { el.textContent = texto; });

    if (agotado) {
      forms.forEach(function (form) {
        var btn = form.querySelector('.btn-primary');
        if (btn) btn.textContent = 'Anotarme en la lista de espera';
        var micro = form.querySelector('.microcopy');
        if (micro) {
          micro.innerHTML = '<b>El precio de lanzamiento se agotó.</b> Le avisamos apenas el ebook esté ' +
                            'disponible a su precio normal de USD ' + PRECIO_NORMAL + '.';
        }
      });
    }
  }

  function cargarCupos() {
    pedir(URL_CUPOS, { method: 'GET', headers: { Accept: 'application/json' } }, 4000)
      .then(function (data) {
        var restantes = Number(data && data.restantes);
        if (isFinite(restantes)) pintarCupos(restantes);
      })
      .catch(function () {
        /* Silencio deliberado: se queda el texto estático del HTML. */
      });
  }

  /* ─────────────────────────  validación  ───────────────────────── */

  function validar(form) {
    var malos = [];

    ['nombre', 'email', 'empresa', 'cargo'].forEach(function (campo) {
      var input = form.elements[campo];
      if (!input) return;
      var valor = input.value.trim();
      var ok = campo === 'email' ? EMAIL_RE.test(valor) : valor.length > 1;
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) malos.push(input);
    });

    var consent = form.elements.consentimiento;
    if (consent && !consent.checked) malos.push(consent);

    if (malos.length) {
      malos[0].focus();
      estado(form, 'err', malos[0] === consent
        ? 'Necesitamos su autorización para escribirle y coordinar el pago.'
        : 'Revise los campos marcados: falta completar alguno o el correo no es válido.');
      return false;
    }
    return true;
  }

  /* ─────────────────────────  envío  ───────────────────────── */

  var MENSAJES = {
    reservado: function (d) {
      return 'Listo. Reservó el cupo #' + d.cupo + ' de ' + TOTAL + ' a USD ' + PRECIO +
             '. Le enviamos el link de pago por correo: tiene 48 horas para completarlo.';
    },
    ya_reservado: function (d) {
      return 'Este correo ya tenía reservado el cupo #' + d.cupo +
             '. Le reenviamos el link de pago, revise su bandeja de entrada.';
    },
    lista_espera: function () {
      return 'Los ' + TOTAL + ' cupos a USD ' + PRECIO + ' ya estaban tomados, así que lo dejamos en la ' +
             'lista de espera: le avisamos apenas el ebook salga a su precio normal de USD ' + PRECIO_NORMAL + '.';
    }
  };

  function enviar(form) {
    var btn = form.querySelector('.btn-primary');
    var textoBtn = btn ? btn.textContent : '';

    if (btn) { btn.disabled = true; btn.textContent = 'Reservando…'; }
    estado(form, 'wait', 'Guardando su reserva…');

    var cuerpo = {
      nombre:         form.elements.nombre.value.trim(),
      email:          form.elements.email.value.trim().toLowerCase(),
      empresa:        form.elements.empresa.value.trim(),
      cargo:          form.elements.cargo.value.trim(),
      consentimiento: form.elements.consentimiento.checked ? 'si' : 'no',
      website:        form.elements.website ? form.elements.website.value : '',
      origen:         form.dataset.origen || 'landing'
    };

    pedir(URL_RESERVA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo)
    }, 15000)
      .then(function (data) {
        var arma = data && MENSAJES[data.estado];
        if (!arma) throw new Error('respuesta inesperada');

        estado(form, 'ok', arma(data));

        /* La reserva quedó: se cierra el formulario para que nadie la mande dos veces. */
        Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
        if (btn) btn.textContent = 'Reserva registrada';

        if (typeof data.restantes === 'number') pintarCupos(data.restantes);
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = textoBtn; }
        estado(form, 'err',
          'No pudimos registrar la reserva. Vuelva a intentarlo en un momento o escríbanos a hola@keepsync.ai ' +
          'y la tomamos a mano.');
      });
  }

  /* ─────────────────────────  arranque  ───────────────────────── */

  forms.forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      limpiarEstado(form);
      if (validar(form)) enviar(form);
    });

    form.addEventListener('input', function (ev) {
      if (ev.target.getAttribute('aria-invalid') === 'true') {
        ev.target.setAttribute('aria-invalid', 'false');
      }
    });
  });

  cargarCupos();
})();
