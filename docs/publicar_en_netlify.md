# Cómo publicar Isla & Barra Control en Netlify (sin programar)

Con estos pasos la app queda en una dirección de internet (por ejemplo, `https://isla-barra.netlify.app`) que puedes abrir en el móvil e instalar en la pantalla de inicio. Es gratis para este uso y no hace falta tocar código.

**Antes de empezar, ten en cuenta:**
- Los datos que la gente introduce en la app **no se suben a Netlify**: se quedan en el móvil u ordenador de cada persona. Netlify solo guarda los archivos de la app.
- Necesitas el archivo **`publicar.zip`**. No lo descomprimas todavía.
- Todo se hace desde un ordenador con navegador (Chrome, Edge, Firefox o Safari).

## 1. Subir la app (la primera vez)

1. Abre en el navegador la página **https://app.netlify.com/drop**.
2. Si te pide iniciar sesión, crea una cuenta gratuita (puedes usar la dirección de correo de la marca). Con una cuenta, el sitio queda guardado y luego puedes actualizarlo. Sin cuenta, Netlify puede borrar el sitio al cabo de un rato.
3. Verás un recuadro grande que dice algo como «Drag and drop your site output folder here» («Arrastra aquí la carpeta de tu sitio»).
4. Arrastra el archivo **`publicar.zip`** desde tu carpeta de descargas hasta ese recuadro y suéltalo.
   - Si la página no acepta el zip, descomprímelo (doble clic), y arrastra la **carpeta** que aparece (la que contiene `index.html`, `isla_barra_control_mvp.html`, `sw.js`, `manifest.webmanifest`, `_headers` y la carpeta `icons`). Arrastra la carpeta, no los archivos sueltos.
5. Espera unos segundos. Cuando termine, Netlify te muestra la dirección de tu sitio (termina en `.netlify.app`). Ábrela: debe aparecer la bienvenida de Isla & Barra Control.

## 2. Ponerle un nombre fácil (opcional)

Netlify inventa un nombre raro (por ejemplo, `jolly-cupcake-1234.netlify.app`). Para cambiarlo:

1. En Netlify, entra en tu sitio.
2. Ve a **Site configuration** (Configuración del sitio) → **Change site name** (Cambiar nombre).
3. Escribe, por ejemplo, `isla-barra` y guarda. La dirección pasa a ser `https://isla-barra.netlify.app` (si ese nombre está libre).

## 3. Comprobar que funciona

1. **En el ordenador:** abre la dirección. Pulsa «Probar con un bar de ejemplo» y recorre Resumen, Carta, Mi barra y Stock.
2. **Versión:** en **Más → Acerca de**, comprueba que la versión es la que acabas de subir (por ejemplo, 0.2.1).
3. **En un iPhone:** abre la dirección en **Safari**, toca el botón **Compartir** (cuadrado con flecha) y elige **Añadir a pantalla de inicio**. Abre la app desde el icono.
4. **En Android:** abre la dirección en **Chrome**, toca el menú **⋮** y elige **Instalar aplicación** (o «Añadir a pantalla de inicio»).
5. **Sin conexión:** con la app ya abierta una vez, pon el móvil en modo avión y ábrela de nuevo desde el icono: debe abrirse con tus datos.

## 4. Subir una versión nueva

Cuando recibas un `publicar.zip` nuevo:

1. Entra en https://app.netlify.com, abre tu sitio y ve a la pestaña **Deploys** (Publicaciones).
2. Abajo verás un recuadro para arrastrar («Need to update your site? Drag and drop your site output folder here»). Arrastra allí el nuevo `publicar.zip` (o la carpeta descomprimida, igual que en el paso 1).
3. Quien tenga la app abierta o instalada verá el aviso **«Hay una versión nueva»**. Al tocar **«Actualizar»** se carga la versión nueva **sin perder sus datos**.

## 5. Después de publicar

- **Avisos legales:** en la app (Más → Acerca de → Avisos legales) aún hay datos entre corchetes: titular, NIF, domicilio y proveedor de alojamiento. Cuando publiques en Netlify, el proveedor será «Netlify, Inc.». Pide que se rellenen y vuelve a subir la app.
- **Copias de seguridad:** recuerda a quien la use que los datos solo están en su dispositivo. Debe usar «Exportar copia» con regularidad.
- **Correo de contacto:** la app usa islaybarra.hosteleria@gmail.com, una dirección provisional. Si un día pasáis a un dominio propio, hay que cambiarla en la app, en los textos legales y en las redes.

## Si algo falla

- **«Page not found» al abrir la dirección:** has subido una carpeta que contiene otra carpeta dentro. Vuelve a subir asegurándote de que `index.html` está directamente en lo que arrastras.
- **Se ve la app antigua:** cierra la app del todo y ábrela otra vez. Debe aparecer «Hay una versión nueva» y basta con tocar «Actualizar».
- **No aparece la opción de instalar en iPhone:** tiene que ser en **Safari** (no en Chrome ni dentro de otra app, como Instagram o WhatsApp).
