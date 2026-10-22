# Isla & Barra Control

Abre `isla_barra_control_mvp.html` en el navegador. Los datos se guardan en ese navegador: exporta una copia de seguridad con regularidad («Exportar copia»).

La primera vez verás tres opciones: «Probar con un bar de ejemplo» (datos ficticios que se borran con «Empezar con mis datos»), «Empezar con mi bar» y «Recuperar una copia de seguridad». El mismo bar ficticio está en `data/isla_barra_demo_bar_atlantico.json`.

En «Mi barra» das de alta lo que tienes estante a estante (ginebras, rones, cervezas…): nombre, formato con un toque y precio de compra, o pegas una lista entera. En Bebidas, «Añadir desde la biblioteca» crea cócteles clásicos con tus productos: eliges los cócteles, revisas qué producto de tu barra usar en cada ingrediente y se calculan coste y margen. Las medidas son orientativas: ajústalas a tu barra («Receta» en cada bebida; «Restaurar medidas estándar» las devuelve a las originales).

En Ajustes (en el móvil, desde «Más») eliges el tipo de negocio, la vista sencilla o completa, la marca y los textos de ayuda.

## Desarrollo
Necesitas Node.js y Python 3.

    npm install
    npx playwright install chromium
    npm test

El contexto del proyecto y las reglas de trabajo para Claude Code están en `CLAUDE.md`. Guarda tu prompt maestro original en `docs/prompt_maestro.md`.
