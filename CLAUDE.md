# Isla & Barra Control — contexto para Claude Code

## Qué es
Herramienta privada de consultoría para hostelería (bares, restaurantes, hoteles, cafeterías, coctelerías) de la marca **Isla & Barra** («Ideas digitales para hostelería»). La usa **una sola persona, el consultor**, sobre todo **desde el móvil durante las visitas** a establecimientos: registrar compras, ver el coste de un cóctel, documentar incidencias y preparar informes. No sustituye el criterio del consultor. Si existe `docs/prompt_maestro.md`, léelo: es el encargo original completo.

## Archivo y arquitectura
- Un único archivo: `isla_barra_control_mvp.html` (HTML + CSS + JavaScript, sin dependencias ni framework). Mantenerlo así mientras sea suficiente; no añadir frameworks ni servicios de pago sin justificarlo.
- Datos en `localStorage` del navegador (clave `islaBarraControlMVP_v1`, esquema 5). **No hay sincronización entre dispositivos**: no afirmar lo contrario. La copia JSON (Exportar/Importar) es la única forma de mover datos.
- Los datos reales del usuario viven en su navegador: todo cambio de esquema debe migrarse en `normalize()` y probarse con copias antiguas (`tests/fixtures/legacy.json`).
- Protección: si al abrir la página `localStorage` devuelve vacío y luego aparecen datos, `recoverStored()` los recupera y `save()` no escribe encima sin recuperarlos antes.
- El bar ficticio va embebido en el HTML (`<script type="application/json" id="demoData">`); lo escribe `tools/make_demo.py`, no editarlo a mano.
- Confirmaciones siempre dentro de la página (`askConfirm`), nunca `confirm()`: los visores integrados bloquean los diálogos sin avisar.
- Mapa del código (todo en el `<script>`): datos `normalize, loadData, save`; costes `recipeLineCost, directCost, netPrice, gross, margin, costPct, recipeIssues, drinkFlag`; ingredientes `ingredientFromForm, deleteIngredient (archiva si se usa), renderIngredients`; recetas `renderRecipeLines`; ventas `theoSales, syncSales, renderSales`; stock `stockCalc, stockWarnings, stageOf, trendGroups, prevOf, followHTML`; informe `renderReport, followReport, pendingData, markReportReviewed`; primer uso y ejemplo `hasContent, loadDemo, exitDemo, startOwn, renderFirstUse, askConfirm`; guía `guideSteps, renderGuide`; qué mirar `lookSignals, renderLookNow`; ayudas `HELP, initHelp`; vista `applyMode, setMode, setAdv, syncUnitOptions`; bebida en vivo `liveDrinkPreview`; arranque rápido `QUICK_FORMATS, STARTER, SUGGESTIONS, addStarterIngredients, applySuggestion`; marca `normBrand, applyBrand, shrinkImage, brandContrast`; copias `renderBackupStatus, recoverStored`; taxonomía `TAXONOMY_DEFAULT, normTaxonomy, migrateCategory, renderCategoryOptions, renderSubOptions`; Mi barra `renderBar, renderBarManage, renameSub, toggleSub, addSub, setSubField`; formatos y precios `findFormat, parseFormat, parsePrice`; alta rápida `quickAddHTML, quickSave, quickSaveFormats`; pegar lista `parseLine, suggestSub, pasteIssues, reviewPaste, addPasted`; plantillas `TEMPLATES, applyTemplate, chooseTemplate`; clasificar `buildClassify, applyClassify`; ayudas editables `helpText, saveHelpTexts, HELP_KEYS` (debe coincidir con las claves de `HELP`); diagnóstico `normDiag, diagFromForm, diagProblem, editDiag, renderDiagnostics`; copias `exportBackup, importBackup`.

## Modelo de datos (esquema 5)
`data = {schema, settings:{marginMin,mode('simple'|'full'),brand:{name,logo,color,footer},lastBackupAt,started,guideHidden,taxonomy[],template,help{}}, sales[], ingredients[], business{…,isDemo,reportReviewedAt}, drinks[], stocks[], diagnostics[]}`
- Esquema 4 añadió `settings.mode` (sin modo: completa si hay datos, sencilla si no), `settings.brand` (por defecto Isla & Barra; color con contraste < 4,5:1 o logo no válido se corrigen al cargar), `settings.lastBackupAt` (ISO; al exportar = `exportedAt`), `settings.started`, `settings.guideHidden`, `business.isDemo` y `business.reportReviewedAt`.
- Esquema 5 añadió `ingredient.subcategory` y `settings.taxonomy` = `[{name, formats:[«70 cl»…], subs:[{name, one (singular del botón «Añadir …»), keywords[], hidden}]}]`, más `settings.template` y `settings.help` (textos de ayuda editados). Migración: las categorías antiguas pasan a las nuevas (`OLD_CATEGORIES`; «Vino / cerveza» según el nombre) y `subcategory` queda vacía. Los ingredientes guardan categoría y subcategoría por nombre: renombrar una sección renombra la de sus productos.
- ingredient: `{id,name,category,subcategory,supplier,format,unit('ml'|'g'|'unit'),packUnit,packInput,packQty(en unidad base),packPrice,unitCost,notes,active}`
- drink: `{id,name,category,price,taxRate,otherCost,recipeItems:[{ingredientId,qty}],ingredientCost(copia),recipe,notes}`
- sales: `{id,label,start,end,lines:[{drinkId,qty}]}`
- stock (control): `{id,date,start,end,product,unit,opening,purchases,closing,salesUse,tastings,comps,waste,otherOut,legitUse,threshold,status('Validados'|'Sin validar'),salesId,hypothesis,causeState,cause,action,result,notes,actual,theoretical,variance}`
- diagnostics: `{id,area,status('Pendiente'|'En revisión'|'Verificado'|'Resuelto'),finding,evidence,action,check,priority('Alta'|'Media'|'Baja'),due,owner,result}`. Esquema 3 añadió `evidence`, `owner` y `result`; las copias antiguas se migran con textos vacíos en `normDiag()`.

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
- Bar de ejemplo: con datos reales, cargarlo pide confirmación y guarda antes una copia interna (`_antes_del_ejemplo`); «Empezar con mis datos» borra solo el ejemplo y restaura esa copia si existe. Nunca se mezclan ejemplo y datos reales.
- Mi barra: dar de alta es rellenar estantes. Formatos (`parseFormat`: 70 cl = 700 ml, 0,7 L, 1 L, 24 × 33 cl = 7920 ml, 500 g, 12 uds…), botones de formato, palabras para sugerir, texto de cada botón y textos de ayuda son editables. Se puede guardar sin precio (queda «Sin precio»). «Pegar una lista» y «Clasificar mis ingredientes» no guardan nada hasta confirmar. Las plantillas por tipo de negocio solo deciden qué secciones se ven: no imponen productos, recetas ni precios ni ocultan secciones propias.
- Lenguaje de orientación: «Qué mirar ahora» y la bebida en vivo hablan de señales para revisar, sin «bueno/malo»; el margen siempre aclara que no es beneficio. Las recetas de arranque son sugerencias, no recetas universales, y el catálogo inicial va sin precios.
- Diagnóstico: un hallazgo exige evidencia (dato u observación que lo respalda) y recomendación; «Verificado» o «Resuelto» exigen el resultado de la revisión. El informe separa evidencia (hecho), recomendación, cómo comprobarla y resultado; sin resultado no se concluye el efecto ni se estiman ahorros.

## Ejemplos de prueba obligatorios
A) Ron 700 ml a 14 € → 0,02 €/ml; 50 ml = 1 €. B) Precio 9 €, coste 2,10 € → margen 6,90 €, coste 23,33 %, margen 76,67 %. C) Stock 7000 + 2800 − 3500 = 6300 real; teórico 5000 + 800 = 5800; desviación +500 (se muestra y se pide validar; no se afirma pérdida).

## Fuera de alcance por ahora
Suscripciones y pagos, usuarios avanzados, acceso de clientes, sincronización remota, apps nativas, IA que diagnostique sin supervisión, integraciones con TPV o contabilidad, gestión de personal, facturación.

## Identidad visual
Azul atlántico #0E4A5A (principal), turquesa #2A9D8F, arena #D9B382, crema #F6F1E8, carbón #282828. Tipografías previstas: Playfair Display (títulos) y Montserrat (interfaz); **hoy usa Georgia y la del sistema** (pendiente). Móvil primero (probar a 390 y 360 px), objetivos táctiles ≥ 44 × 44 px, contraste de texto ≥ 4,5:1 (`--teal-ink` para texto turquesa; `--teal` solo decorativo), foco visible y sin desbordamiento horizontal. Navegación móvil: Resumen, Bebidas, Mi barra (con acceso a la lista completa de ingredientes), Stock y Más (Ficha, Diagnóstico, Informe, Ajustes). Desplazamientos sin animación si el sistema pide reducir el movimiento.

## Cómo trabajar
- Leer el código antes de modificarlo; no reconstruir lo que ya funciona. Entregar el archivo completo actualizado.
- No afirmar que algo funciona si no se ha ejecutado. Cada función nueva lleva validación y pruebas.
- Explicar las decisiones técnicas en lenguaje claro; ante una decisión de arquitectura importante, dar alternativas y recomendar una.
- Si falta información imprescindible, hacer una pregunta concreta en lugar de inventar. Sin presentaciones comerciales: herramienta funcional.
- Responder en español.
- **Regla de pruebas por interfaz:** toda acción crítica debe poder hacerse en móvil (390 px) solo con toques, y `tests/ui.test.js` debe comprobarlo sin llamar a funciones de la app (`showPage`, `exportBackup`…): llegar a cada pantalla (Mi barra y su lista completa; Ficha, Diagnóstico, Informe y Ajustes por «Más»), Importar, Exportar copia, guardar ingrediente, bebida, control de stock y hallazgo, Ver informe (desde el Resumen), Imprimir / guardar PDF (se invoca `window.print`) y Descargar informe TXT. Si una acción nueva o existente no es alcanzable por toques, avisar al usuario en lugar de ocultarla o probarla llamando a la función.

## Pruebas
`npm install`, `npx playwright install chromium` y `npm test`: 8 series (500 comprobaciones, Chromium a 390 px; `guide` y `bar` también a 360 px).
- `base`: cálculos, ingredientes, recetas, stock, informe, copias y fallos de almacenamiento.
- `demo`: importa el bar ficticio y lo compara con un cálculo independiente hecho en Python.
- `sales`: consumo teórico automático desde ventas y recetas.
- `cycle`: seguimiento de desviaciones y comparación de controles.
- `diag`: diagnóstico (formulario y validación, edición, migración de copias antiguas, informe, 390 px).
- `ui`: interfaz en móvil (emulación de iPhone, solo toques): llega a cada pantalla y usa las acciones críticas.
- `guide`: primer uso y orientación, solo toques a 390 y 360 px con el reloj fijado en 2026-10-21: bienvenida, ejemplo y salida, guía, «Qué mirar ahora», ayudas, vista sencilla/completa, bebida en vivo, arranque rápido, marca, navegación, recordatorio de copia, migración desde el esquema 3, desbordamiento, botones ≥ 44 px y contraste.
- `bar`: Mi barra, solo toques a 390 y 360 px: migración desde el esquema 4, taxonomía, secciones y recuentos, editar secciones, alta rápida y conversiones (70 cl, 1 L, 24 × 33 cl, 0,7 L), «Guardar y añadir otra», sin precio, pegar una lista (formatos variados, comas decimales, líneas vacías, duplicados, filas con error; nada se guarda antes de confirmar), plantillas, asistente de clasificación, guía «Rellena tu barra», editables, desbordamiento, botones ≥ 44 px y contraste.
- `npm test` sirve la app por `http://127.0.0.1` (servidor estático de `run_all.js`). Con `file://`, el `localStorage` de los contextos efímeros de Playwright se vaciaba a veces al recargar (≈ 2 de cada 12 ejecuciones de `diag`; 0 de 25 por http). Cada serie también acepta una ruta de archivo para depurar, pero con `file://` puede fallar así de forma intermitente.
- Notas para escribir pruebas: en emulación móvil, `innerWidth` crece si algo se sale; mide el desbordamiento contra `page.viewportSize().width`. Las semillas de `localStorage` en `addInitScript` solo deben actuar en la primera carga de la página de la app (marca en `window.name`). Los contextos usan `reducedMotion:'reduce'`. No pongas comentarios `//` en mitad de una línea con más código: anulan el resto. Tocar el resumen de un `<details>` abierto lo cierra: comprueba `open` antes. En manejadores en línea dentro de un `<form>`, un `id` de campo tapa a la función del mismo nombre (por eso el alta rápida usa `quickSave` y el botón `#qaSave`).
`python3 tools/make_demo.py` regenera `data/` (bar ficticio con categorías y subcategorías, y valores esperados) y el bar embebido en el HTML. Las pruebas fallidas devuelven código de salida distinto de 0.

## Estado y pendientes
Hecho: ficha, ingredientes (conversión de unidades, archivar, buscar y filtrar), recetas con costes vivos, bebidas con impuesto incluido y avisos, ventas por periodo, control de stock con seguimiento y comparación, diagnóstico completo (evidencia, responsable, resultado de la revisión), informe con pendientes y marca «revisado», primer uso con bar de ejemplo embebido, guía de inicio de 6 pasos, «Qué mirar ahora», ayudas «?», vista sencilla/completa, bebida en vivo, formatos rápidos, catálogo inicial y recetas sugeridas, «Mi barra» (estantes por subcategoría, alta rápida, pegar una lista, plantillas por tipo de negocio y asistente de clasificación), marca personalizable, recordatorio de copia, copias con validación (Exportar e Importar también en el Resumen y en Ajustes; Importar es un `<label>` del campo de archivo y confirma dentro de la página, sin `confirm()`, para que funcione en navegadores integrados y visores que bloquean diálogos).
No verificado: móvil real (todo se ha probado en Chromium con emulación de iPhone); guardado como PDF y descargas en iOS/Android; selector de color y de imagen del logo en iOS; tipografías de marca.
Límites conocidos: los precios con separador de miles («1.234,50») no se reconocen al pegar una lista (se marcan como no válidos); no hay registro de compras (se usan formatos de ingrediente y entradas de stock); las ventas se anotan a mano; un único umbral de margen.
Orden propuesto: 1) umbral de margen por categoría, 2) prueba en móvil real y fuentes de marca, 3) registro de compras y movimientos, 4) publicar como página privada con enlace (decisión de arquitectura pendiente: exponer alternativas y recomendar una).
