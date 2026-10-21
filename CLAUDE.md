# Isla & Barra Control — contexto para Claude Code

## Qué es
Herramienta privada de consultoría para hostelería (bares, restaurantes, hoteles, cafeterías, coctelerías) de la marca **Isla & Barra** («Ideas digitales para hostelería»). La usa **una sola persona, el consultor**, sobre todo **desde el móvil durante las visitas** a establecimientos: registrar compras, ver el coste de un cóctel, documentar incidencias y preparar informes. No sustituye el criterio del consultor. Si existe `docs/prompt_maestro.md`, léelo: es el encargo original completo.

## Archivo y arquitectura
- Un único archivo: `isla_barra_control_mvp.html` (HTML + CSS + JavaScript, sin dependencias ni framework). Mantenerlo así mientras sea suficiente; no añadir frameworks ni servicios de pago sin justificarlo.
- Datos en `localStorage` del navegador (clave `islaBarraControlMVP_v1`, esquema 2). **No hay sincronización entre dispositivos**: no afirmar lo contrario. La copia JSON (Exportar/Importar) es la única forma de mover datos.
- Los datos reales del usuario viven en su navegador: todo cambio de esquema debe migrarse en `normalize()` y probarse con copias antiguas (`tests/fixtures/legacy.json`).
- Mapa del código (todo en el `<script>`): datos `normalize, loadData, save`; costes `recipeLineCost, directCost, netPrice, gross, margin, costPct, recipeIssues, drinkFlag`; ingredientes `ingredientFromForm, deleteIngredient (archiva si se usa), renderIngredients`; recetas `renderRecipeLines`; ventas `theoSales, syncSales, renderSales`; stock `stockCalc, stockWarnings, stageOf, trendGroups, prevOf, followHTML`; informe `renderReport, followReport, pendingData`; copias `exportBackup, importBackup`.

## Modelo de datos (esquema 2)
`data = {schema, settings:{marginMin}, sales[], ingredients[], business{}, drinks[], stocks[], diagnostics[]}`
- ingredient: `{id,name,category,supplier,format,unit('ml'|'g'|'unit'),packUnit,packInput,packQty(en unidad base),packPrice,unitCost,notes,active}`
- drink: `{id,name,category,price,taxRate,otherCost,recipeItems:[{ingredientId,qty}],ingredientCost(copia),recipe,notes}`
- sales: `{id,label,start,end,lines:[{drinkId,qty}]}`
- stock (control): `{id,date,start,end,product,unit,opening,purchases,closing,salesUse,tastings,comps,waste,otherOut,legitUse,threshold,status('Validados'|'Sin validar'),salesId,hypothesis,causeState,cause,action,result,notes,actual,theoretical,variance}`
- diagnostics: `{id,area,status,finding,action,check,priority,due}`

## Reglas de negocio (no cambiar sin hablarlo)
- Unidad base: ml, g o unidad; nunca mezclar unidades incompatibles.
- Coste unitario = precio del formato / cantidad del formato (en unidad base). Se guarda con precisión completa; la pantalla muestra hasta 4 decimales.
- Coste directo = Σ(cantidad × coste unitario) + otros costes directos. Precio neto = precio / (1 + impuesto %). Margen € = neto − coste; % coste y % margen sobre el neto; **sin porcentaje si el neto es 0**. Las medias ignoran bebidas sin precio.
- Distinguir siempre: coste de compra, coste unitario, coste de receta, coste consumido y valor del inventario.
- Stock: real = inicial + entradas − final; teórico = ventas + degustaciones + invitaciones + mermas + otras salidas (sin contar dos veces); desviación = real − teórico. Una desviación **no demuestra** pérdida, robo ni mala práctica: **no atribuir causas ni prometer ahorros**.
- Seguimiento de la desviación: detectada → datos validados → hipótesis → causa comprobada → acción → resultado. «Causa comprobada» exige datos validados y explicar cómo se comprobó.
- Los márgenes son brutos, no beneficio neto. Los umbrales son orientativos y configurables.
- Un control guardado conserva su consumo teórico calculado (copia); no se recalcula solo si cambian las recetas.
- Un ingrediente usado en recetas se archiva en vez de borrarse.
- El informe distingue hechos, hipótesis y conclusiones; incluye datos pendientes de verificar y fecha de generación.

## Ejemplos de prueba obligatorios
A) Ron 700 ml a 14 € → 0,02 €/ml; 50 ml = 1 €. B) Precio 9 €, coste 2,10 € → margen 6,90 €, coste 23,33 %, margen 76,67 %. C) Stock 7000 + 2800 − 3500 = 6300 real; teórico 5000 + 800 = 5800; desviación +500 (se muestra y se pide validar; no se afirma pérdida).

## Fuera de alcance por ahora
Suscripciones y pagos, usuarios avanzados, acceso de clientes, sincronización remota, apps nativas, IA que diagnostique sin supervisión, integraciones con TPV o contabilidad, gestión de personal, facturación.

## Identidad visual
Azul atlántico #0E4A5A (principal), turquesa #2A9D8F, arena #D9B382, crema #F6F1E8, carbón #282828. Tipografías previstas: Playfair Display (títulos) y Montserrat (interfaz); **hoy usa Georgia y la del sistema** (pendiente). Móvil primero (probar a 390 px), botones cómodos (≥ 40 px), sin desbordamiento horizontal.

## Cómo trabajar
- Leer el código antes de modificarlo; no reconstruir lo que ya funciona. Entregar el archivo completo actualizado.
- No afirmar que algo funciona si no se ha ejecutado. Cada función nueva lleva validación y pruebas.
- Explicar las decisiones técnicas en lenguaje claro; ante una decisión de arquitectura importante, dar alternativas y recomendar una.
- Si falta información imprescindible, hacer una pregunta concreta en lugar de inventar. Sin presentaciones comerciales: herramienta funcional.
- Responder en español.

## Pruebas
`npm install`, `npx playwright install chromium` y `npm test`: 4 series (117 comprobaciones, Chromium a 390 px).
- `base`: cálculos, ingredientes, recetas, stock, informe, copias y fallos de almacenamiento.
- `demo`: importa el bar ficticio y lo compara con un cálculo independiente hecho en Python.
- `sales`: consumo teórico automático desde ventas y recetas.
- `cycle`: seguimiento de desviaciones y comparación de controles.
`python3 tools/make_demo.py` regenera `data/` (bar ficticio y valores esperados). Las pruebas fallidas devuelven código de salida distinto de 0.

## Estado y pendientes
Hecho: ficha, ingredientes (conversión de unidades, archivar, buscar y filtrar), recetas con costes vivos, bebidas con impuesto incluido y avisos, ventas por periodo, control de stock con seguimiento y comparación, diagnóstico básico, informe con pendientes, copias con validación.
No verificado: móvil real; guardado como PDF en iOS/Android; tipografías de marca.
Límites conocidos: no hay registro de compras (se usan formatos de ingrediente y entradas de stock); las ventas se anotan a mano; Diagnóstico sin evidencia, responsable ni resultado de revisión; un único umbral de margen.
Orden propuesto: 1) Diagnóstico completo, 2) umbral de margen por categoría, 3) móvil y marca (fuentes), 4) registro de compras y movimientos, 5) publicar como página privada con enlace (decisión de arquitectura pendiente: exponer alternativas y recomendar una).
