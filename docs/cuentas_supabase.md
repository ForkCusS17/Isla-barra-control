# Cuentas por bar con Supabase: lo que tienes que preparar tú

La app pasará a pedir **inicio de sesión**. Tú (administrador) ves todos los bares y das acceso. Cada bar tiene sus usuarios, que solo ven su bar. **Nadie puede registrarse por su cuenta.** Los datos se guardan en Supabase (servidores en la Unión Europea), así que se ven en cualquier dispositivo y no se pierden si se borra el móvil.

Estos pasos se hacen una sola vez, desde un ordenador. No hace falta programar.

## 1. Crear el proyecto
1. Entra en **https://supabase.com** y crea una cuenta gratuita (puedes usar el correo de la marca).
2. Pulsa **New project**:
   - **Name:** `isla-barra`
   - **Database password:** pulsa *Generate* y **guárdala en un sitio seguro** (no me la mandes).
   - **Region:** **Central EU (Frankfurt)**.
   - Plan **Free**.
3. Espera un par de minutos a que termine de crearse.

## 2. Crear las tablas y los permisos
1. En el menú de la izquierda, abre **SQL Editor** → **New query**.
2. Copia **todo** el contenido del archivo `supabase/schema.sql` (te lo mando aparte), pégalo y pulsa **Run**.
3. Debe decir **Success. No rows returned**.

## 3. Cerrar el registro y poner la dirección de la app
1. **Authentication → Sign In / Providers** (o *Providers*): en **Email**, deja activado el inicio con correo y **desactiva «Allow new users to sign up»** (permitir registro). Guarda.
2. **Authentication → URL Configuration**:
   - **Site URL:** `https://app.islaybarra.es/isla_barra_control_mvp.html` (la dirección completa de la app: si pones solo `https://app.islaybarra.es`, los enlaces de los correos pierden la sesión por el camino)
   - **Redirect URLs:** añade `https://app.islaybarra.es/**`
3. Guarda.

## 4. Crear tu usuario de administrador
1. **Authentication → Users → Add user → Create new user**.
2. Tu correo y una contraseña larga. Marca **Auto Confirm User** si aparece. Pulsa **Create user**.
3. Vuelve a **SQL Editor → New query**, pega esta línea **cambiando el correo por el tuyo** y pulsa **Run**:

   ```sql
   insert into public.admins(user_id) select id from auth.users where email = 'TU_CORREO' on conflict do nothing;
   ```

## 5. Mandarme los datos de conexión
En **Project Settings → API** (o **Data API** / **API Keys**) copia y mándame:
- **Project URL** (algo como `https://abcdxyz.supabase.co`).
- La clave **anon / public** (o **publishable key**, empieza por `eyJ…` o por `sb_publishable_…`).

Estas dos son públicas: van dentro de la app y no dan acceso a nada sin iniciar sesión, porque los permisos de las tablas lo impiden.

**No me mandes nunca** la clave **service_role** / **secret**, ni la contraseña de la base de datos. Esas dan acceso total.

## Compras y facturas (versión 0.4.0): volver a ejecutar el SQL
La 0.4.0 añade la tabla de facturas y un almacén privado para sus fotos. Hay que hacerlo **una vez, antes de usar «Compras y facturas» con cuentas**:
1. **SQL Editor → New query**: copia **todo** `supabase/schema.sql` (la versión nueva), pégalo y pulsa **Run**. Se puede ejecutar aunque ya lo hicieras antes: no borra nada.
2. Comprueba en **Storage** que aparece el almacén **facturas** marcado como privado (*Private*).
3. Revisa tu plan: el gratuito incluye 1 GB de archivos (unas 3.000 páginas de factura reducidas) y se pausa si pasa una semana sin uso. Para usarla a diario con bares, el plan Pro (desde 25 $/mes, 100 GB) evita la pausa. Comprueba los precios en supabase.com/pricing.

Permisos: el administrador y los editores de un bar ven, suben y borran sus facturas y fotos; el usuario de solo lectura ve los datos de las facturas, no las fotos. Una factura confirmada ya no se puede cambiar; solo el administrador puede borrarla. El SQL se ha comprobado en PostgreSQL 16 con una imitación mínima de Supabase (`supabase/pruebas/`), no en tu proyecto real.

## Dar acceso a una persona de un bar (versión 0.3.0 o posterior)
1. **Crear su cuenta en Supabase** (elige una):
   - **Sin correo propio configurado (lo habitual al principio):** **Authentication → Users → Add user → Create new user** con su correo y una **contraseña provisional**; marca **Auto Confirm User**. Dale la contraseña en persona o por teléfono. Al entrar, que la cambie en **Más → Cuenta y bares → Cambiar mi contraseña**.
   - **Con correo propio configurado (SMTP):** **Authentication → Users → Invite user** con su correo. Le llega un enlace para crear su contraseña. El servidor de correo gratuito de Supabase solo envía a los miembros de tu equipo de Supabase, así que para invitar por correo a los bares hay que configurar uno propio en **Authentication → Emails → SMTP Settings** (por ejemplo, el de Hostalia si contratas correo con tu dominio). Te ayudo cuando llegue el momento.
2. **Darle acceso al bar** desde la app, como administrador: **Mis bares → (el bar) → Usuarios** → su correo → **Puede editar** o **Solo lectura** → **Dar acceso**.

Quitar el acceso: en esa misma pantalla, **Quitar acceso** (la cuenta no se borra; para borrarla, Supabase › Authentication › Users).
«He olvidado mi contraseña» también envía un correo, así que tiene la misma limitación hasta que configures el correo propio.
