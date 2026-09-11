# IA Segura ISO 27001 — landing de lanzamiento

Landing de lanzamiento del ebook **IA Segura ISO 27001**, publicada en GitHub Pages.

- **URL:** https://keepsync-hub.github.io/ebook-ia-segura-iso27001/
- **Oferta:** las primeras **20 reservas** pagan **USD 10**; después el ebook queda en **USD 25**.
- **La landing reserva, no cobra.** El link de pago se manda por correo, con 48 h de plazo.

## Cómo está armado

HTML, CSS y JavaScript estáticos, sin build ni dependencias. La página no carga **nada**
desde dominios externos: ni fuentes, ni frameworks, ni analítica. El único request que sale
es al webhook de n8n.

```
docs/
  index.html          la página completa (la portada del ebook es un SVG inline)
  assets/styles.css   estilos
  assets/reserva.js   contador de cupos + envío del formulario
  assets/og.png       imagen para compartir en redes (1200×630)
  .nojekyll           evita que Jekyll procese assets/
n8n/
  reserva-ebook.workflow.js   código SDK del workflow, fuente de verdad
```

## Publicar

La página se sirve desde la carpeta `docs/` de `main`. Para activarla la primera vez:
**Settings → Pages → Source: Deploy from a branch → `main` / `docs`**. Después de eso, cada
push a `main` republica.

Para trabajar localmente:

```bash
python3 -m http.server 8099 -d docs
```

## El backend de las reservas

Un solo workflow de n8n, **Ebook IA Segura ISO 27001 · Reservas (GitHub Pages)**
(`pOFeY9pMl7ytQqxK`), con dos rutas:

| Ruta | Método | Devuelve |
|---|---|---|
| `/webhook/ebook-iso27001/cupos` | GET | `{ total, tomados, restantes, precio, precio_normal }` |
| `/webhook/ebook-iso27001/reserva` | POST | `{ ok, estado, cupo, restantes }` |

Las reservas se guardan en la Data Table `reservas_ebook_iso27001` (`3Spzbq8nEcvRFqSj`), que
es la fuente de verdad.

### Los tres estados de una reserva

| Estado | Cuándo | Qué recibe la persona |
|---|---|---|
| `reservado` | Quedan cupos | Cupo numerado y el link de pago, con 48 h |
| `ya_reservado` | El correo ya estaba | Su cupo original y el link de pago de nuevo |
| `lista_espera` | Los 20 están tomados | Aviso de que le escribimos al salir a USD 25 |

El guardado usa **upsert por correo**, así que el mismo correo dos veces actualiza su fila y
nunca duplica. El nodo `Responder al navegador` va después de guardar y antes de Gmail: la
persona recibe su confirmación rápido y un fallo de correo no le cuesta la reserva.

### Anti-spam

El formulario lleva un campo trampa `website`, oculto por CSS y fuera del foco. El webhook
descarta la petición antes de ejecutar un solo nodo si ese campo viene con algo o si el
correo no tiene forma de correo (`onlyRunIf`), y además ignora bots y sólo acepta peticiones
desde `https://keepsync-hub.github.io`.

### Si n8n no responde

La página no se rompe. El contador se queda con el texto estático del HTML ("Solo 20 copias
a este precio") y el formulario sigue enviable. Un fallo al enviar deja el formulario
reenviable y ofrece el correo de contacto como respaldo.

## Antes de activar el workflow

1. Editar `LINK_PAGO` en el nodo **Decidir cupo y correo** — mientras diga `PENDIENTE`, el
   correo de confirmación manda a una URL que no existe.
2. Activar el workflow en n8n.
3. Activar GitHub Pages (arriba).

## Pendiente (fase 2)

- Espejo de la Data Table a un Google Sheet, con un workflow programado aparte. Queda fuera
  del camino de la reserva a propósito: un fallo de credencial ahí no le cuesta una venta a
  nadie. Requiere crear una credencial de Google Sheets en n8n.
- Conciliación de pagos: marcar `pagado` y liberar los cupos vencidos a las 48 h.
