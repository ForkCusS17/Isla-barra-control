# Isla & Barra Control

Abre `isla_barra_control_mvp.html` en el navegador. Los datos se guardan en ese navegador: exporta una copia de seguridad con regularidad («Exportar copia»).

La primera vez verás tres opciones: «Probar con un bar de ejemplo» (datos ficticios que se borran con «Empezar con mis datos»), «Empezar con mi bar» y «Recuperar una copia de seguridad». El mismo bar ficticio está en `data/isla_barra_demo_bar_atlantico.json`.

En «Mi barra» das de alta lo que tienes estante a estante (ginebras, rones, cervezas…): nombre, formato con un toque y precio de compra, o pegas una lista entera. En Bebidas, «Añadir desde la biblioteca» crea cócteles clásicos con tus productos: eliges los cócteles, revisas qué producto de tu barra usar en cada ingrediente y se calculan coste y margen. Las medidas son orientativas: ajústalas a tu barra («Receta» en cada bebida; «Restaurar medidas estándar» las devuelve a las originales).

En Ajustes (en el móvil, desde «Más») eliges el tipo de negocio, la vista sencilla o completa, la marca y los textos de ayuda.

## Instalar en el móvil
Abierta desde su dirección publicada, se instala en la pantalla de inicio (Más › Instalar la app tiene los pasos de iPhone y Android) y funciona sin conexión. En iPhone conviene instalarla: Safari puede borrar los datos de una web si pasan 7 días sin abrirla. Cuando hay una versión nueva aparece «Hay una versión nueva»; al actualizar, los datos se conservan. Los datos nunca salen del dispositivo: para pasarlos a otro móvil, «Exportar copia» e «Importar».

## Publicar (beta)
Se publica como sitio estático, sin servidor ni cuentas: subir `isla_barra_control_mvp.html`, `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` y `_headers`. Recomendado Cloudflare Pages o Netlify, que aplican las cabeceras de seguridad de `_headers`; en GitHub Pages solo actúa la CSP del `<meta>` del HTML. Tras cambiar el script o el estilo del HTML: `npm run stamp` (actualiza los hashes de la CSP).

## Desarrollo
Necesitas Node.js y Python 3.

    npm install
    npx playwright install chromium
    npm test                 # todas las series en Chromium
    npm run test:parallel    # varias series a la vez
    npx playwright install firefox webkit && npm run test:firefox && npm run test:webkit

El contexto del proyecto y las reglas de trabajo para Claude Code están en `CLAUDE.md`. Guarda tu prompt maestro original en `docs/prompt_maestro.md`.
