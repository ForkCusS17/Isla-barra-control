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
   - **Site URL:** `https://app.islaybarra.es`
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

## Más adelante: dar acceso a un bar
Cuando la nueva versión esté publicada:
1. En Supabase: **Authentication → Users → Invite user** → correo de la persona del bar. Le llega un correo para crear su contraseña.
2. En la app, como administrador: **Mis bares → (el bar) → Usuarios → Añadir** ese correo, como *editor* (puede cambiar datos) o *lector* (solo ve).

Nota: Supabase envía pocos correos por hora con su servidor de pruebas. Si vas a invitar a varios bares, conviene configurar tu propio servidor de correo en **Authentication → Emails → SMTP Settings** (por ejemplo, el de Hostalia si contratas correo con tu dominio). Te ayudo cuando llegue el momento.
