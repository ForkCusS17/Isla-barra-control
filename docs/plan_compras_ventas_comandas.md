# Compras, ventas del TPV y comandas: análisis y plan por fases

Estado: **aprobado** (30-10-2026). Hecho: paso 1 (0.3.2) y paso 2, registro de compras (0.4.0). Siguiente: paso 3, prototipo de lectura automática con facturas reales. No hay código escrito. Partimos de la versión 0.3.1 con `npm test` en verde.

## 1. De dónde partimos

**Lo que ya hace la app:**
- **Mi barra** guarda cada producto con su formato y su precio (`packQty`, `packPrice`, `unitCost`), y su coste alimenta las recetas.
- **Ventas** (`sales`): periodos con líneas `{drinkId, qty}` tecleadas a mano. `theoSales()` las convierte en consumo teórico de cada producto usando las recetas.
- **Control de stock**: las entradas (`purchases`) son **un número escrito a mano** en cada control; no hay registro de compras.
- **Nube:** cada bar se guarda como un único JSON (máximo 5 MB) con historial de 30 versiones. En el dispositivo vive en `localStorage`, que tiene unos 5 MB en total.
- **Límite conocido:** `parsePrice` no entiende precios con separador de miles («1.234,50»). Las facturas y los TPV los usan a menudo, así que hay que arreglarlo antes.

**Lo que más trabajo manual cuesta hoy:**
1. Teclear las ventas de cada periodo.
2. Sumar a mano las compras de cada producto para el control de stock.
3. Actualizar los precios de compra cuando el proveedor los cambia.

## 2. Cómo trabaja el bar (lo que el diseño debe respetar)

### Compras
- **Factura y albarán:** el proveedor entrega un albarán y factura después, a menudo una vez al mes. Para el stock cuenta la **fecha de entrega**; para el coste, el **precio de la factura**.
- **Unidad de compra:** se compra por caja, pack o barril, no por botella. «Caja 6 × 70 cl», «barril 30 L» o «pack 24 × 20 cl» se tienen que convertir a la unidad base (ml, g o unidad) con la misma lógica que `parseFormat`.
- **Líneas que no son producto:** descuentos por línea y al pie, rappels, bonificaciones («12 + 1 gratis»), envases retornables (cascos, depósito de barril) y portes. Ninguna es un producto, pero algunas cambian el coste real.
- **IGIC:** las facturas canarias lo llevan, a veces con tipos distintos por línea. Hay que decidir si el coste de «Mi barra» va con o sin impuesto (pregunta 2).
- **Nombres del proveedor:** no coinciden con los de «Mi barra» («BEEFEATER 70CL 40%» frente a «Ginebra Beefeater»). Hace falta recordar la equivalencia por proveedor (alias) para no emparejar a mano cada mes.
- **Qué precio manda:** el último, el medio ponderado o el de la compra más antigua (FIFO). Para el escandallo suele interesar el último (lo que cuesta reponer); para valorar el inventario, el medio. Hay que decidirlo (pregunta 3).

### Ventas del TPV
- **Cómo se ticka:** el camarero marca un artículo del TPV, que no siempre corresponde a una receta. Ejemplos:
  - artículos genéricos («Copa», «Combinado»);
  - variantes con suplemento («+ Premium», «+ Red Bull»);
  - medias y enteras;
  - happy hour (mismo artículo a otro precio);
  - invitaciones (a 0 € o con descuento del 100 %);
  - anulaciones y abonos (cantidades negativas);
  - artículos sin receta (tapas, cafés de máquina).
- **Calidad del dato:** depende de cómo esté configurado el TPV, no de una persona. La app debe enseñar «artículos sin receta» y «artículos genéricos» como **datos que revisar**, nunca como culpa de alguien. Una desviación sigue sin demostrar pérdidas ni robos.
- **Datos del personal:** muchos informes de TPV llevan ventas por camarero. **No se importa esa columna**: no es necesaria, son datos personales y la gestión de personal está fuera de alcance.

### Las cuentas del dueño
- Necesita el coste de cada copa con el precio de compra actual, las entradas del periodo sin sumar a mano y el consumo teórico salido de lo vendido.
- Los márgenes siguen siendo **brutos, no beneficio**, y la app **no promete ahorros**.

## 3. Fase A: facturas de compra

### Qué hace (para todas las alternativas)
1. **Subir la factura:** «Nueva factura» → foto con la cámara o PDF. Se guarda asociada al bar.
2. **Cabecera:** proveedor, número, fecha de factura, fecha de entrega, base, IGIC y total.
3. **Líneas:** texto del proveedor, cantidad, formato de compra, precio, descuento y tipo de IGIC. Cada una se empareja con un producto de «Mi barra», se marca como «no es producto» (portes, envases) o se crea «Sin precio» (como la biblioteca).
4. **Confirmación línea a línea:** nada cambia en «Mi barra» hasta confirmar. Antes se ve, por ejemplo: «Ginebra Beefeater: 0,0200 €/ml → 0,0214 €/ml (+7 %)».
5. **Comprobaciones antes de confirmar:**
   - suma de líneas = base;
   - base + IGIC = total;
   - fecha que no sea futura;
   - número de factura no repetido para ese proveedor;
   - unidades compatibles.
6. **Al confirmar:**
   - se actualiza el coste del producto (según la regla elegida);
   - se guarda el histórico de precios;
   - las cantidades quedan como **entradas** para el control de stock. El control ofrece «Sumar compras del periodo» y sigue siendo editable; un control ya guardado conserva su copia y no cambia solo.
7. **Registro de compras:** lista por proveedor y por periodo, con filtros.

### Alternativas para leer la factura

| | A1. Manual con foto al lado | A2. OCR en el móvil (Tesseract.js) | A3. Servicio de lectura de facturas (Google, Azure, AWS, Mindee…) | A4. Modelo de IA con visión (por ejemplo, Claude) desde una función del servidor |
|---|---|---|---|---|
| **Qué devuelve** | Lo que teclea el usuario, con ayudas: alias, formatos y totales | Texto suelto, sin tabla; hay que adivinar columnas | Campos y líneas ya estructurados | Campos y líneas en JSON, con el formato que pidamos |
| **Fiabilidad esperada** | Total (la pone la persona) | Baja con fotos de móvil torcidas o arrugadas y tablas densas. **Sin probar** | Buena en facturas limpias; peor en tiques arrugados. **Sin probar** con proveedores canarios | Buena en formatos variados, pero **puede inventar o leer mal cifras**: obliga a cuadrar totales y confirmar. **Sin probar** |
| **Sin conexión** | Sí | Sí, tras descargar el modelo | No (queda en cola) | No (queda en cola) |
| **Archivo único HTML** | Sí | No: necesita el motor (WebAssembly), su worker y el idioma español como archivos aparte, de varios MB | Sí: la app solo llama a nuestra función | Sí, igual |
| **Cambios en la CSP** | Ninguno | Añadir `'wasm-unsafe-eval'` en `script-src` y ajustar `worker-src` | Ninguno: misma dirección de Supabase (`/functions/v1`) | Ninguno, igual |
| **Coste** | 0 € | 0 € | Por página; ver la tarifa vigente de cada proveedor | Por factura (fracciones de céntimo a céntimos); ver la tarifa vigente |
| **Privacidad** | La factura solo va a Supabase | No sale del móvil | Nuevo subencargado; elegir región UE y contrato de tratamiento | Nuevo subencargado; revisar región, retención y contrato |
| **Claves secretas** | No | No | Sí, solo en Supabase (función del servidor), nunca en la app | Igual |

**Limitaciones comunes a cualquier lectura automática:**
- Letra pequeña, fotos con reflejos, varias páginas, facturas con albaranes adjuntos.
- Abreviaturas del proveedor; descuentos al pie que hay que repartir entre las líneas.
- Envases retornables mezclados con producto.
- Facturas escritas a mano (proveedores pequeños).

Ninguna se da por buena sin probarla con facturas reales. Por eso la lectura automática siempre rellena un **borrador** que la persona confirma, como en A1.

**Recomendación para la fase A:**
1. Hacer primero **A1**. Es la base que cualquier OCR necesita: borrador, alias, conversiones, cuadre de totales y confirmación.
2. Después, **un prototipo fuera de la app** con 15-20 facturas reales anonimizadas de 4-5 proveedores, comparando A2 y A4 (y A3 si se quiere).
3. Medir el porcentaje de campos correctos y el tiempo que ahorra frente a teclear. Decidir con esos datos.

## 4. Fase B: ventas del TPV

### Qué hace
1. **Importar:** en «Stock → Ventas», «Importar ventas del TPV»: CSV o Excel (.xlsx) con lo vendido en un periodo (informe de «ventas por artículo»).
2. **Asistente de columnas:**
   - se eligen artículo, cantidad y, si hay, importe y familia;
   - detecta separador (`;`, `,` o tabulador), decimales con coma, miles con punto, comillas, BOM y codificación (UTF-8 o Windows-1252, habitual en TPV españoles);
   - se recuerda por TPV, así la segunda vez no se pregunta.
3. **Emparejar artículos del TPV con bebidas de «Mi carta»:**
   - con alias recordados;
   - los artículos sin receta se listan aparte y no cuentan;
   - los genéricos se marcan para revisar.
4. **Casos especiales:**
   - las anulaciones restan;
   - las invitaciones se pueden llevar a «Invitaciones» del control en vez de a ventas;
   - las variantes con suplemento suman su receta.
5. **Resultado:** un **periodo de ventas normal** (`sales`), así que `theoSales()` y el control de stock funcionan como hoy, sin reconstruir nada.
6. **Resumen de importación:** filas leídas, emparejadas, sin receta y descartadas. No se guarda nada hasta confirmar, como en «Pegar una lista».

### Formatos
- **CSV:** lo exportan casi todos los TPV. Es la vía principal.
- **Excel .xlsx:** es un zip con XML. Se puede leer sin librerías con `DecompressionStream('deflate-raw')` del navegador y `DOMParser`, unas 150-200 líneas propias. Hay que comprobarlo en Chromium, Firefox y WebKit (la integración continua ya prueba los tres).
- **Excel antiguo .xls:** no es viable sin una librería grande. Se pedirá exportar en CSV o .xlsx.
- **PDF:** no se importa. Muchos TPV solo imprimen el cierre en PDF, pero suelen tener otra exportación.

**TPV habituales en hostelería en España:** Ágora, Revo XEF, Glop, ICG (FrontRest/HioPos), Last.app, Camarero10, Numier, Cuiner, TPVPC, Hosteltáctil y, en locales pequeños, Loyverse, Square, SumUp o Lightspeed. **No conozco el formato exacto de sus exportaciones** y no lo voy a suponer. Hacen falta exportaciones reales (sin datos de clientes ni camareros) de los TPV de tus bares. El asistente de columnas sirve para todos aunque no conozcamos el formato de antemano.

### Alternativas
- **B1. Importación por archivo** (recomendada). Sin servidor, sin conexión, archivo único y sin cambios en la CSP.
- **B2. Conexión directa con la API del TPV.** Algunos la ofrecen. Requiere acuerdo con cada proveedor, credenciales del bar guardadas en el servidor (función de Supabase) y mantenimiento cuando cambie la API. Tiene sentido solo cuando un mismo TPV se repita en muchos bares.

## 5. Fase C: comandero virtual (solo análisis)

### Qué implicaría
- Pantalla por mesas o barra con las bebidas de «Mi carta».
- Envío a barra o cocina, estados (pedido, servido), varios dispositivos a la vez.
- Necesita **tiempo real**: hoy la app sincroniza un JSON entero con 1,2 s de retraso y conflictos, que no sirve para varias personas tomando comandas a la vez. Habría que añadir tablas propias y suscripciones en tiempo real de Supabase.
- Necesita **funcionar sin cobertura** en terraza y, a menudo, impresoras de cocina. Es otro producto.

### Normativa (no es consejo legal)
- La **Ley 11/2021 «antifraude»** y el **Real Decreto 1007/2023 (Veri\*factu)** regulan los sistemas informáticos que **expiden facturas**, y los tiques de bar son facturas simplificadas.
- **Fechas:** según el Real Decreto-ley 15/2025, la obligación empieza el 1-1-2027 para sociedades y el 1-7-2027 para el resto. Alguna fuente habla de un nuevo aplazamiento anunciado que aún no estaría en el BOE: confirmar en la AEAT.
- **Software de doble uso:** la ley prohíbe y sanciona el software que permite ocultar o alterar ventas, tanto a quien lo produce como a quien lo usa.
- Por eso, si se construye algo, debe ser **solo comanda**:
  - sin cobro;
  - sin importes al cliente;
  - sin pre-cuentas ni tiques impresos;
  - sin cierre de mesa con total.

  Aun así, un comandero que guarda lo servido **en paralelo** al TPV crea un segundo registro de ventas que no pasa por el sistema de facturación. Eso es justo lo que conviene que revise un profesional.
- **El ticado doble** (comandero y después TPV) duplica el trabajo del camarero, que es lo contrario de lo que buscamos.

### Comparación

| | Comandero propio (solo comanda) | Integrarse con el TPV del bar |
|---|---|---|
| Trabajo del camarero | Ticka dos veces o hay que conectarlo al TPV igualmente | Una vez, en su TPV de siempre |
| Riesgo legal | Necesita revisión profesional antes de usarse | El TPV ya es el sistema de facturación responsable |
| Esfuerzo | Muy alto: tiempo real, impresoras, sin cobertura | Fase B1 (archivo) ya cubre el análisis; B2 si se quiere automatizar |
| Valor para la consultoría | Bajo: el bar ya tiene TPV | Alto: datos reales de venta para el consumo teórico |

**Recomendación:** no construir el comandero. Cubrir la necesidad con la fase B (importar del TPV) y, si un TPV se repite mucho, estudiar su API (B2). Si más adelante hay un caso concreto, primero revisión legal y después un prototipo limitado a comanda sin importes.

## 6. Encaje con las reglas actuales

| Regla | A1 | A con OCR local | A con lectura en el servidor | B1 | C |
|---|---|---|---|---|---|
| Archivo único HTML | Sí | No (motor e idioma aparte) | Sí (función fuera de la app, como `schema.sql`) | Sí | Sí, pero con tablas nuevas |
| Sin conexión | Sí (cola de subida) | Sí | Lectura en cola | Sí | Parcial |
| CSP estricta | Sin cambios (`img-src blob:` ya está) | Añade `'wasm-unsafe-eval'` | Sin cambios | Sin cambios | Sin cambios |
| Accesibilidad AA | Sí (formulario por tarjetas a 390 px) | Sí | Sí | Sí | Difícil en uso rápido de sala |

### Detalles técnicos
- **Fotos:** se reducen en el móvil antes de subir (como `shrinkImage` del logo, pero a unos 1600 px y JPEG), unos 200-400 KB por página.
  - **PDF:** se guarda tal cual. No hay vista previa dentro de la app sin una librería grande; se abre en otra pestaña.
  - **Sin conexión:** las fotos se guardan en **IndexedDB** (no caben en `localStorage`) y se suben al volver la conexión.
- **Ver una foto:** la app la descarga con la sesión del usuario y la muestra como `blob:`, así no hay que abrir `img-src` a Supabase.
- **Tamaño de los datos:**
  - una factura con 15 líneas ocupa unos 3 KB; 50 facturas al mes suman unos 1,8 MB al año;
  - dentro del JSON del bar (límite de 5 MB, y además se guardan 30 copias en el historial), en 2-3 años no cabría;
  - **recomendación:** compras en **tablas propias** de Supabase, no dentro del JSON del bar;
  - en el dispositivo, copia en IndexedDB del último año.
- **Sin cuentas** (modo local): las compras funcionarían en el dispositivo. La copia JSON exportada llevaría las líneas pero **no las fotos**, que pesan demasiado; se avisaría.

## 7. Almacenamiento de las facturas (Supabase Storage)

- **Bucket privado `facturas`:**
  - ruta `<bar_id>/<factura_id>/<página>.jpg|pdf`;
  - límite por archivo de 10 MB;
  - tipos permitidos `image/jpeg`, `image/png`, `image/webp` y `application/pdf`. Se rechaza SVG o HTML disfrazado.
- **Coste:** según fuentes no oficiales (supabase.com no se puede abrir desde esta sesión; comprobar la página de precios).
  - **Plan gratuito:** 1 GB de archivos, unas 3.000 páginas de factura a 300 KB, con 50 MB máximo por archivo. **Los proyectos gratuitos se pausan tras una semana sin uso**, y eso ya afecta a la beta publicada.
  - **Plan Pro:** desde 25 $/mes con 100 GB incluidos y unos 0,021 $/GB adicional.
  - **Recomendación:** pasar a Pro antes de usar la app con bares reales a diario, haya o no facturas.
- **Qué cambia en privacidad:**
  - hasta ahora solo se guardaban datos de gestión del bar; ahora se guardan **documentos** con datos del proveedor (que puede ser un autónomo, es decir, una persona) y a veces del propio titular del bar;
  - hay que actualizar el texto de privacidad (qué se guarda, dónde, cuánto tiempo, quién lo ve, cómo se borra);
  - con lectura automática, hay que añadir al proveedor de OCR o IA como subencargado.
- **No es el archivo fiscal del bar:** el bar debe conservar sus facturas por su cuenta. La app guarda una copia de trabajo y debe decirlo.
- **Conservación:** cuando un bar deja de trabajar con Isla & Barra, se borran sus facturas tras un plazo acordado. Se necesita una función de administrador «Borrar facturas del bar».

## 8. Cambios en `supabase/schema.sql` (borrador, sin aplicar)

Tablas nuevas, con RLS y el mismo patrón que hoy (`is_admin`, `is_member`, `can_edit`):

| Tabla | Para qué | Leer | Escribir |
|---|---|---|---|
| `purchase_invoices` | Cabecera: proveedor, número, fechas, base, IGIC, total, estado (`borrador`/`confirmada`), rutas de archivos, quién y cuándo confirmó, si se aplicó el coste | admin y miembros del bar | admin y editores |
| `purchase_lines` | Líneas: texto, cantidad, formato, precio, descuento, IGIC, `ingredient_id` (id dentro del JSON del bar), tipo (producto, portes, envase, descuento) | igual | igual |
| `supplier_aliases` | Texto del proveedor → producto y conversión de formato | igual | igual |
| `pos_mappings` (fase B) | Columnas recordadas por TPV y alias artículo → bebida | igual | igual |

**Detalles:**
- **Storage:** políticas en `storage.objects` del bucket `facturas`: leer, subir, cambiar y borrar solo si `can_edit(<bar de la ruta>)` (administrador o editor; el lector no ve las fotos).
- **Factura única:** restricción por bar, proveedor y número.
- **Confirmar como una sola operación:** función `confirm_invoice(p_invoice)` para que una factura confirmada no se pueda editar y se marque una sola vez. Aplicar el coste en «Mi barra» toca el JSON del bar (otra escritura), así que la factura guarda «coste aplicado: sí/no» y la app lo reintenta si hubo conflicto.
- **Lector:** ve los datos del registro de compras, **no las fotos** (decidido), y no sube, no confirma y no borra. La política de lectura de Storage es `is_admin() or can_edit(<bar de la ruta>)`.
- **Fase B:** las ventas importadas se quedan en el JSON (`sales`); solo los alias van a tabla, porque se reutilizan.
- **Simulación:** `tests/supabase_mock.js` tendría que imitar Storage y las tablas nuevas con los mismos permisos.

## 9. Riesgos (no es consejo legal)

- **Protección de datos (RGPD/LOPDGDD):**
  - Isla & Barra trata datos de los bares como **encargado del tratamiento**, con contrato de encargo con cada bar;
  - Supabase y, si se usa, el servicio de lectura son **subencargados**;
  - hay que revisar las transferencias fuera de la UE;
  - minimizar: no importar columnas de camareros ni clientes del TPV, y no pedir datos de clientes finales.
- **Fiscal:** las fases A y B **reciben** datos (facturas recibidas, ventas ya facturadas por el TPV). No expiden facturas, así que en principio no son un sistema de facturación. El comandero sí roza esa normativa (sección 5).
- **Datos erróneos:** una lectura automática equivocada cambiaría costes. Por eso siempre hay borrador, cuadre de totales y confirmación, y el histórico permite ver qué cambió.
- **Interpretación:**
  - la desviación con ventas del TPV sigue siendo una señal que revisar;
  - el informe debe decir de dónde vienen las ventas (TPV, fecha y archivo) y qué artículos no se pudieron convertir.
- **Textos legales:** privacidad y condiciones de uso cambian; siguen pendientes de revisión profesional.

## 10. Plan recomendado por fases (actualizado con las respuestas del 30-10-2026)

Sin exportaciones de TPV disponibles, el orden pasa a ser **compras primero** y el TPV cuando haya archivos reales.

| Paso | Versión | Qué | Necesita |
|---|---|---|---|
| 1 | 0.3.2 | **Impuesto por producto** (esquema 7) y precios con miles («1.234,50») en `parsePrice` y pegar lista | Nada externo; todo en el dispositivo |
| 2 | 0.4.0 | **A1: registro de compras manual con foto**, alias por proveedor, coste confirmado línea a línea e histórico de precios, «Sumar compras del periodo» en el control de stock | Ejecutar el SQL nuevo en Supabase (tablas y bucket), textos de privacidad, revisar plan de Supabase |
| 3 | fuera de la app | Prototipo de lectura automática con facturas reales (OCR en el móvil frente a IA en el servidor) | 15-20 facturas anonimizadas |
| 4 | 0.5.0 | **B1: importar ventas del TPV** (CSV y .xlsx) | Al menos una exportación real de «ventas por artículo» |
| 5 | 0.6.0 | Lectura automática como relleno del borrador, si el prototipo lo justifica | |
| — | — | C: no construir el comandero; estudiar la API de un TPV (B2) si se repite en muchos bares | |

### Impuesto por producto (paso 1)
- Cada producto de «Mi barra» lleva:
  - **impuesto**: IGIC, IVA o ninguno;
  - **tipo** (%);
  - si el **precio escrito incluye** el impuesto o no.
- La app guarda las dos cifras, **coste sin impuesto** y **coste con impuesto**, calculadas desde lo escrito. El escandallo usa una de las dos según un ajuste por producto («El impuesto de este producto: se recupera / es coste»), que por defecto es «se recupera».
- **Migración:** los productos actuales quedan con «Impuesto: sin indicar» y su coste no cambia.
- Las facturas (paso 2) traen el impuesto de cada línea y lo proponen para el producto; se confirma como el resto.
- No se fija ningún tipo por defecto: los tipos de IGIC e IVA los decide el usuario.

### Regla de precio al confirmar una factura
- Propuesta por defecto, pendiente de confirmar: **el último precio** pasa a ser el coste del producto, con histórico de precios para ver la evolución.
- La media ponderada se puede añadir después como dato del informe, sin cambiar el escandallo.

## 11. Pruebas estimadas

| Serie nueva | Comprobaciones (aprox.) | Qué cubre |
|---|---|---|
| `tpv` (B1) | 90-120 | CSV: separadores, comillas, BOM, Windows-1252, decimales y miles, líneas vacías y repetidas. Excel .xlsx: generado en las pruebas y archivos hostiles (zip enorme, demasiadas filas). Asistente de columnas recordado, alias, anulaciones, invitaciones, sin receta, genéricos, periodo creado igual que a mano (comparado con `theoSales`), nada guardado sin confirmar, sin columnas de personal, 390 y 360 px, axe, CSP, rendimiento con 5.000 filas, en los 3 navegadores |
| `compras` (A1) | 120-160 | Formulario y validación, foto y PDF (tipos y tamaño, archivo disfrazado), conversiones de caja y barril, descuentos, portes y envases, IGIC y cuadre de totales, número repetido, confirmación línea a línea, coste aplicado e histórico, regla de precio elegida, «Sumar compras del periodo», control guardado que no cambia, cola sin conexión (IndexedDB), lector sin permisos, Storage simulado con permisos, borrado, 390 y 360 px, axe, CSP, rendimiento con 1.000 facturas |
| `cuentas` (ampliación) | 20-30 | Permisos de las tablas nuevas y de Storage con la simulación |
| Prototipo de lectura (paso 3) | Fuera de CI | Porcentaje de campos correctos sobre 15-20 facturas reales, que no se suben al repositorio |

Total: unas 250-300 comprobaciones nuevas, que llevarían la batería de unas 1.140 a unas 1.400-1.450.

## 12. Decisiones y preguntas

**Respuestas del 30-10-2026:**
1. Aún no hay acceso a exportaciones de TPV, así que la fase B espera.
2. El impuesto (IGIC, IVA o ninguno) se podrá indicar en cada producto.
3. El usuario «solo lectura» ve **solo los datos** de las compras, no las fotos de las facturas. En Storage solo pueden leer el administrador y los editores.

**Pendiente:** confirmar la regla de precio (último precio, propuesto por defecto).

## Fuentes consultadas (30-10-2026)
- Veri\*factu y aplazamiento: [Infoautónomos](https://www.infoautonomos.com/blog/verifactu-cuando-es-obligatorio-a-quien-afecta/), [Grupo Albatros, RDL 15/2025](https://grupoalbatros.org/2026/02/23/verifactu-aplazamiento-2027-rdl-15-2025/), [Webpsilon (posible aplazamiento a 2028, sin BOE)](https://www.webpsilon.com/blog/verifactu-que-es-cuando-entra-en-vigor-y-a-quien-afecta/), [Cruz Guillén Abogados](https://cruzguillenabogados.com/aplazamiento-verifactu-2027-fechas-claves/).
- Veri\*factu en hostelería y comandas: [Guía Facturación](https://guiafacturacion.es/verifactu/sectores/hosteleria/), [Tipsi TPV](https://tipsitpv.com/preguntas-frecuentes-verifactu-hosteleria/), [EWU](https://ewu.es/blog/verifactu-hosteleria-restaurantes-2027/). Son fuentes de terceros: contrastar con la FAQ de la sede de la AEAT.
- Precios de Supabase (no oficiales): [MakerKit](https://makerkit.dev/blog/saas/supabase-pricing), [Jetadmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/). La oficial es supabase.com/pricing.
- Tesseract.js y CSP: [issue de tesseract.js](https://github.com/naptha/tesseract.js/issues/961), [guía CSP de Nutrient](https://www.nutrient.io/guides/web/troubleshooting/content-security-policy/).
