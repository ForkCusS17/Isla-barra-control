# Comprobar `schema.sql` con PostgreSQL local (opcional)

No hace falta para usar la app: sirve para comprobar el SQL antes de ejecutarlo en Supabase.
`stub_supabase.sql` imita lo mínimo de Supabase (`auth.users`, `auth.uid()`, roles `anon` y `authenticated`, `storage.buckets` y `storage.objects`).
`permisos_compras.sql` comprueba los permisos de las facturas y de sus fotos para el administrador, el editor, el lector, un usuario de otro bar y sin sesión.

```bash
createdb prueba
psql -d prueba -f supabase/pruebas/stub_supabase.sql
psql -d prueba -f supabase/schema.sql      # dos veces: debe poder repetirse sin errores
psql -d prueba -f supabase/schema.sql
psql -d prueba -f supabase/pruebas/permisos_compras.sql   # todas las líneas deben decir OK
```
