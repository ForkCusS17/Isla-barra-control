\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','admin@x.es',null),('00000000-0000-0000-0000-00000000000e','editor@x.es',null),('00000000-0000-0000-0000-00000000000c','lector@x.es',null),('00000000-0000-0000-0000-00000000000d','otro@x.es',null);
insert into public.admins values ('00000000-0000-0000-0000-00000000000a');
insert into public.bars(id,name) values ('11111111-1111-1111-1111-111111111111','Bar Uno'),('22222222-2222-2222-2222-222222222222','Bar Dos');
insert into public.bar_members values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000e','editor'),('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000c','lector'),('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000d','editor');
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if c then raise notice 'OK   %',msg; else raise notice 'FALLA %',msg; end if; end $$;
grant execute on function pg_temp.ok(boolean,text) to authenticated;
set role authenticated;
-- editor del bar 1
set request.uid='00000000-0000-0000-0000-00000000000e';
insert into public.purchase_invoices(id,bar_id,supplier,number,status,data) values ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Prov','F1','borrador','{}');
select pg_temp.ok((select count(*) from public.purchase_invoices)=1,'editor crea y ve su borrador');
update public.purchase_invoices set number='F1b' where id='a0000000-0000-0000-0000-000000000001';
select pg_temp.ok((select number from public.purchase_invoices where id='a0000000-0000-0000-0000-000000000001')='F1b','editor cambia un borrador');
update public.purchase_invoices set status='confirmada' where id='a0000000-0000-0000-0000-000000000001';
update public.purchase_invoices set number='CAMBIADA' where id='a0000000-0000-0000-0000-000000000001';
select pg_temp.ok((select number from public.purchase_invoices where id='a0000000-0000-0000-0000-000000000001')='F1b','una factura confirmada ya no se cambia');
delete from public.purchase_invoices where id='a0000000-0000-0000-0000-000000000001';
select pg_temp.ok((select count(*) from public.purchase_invoices)=1,'el editor no borra una factura confirmada');
do $$ begin insert into public.purchase_invoices(id,bar_id,supplier,number,data) values ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','PROV','F1b','{}'); perform pg_temp.ok(false,'número repetido rechazado'); exception when unique_violation then perform pg_temp.ok(true,'número repetido del mismo proveedor rechazado (23505)'); end $$;
insert into storage.objects(bucket_id,name) values ('facturas','11111111-1111-1111-1111-111111111111/a0000000-0000-0000-0000-000000000001/f.jpg');
select pg_temp.ok((select count(*) from storage.objects)=1,'editor sube y ve una foto de su bar');
do $$ begin insert into storage.objects(bucket_id,name) values ('facturas','22222222-2222-2222-2222-222222222222/x/f.jpg'); perform pg_temp.ok(false,'foto en otro bar'); exception when insufficient_privilege then perform pg_temp.ok(true,'editor no puede subir fotos a otro bar'); end $$;
do $$ begin insert into storage.objects(bucket_id,name) values ('facturas','no-es-un-id/f.jpg'); perform pg_temp.ok(false,'ruta rara'); exception when insufficient_privilege then perform pg_temp.ok(true,'ruta sin id de bar rechazada'); end $$;
-- lector del bar 1
set request.uid='00000000-0000-0000-0000-00000000000c';
select pg_temp.ok((select count(*) from public.purchase_invoices)=1,'el lector ve los datos de las facturas');
select pg_temp.ok((select count(*) from storage.objects)=0,'el lector no ve las fotos');
do $$ begin insert into public.purchase_invoices(id,bar_id,data) values ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','{}'); perform pg_temp.ok(false,'lector crea'); exception when insufficient_privilege then perform pg_temp.ok(true,'el lector no crea facturas'); end $$;
do $$ begin insert into storage.objects(bucket_id,name) values ('facturas','11111111-1111-1111-1111-111111111111/x/f.jpg'); perform pg_temp.ok(false,'lector sube'); exception when insufficient_privilege then perform pg_temp.ok(true,'el lector no sube fotos'); end $$;
-- usuario de otro bar
set request.uid='00000000-0000-0000-0000-00000000000d';
select pg_temp.ok((select count(*) from public.purchase_invoices)=0 and (select count(*) from storage.objects)=0,'un usuario de otro bar no ve nada del bar 1');
-- administrador
set request.uid='00000000-0000-0000-0000-00000000000a';
select pg_temp.ok((select count(*) from storage.objects)=1,'el administrador ve las fotos');
delete from public.purchase_invoices where id='a0000000-0000-0000-0000-000000000001';
select pg_temp.ok((select count(*) from public.purchase_invoices)=0,'el administrador puede borrar una factura confirmada');
-- sin sesión
reset role; set role anon; set request.uid='';
do $$ begin perform count(*) from public.purchase_invoices; perform pg_temp.ok(false,'anon lee'); exception when insufficient_privilege then perform pg_temp.ok(true,'sin sesión no se puede leer la tabla'); end $$;
