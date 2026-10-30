# Leer facturas con IA: lo que tienes que preparar tú (una sola vez)

El botón **«Leer la factura con IA»** (Compras y facturas, en una factura en borrador con su foto o PDF) envía los archivos a una función de tu Supabase. Esa función se los pasa a **Claude** (Anthropic), que devuelve proveedor, número, fechas, total y líneas. La app los pone como **borrador**: tú eliges el producto de Mi barra cuando falte, revisas cada línea y confirmas. No se confirma nada solo.

Solo funciona con cuentas, para el administrador y los editores del bar (el lector no lo ve) y con conexión a internet.

## 1. Crear la clave de Claude
1. Entra en **https://console.anthropic.com** y crea una cuenta (puedes usar el correo de la marca).
2. En **Billing**, añade una forma de pago y, si quieres, un **límite de gasto mensual** (por ejemplo, 10 $).
3. En **API Keys → Create Key**, ponle un nombre (por ejemplo, `isla-barra-facturas`) y **copia la clave** (empieza por `sk-ant-…`). Solo se ve una vez.
4. **No me la mandes por el chat** ni la pegues en la app: va solo en Supabase (paso 3).

## 2. Crear la función en Supabase
1. En tu proyecto de Supabase, menú izquierdo: **Edge Functions → Deploy a new function → Via Editor** (en el móvil puede estar en el menú ☰).
2. Nombre de la función, exactamente: **`leer-factura`**.
3. Borra el código de ejemplo y pega **todo** el contenido de `supabase/functions/leer-factura/index.ts` (te lo paso por el chat).
4. Pulsa **Deploy function**. Deja activada la opción de verificar el JWT (*Verify JWT*), que viene marcada: así solo responde a usuarios con sesión.

## 3. Guardar la clave como secreto
1. **Edge Functions → Secrets** (o **Project Settings → Edge Functions → Secrets**).
2. **Add new secret**: nombre **`ANTHROPIC_API_KEY`**, valor: la clave del paso 1. Guarda.
3. Opcional: secreto **`FACTURA_MODEL`** para cambiar el modelo. Por defecto usa `claude-opus-5-5` (el más preciso); `claude-sonnet-5-5` cuesta la mitad y suele bastar para facturas claras. Pruébalo con tus facturas antes de cambiarlo.

## 4. Probar
En la app: Compras y facturas → Nueva factura → «Añadir foto o PDF de la factura» → **«Leer la factura con IA»**. Debe rellenar los datos y las líneas en unos segundos. Si sale un mensaje de error, mándame una captura.

## Coste aproximado
Se paga por uso a Anthropic: con `claude-opus-5-5` (4 $ por millón de tokens de entrada y 20 $ de salida), una factura de una página suele costar **unos céntimos** (orientativo: entre 2 y 8 céntimos según el tamaño y las líneas). Lo exacto lo ves en console.anthropic.com → **Usage**. El límite de gasto del paso 1 evita sorpresas.

## Qué hace y qué no hace
- **Lee**: proveedor, número, fechas, total, y por cada línea el texto, el tipo (producto, portes, envase o depósito, descuento, otro), la cantidad, los envases por unidad, el importe sin impuesto y el IGIC o IVA.
- **Propone** el producto de Mi barra cuando el proveedor ya se emparejó antes (alias) o cuando el nombre se parece claramente a uno tuyo. Si no está seguro, lo deja para que lo elijas.
- **Avisa** si el envase de la factura no coincide con el de Mi barra, y el cuadre con el total delata cifras mal leídas.
- **No** confirma, no cambia precios ni inventa datos: si algo no se lee, lo deja vacío y lo dice en «Avisos de la lectura».
- La lectura puede equivocarse (fotos movidas, letra pequeña, facturas escritas a mano): **revisa siempre cada línea**.

## Privacidad
Las fotos o el PDF se envían a Anthropic solo para leerlos, según sus condiciones de uso de la API. La app lo dice en Privacidad. Anthropic pasa a ser un proveedor más que trata datos de las facturas (como Supabase): conviene incluirlo en la revisión profesional de los textos legales.

## Comprobado y no comprobado
- Comprobado: la función se ha ejecutado en Deno contra un Supabase y una API de Claude **simulados** (permisos, tipos de archivo, envío del PDF, salida estructurada con esquema, errores), y la app contra la función simulada (serie `compras`).
- **No comprobado**: la lectura real con Claude (no hay clave en el entorno de desarrollo) ni el despliegue en tu Supabase. Cuando lo tengas, prueba con 10-15 facturas reales y anota cuántos datos acierta.
