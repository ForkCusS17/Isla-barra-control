# Isla & Barra: resumen del proyecto (30-10-2026)

## Quién y qué
- **Marca:** Isla & Barra, «Ideas digitales para hostelería». Consultoría para bares, restaurantes, hoteles, cafeterías y coctelerías en Canarias.
- **Titular:** Samuel Garcia Gutierrez (Arrecife). Correo: info@islaybarra.es (app y web). Instagram: @islaybarra.hosteleria.
- **Dominio:** islaybarra.es, comprado en Hostalia, que también gestiona los DNS.
  - Web: https://islaybarra.es
  - App: https://app.islaybarra.es
  - Las dos están alojadas en Netlify.
- **Código:** repositorio GitHub `ForkCusS17/Isla-barra-control` (rama `main`). El archivo `CLAUDE.md` del repositorio tiene todas las reglas, la arquitectura y el estado al detalle: es lo primero que hay que leer.

## La app: Isla & Barra Control (versión 0.4.0)
Herramienta para el consultor, pensada para usarla desde el móvil en las visitas a los locales. Es un único archivo HTML, sin frameworks. Se instala en la pantalla de inicio y funciona sin conexión.

**Qué hace:**
- **Ficha del bar:** nombre, localidad y periodo analizado.
- **Mi barra:** productos por estantes, con alta rápida, pegar una lista, plantillas por tipo de negocio y clasificación automática. Calcula el coste por ml, g o unidad. Cada producto puede llevar su impuesto (IGIC, IVA o ninguno) y elegir si el escandallo usa el coste con o sin impuesto (0.3.2).
- **Mi carta:**
  - Las bebidas con su coste directo, margen bruto y avisos, filtradas por categoría, con buscador y orden.
  - Biblioteca de 35 cócteles clásicos con medidas orientativas.
  - Cada receta permite cambiar el producto o la medida.
  - Al añadir un cóctel se puede elegir cualquier producto de la barra para cada ingrediente, o crear uno nuevo con nombre, formato y precio.
  - «Revisar cócteles con mi barra» muestra qué producto usa cada ingrediente, avisa de lo que falta y permite cambiarlo en varios cócteles a la vez (0.3.3).
- **Compras y facturas (0.4.0):** foto o PDF de cada factura, líneas con producto, cantidad, envases e impuesto, cuadre con el total, revisión línea a línea y, al confirmar, el último precio pasa a Mi barra con histórico. Recuerda cómo llama cada proveedor a cada producto. Con cuentas, las facturas van a la nube y sus fotos solo las ven el administrador y los editores. Requiere volver a ejecutar `supabase/schema.sql` en Supabase.
- **Stock:** ventas del periodo, consumo teórico, control de stock (real frente a teórico) y seguimiento de las desviaciones.
- **Diagnóstico:** hallazgos con evidencia, recomendación, cómo comprobarla y resultado.
- **Informe:** se puede imprimir o guardar en PDF y descargar en TXT.
- **Ayudas de uso:**
  - Guía de inicio de 6 pasos, con una barra de progreso en cada pantalla.
  - «Qué mirar ahora».
  - Ayudas «?».
  - Vista sencilla o completa.
- **Copias de seguridad:** exportar e importar en JSON, y copias internas.

**Reglas de negocio** (están detalladas en CLAUDE.md):
- Los márgenes son brutos, no beneficio.
- Una desviación de stock no demuestra pérdidas ni robos, y nunca se prometen ahorros.
- Las medidas de la biblioteca son orientativas, nunca «oficiales».

**Cuentas y nube (0.3.0):**
- **Acceso:** hay que iniciar sesión y solo entra quien tiene acceso dado por Samuel; no hay registro abierto.
- **Administrador (Samuel):** ve «Mis bares», crea bares y da o quita acceso.
- **Usuarios de un bar:** son «Puede editar» o «Solo lectura» y solo ven su bar.
- **Datos:**
  - Cada bar se guarda en Supabase (proyecto `exdfobyizokiykxhhjpt`, servidores en Fráncfort).
  - Se sincroniza entre dispositivos.
  - Sin conexión sigue funcionando.
  - Si dos dispositivos guardan a la vez, la app pregunta qué datos conservar.
- **En Más → «Cuenta y bares»:** cambiar contraseña, sincronizar, cambiar de bar y cerrar sesión.
- **Configuración en Supabase:**
  - Tablas y permisos en `supabase/schema.sql`.
  - Guía en `docs/cuentas_supabase.md`.
  - La app solo lleva la clave pública «anon».
- **Para dar acceso a alguien:**
  1. En Supabase: Authentication → Users → Add user, con contraseña provisional y «Auto Confirm User».
  2. En la app: Mis bares → Usuarios → Dar acceso.
  3. La persona cambia la contraseña al entrar.

  Supabase no envía correos a los bares hasta que se configure un correo propio (SMTP).

**Seguridad y calidad:**
- Política de seguridad de contenido (CSP) estricta, sin JavaScript en atributos.
- Importaciones protegidas contra archivos maliciosos.
- Accesibilidad WCAG AA.
- Tipografías de marca (Playfair Display y Montserrat) servidas desde la propia app.
- Mientras sea beta, la app está fuera de los buscadores (noindex).

**Pruebas:** 21 series automáticas (1353 comprobaciones), solo con toques en móvil a 390 y 360 px. Las cuentas se prueban contra un Supabase simulado. GitHub ejecuta las pruebas en Chromium, Firefox y WebKit en cada cambio.

**Cómo se publica:**
1. `npm run publicar` genera `publicar.zip`.
2. Se arrastra a Netlify, en Deploys del proyecto **appislaybarra**.
3. Quien tenga la app abierta verá «Hay una versión nueva».

## La web: islaybarra.es
- **Página de inicio rehecha** en HTML y CSS ligero (sin React):
  - Titular «Que cada copa deje lo que tiene que dejar».
  - Calculadora de escandallo que funciona en la portada.
  - Servicios con «Qué te llevas» y método en 6 pasos («Primero medimos, después recomendamos»).
  - Sección de la app con una captura real.
  - Sobre Samuel, preguntas frecuentes y contacto por correo con plantilla.
- **Técnico:** datos para Google, sitemap y robots.txt. Funciona sin cookies ni analítica.
- **Archivos:** no están en el repositorio. Se suben como `web-isla-barra.zip` a otro proyecto de Netlify.

## Hostalia (DNS de islaybarra.es)
- `islaybarra.es` → registro A a `75.2.60.5` (Netlify).
- `www` → CNAME a `frolicking-speculoos-84d8e7.netlify.app` (la web).
- `app` → CNAME a `appislaybarra.netlify.app` (la app).
- Los registros de correo de Hostalia (MX, SPF, mx, pop3, imap, smtp, webmail) no se tocan.

## Plan aprobado (30-10-2026)
Compras, ventas del TPV y comandas: `docs/plan_compras_ventas_comandas.md`. Hecho: impuesto por producto (0.3.2), biblioteca con cualquier producto y «Revisar cócteles con mi barra» (0.3.3), registro de compras con foto (0.4.0). Siguiente: prueba de lectura automática de facturas con facturas reales. El TPV espera a tener una exportación real; el comandero no se construye.

## Pendiente
- **Legal y contenido:**
  - Revisión profesional de los textos legales; siguen marcados como provisionales.
  - Confirmar el origen y los derechos de las recetas de la biblioteca antes de cualquier uso comercial.
- **Cuentas y correo:**
  - Probar las cuentas a fondo con el Supabase real: varios dispositivos, usuarios de bar, sin conexión.
  - Configurar un correo propio (SMTP) para invitar por correo y para «He olvidado mi contraseña».
- **Pruebas en móviles reales:** comprobar en iPhone y Android las copias, el PDF y el modo sin conexión.
- **Próximas mejoras propuestas:**
  - Quitar los atributos `style` para cerrar del todo la CSP.
  - Umbral de margen por categoría.
  - Registro de compras y movimientos de stock.
  - Dar de alta la web en Google Search Console.

## Cómo trabajar con Claude en este proyecto
- Responder en español.
- Leer `CLAUDE.md` y ejecutar `npm test` antes de tocar nada.
- Un commit por punto, subido a `main`.
- Subir la versión en cada entrega.
- No afirmar nada que no se haya probado.
- Entregar `publicar.zip` y el proyecto en zip, sin `.git` ni `node_modules`.
