# Isla & Barra Control

Abre `isla_barra_control_mvp.html` en el navegador. Los datos se guardan en ese navegador: exporta una copia de seguridad con regularidad («Exportar copia»).

Para probar con datos de ejemplo: «Importar» y elige `data/isla_barra_demo_bar_atlantico.json` (bar ficticio; sustituye los datos actuales).

## Desarrollo
Necesitas Node.js y Python 3.

    npm install
    npx playwright install chromium
    npm test

El contexto del proyecto y las reglas de trabajo para Claude Code están en `CLAUDE.md`. Guarda tu prompt maestro original en `docs/prompt_maestro.md`.
