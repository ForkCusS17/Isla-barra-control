// Supabase simulado para las pruebas (solo 127.0.0.1): las rutas de /auth/v1 y /rest/v1 que usa la app, con los
// mismos permisos que supabase/schema.sql (administrador, usuarios por bar «editor» o «lector», guardado con versión).
// No sustituye a probar con el Supabase real: comprueba que la app habla bien con él y que respeta las respuestas.
const http=require('http'),crypto=require('crypto');
function start(KEY){const st={users:new Map(),tokens:new Map(),refresh:new Map(),admins:new Set(),bars:new Map(),members:new Map(),data:new Map(),recover:[],calls:[]},ctl={offline:false};
 const id=()=>crypto.randomUUID(),now=()=>Math.floor(Date.now()/1000);
 const userBy=email=>[...st.users.values()].find(u=>u.email.toLowerCase()===String(email||'').trim().toLowerCase());
 function session(u){const at='at_'+id(),rt='rt_'+id();st.tokens.set(at,{user:u.id,exp:now()+3600});st.refresh.set(rt,u.id);u.last_sign_in_at=new Date().toISOString();return{access_token:at,token_type:'bearer',expires_in:3600,expires_at:now()+3600,refresh_token:rt,user:{id:u.id,email:u.email}}}
 const isAdmin=u=>st.admins.has(u),role=(b,u)=>st.members.get(b+'|'+u),visible=(b,u)=>isAdmin(u)||!!role(b,u),canEdit=(b,u)=>isAdmin(u)||role(b,u)==='editor';
 const api={
  addUser(email,password){const u={id:id(),email,password,last_sign_in_at:null};st.users.set(u.id,u);return u},
  makeAdmin(email){st.admins.add(userBy(email).id)},
  addBar(name){const b={id:id(),name};st.bars.set(b.id,b);st.data.set(b.id,{data:{},version:0,updated_at:new Date().toISOString()});return b},
  addMember(barId,email,r){st.members.set(barId+'|'+userBy(email).id,r||'editor')},
  // Enlace de un correo de invitación o de contraseña olvidada (lo que Supabase pone tras el «#»)
  link(email,type){const s=session(userBy(email));return`#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=${type}`},
  expireTokens(){for(const t of st.tokens.values())t.exp=now()-10},
  // Otro dispositivo guarda en la nube (para provocar un conflicto)
  remoteSave(barId,data){const d=st.data.get(barId);st.data.set(barId,{data,version:d.version+1,updated_at:new Date().toISOString()})},
  barData:barId=>st.data.get(barId),userBy,st,ctl};
 const server=http.createServer((req,res)=>{if(ctl.offline){req.socket.destroy();return}
  const cors={'Access-Control-Allow-Origin':req.headers.origin||'*','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info, prefer','Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Max-Age':'600'};
  const send=(code,obj)=>{res.writeHead(code,{...cors,'Content-Type':'application/json'});res.end(obj===undefined?'':JSON.stringify(obj))};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return}
  let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const u=new URL(req.url,'http://x'),p=u.pathname;let body={};try{body=raw?JSON.parse(raw):{}}catch(e){}
   st.calls.push(req.method+' '+p+(u.search||''));
   if(req.headers.apikey!==KEY)return send(401,{message:'Invalid API key'});
   const tok=(req.headers.authorization||'').replace(/^Bearer /,''),t=st.tokens.get(tok),me=t&&t.exp>now()?t.user:null;
   if(p==='/auth/v1/token'){const g=u.searchParams.get('grant_type');
    if(g==='password'){const us=userBy(body.email);if(!us||us.password!==body.password)return send(400,{error:'invalid_grant',error_description:'Invalid login credentials'});return send(200,session(us))}
    if(g==='refresh_token'){const uidv=st.refresh.get(body.refresh_token);if(!uidv)return send(400,{error:'invalid_grant',error_description:'Invalid Refresh Token'});st.refresh.delete(body.refresh_token);return send(200,session(st.users.get(uidv)))}
    return send(400,{error:'unsupported_grant_type'})}
   if(p==='/auth/v1/recover'){st.recover.push(body.email);return send(200,{})}
   if(p==='/auth/v1/logout'){st.tokens.delete(tok);return send(204)}
   if(p==='/auth/v1/user'){if(!me)return send(401,{msg:'invalid JWT'});const us=st.users.get(me);
    if(req.method==='PUT'){if(typeof body.password!=='string'||body.password.length<6)return send(422,{msg:'Password should be at least 6 characters'});if(body.password===us.password)return send(422,{msg:'New password should be different from the old password.'});us.password=body.password}
    return send(200,{id:us.id,email:us.email})}
   if(p.startsWith('/rest/v1/')){if(!me)return send(401,{code:'PGRST301',message:'JWT expired'});const q=u.searchParams,eq=k=>(q.get(k)||'').replace(/^eq\./,'');
    if(p==='/rest/v1/admins')return send(200,isAdmin(me)?[{user_id:me}]:[]);
    if(p==='/rest/v1/bars')return send(200,[...st.bars.values()].filter(b=>visible(b.id,me)).sort((a,b)=>a.name.localeCompare(b.name)).map(b=>({id:b.id,name:b.name})));
    if(p==='/rest/v1/bar_members')return send(200,[...st.members.entries()].map(([k,r])=>({bar_id:k.split('|')[0],user_id:k.split('|')[1],role:r})).filter(m=>m.user_id===me||isAdmin(me)).filter(m=>!eq('user_id')||m.user_id===eq('user_id')).map(m=>({bar_id:m.bar_id,role:m.role})));
    if(p==='/rest/v1/bar_data'){const b=eq('bar_id'),d=st.data.get(b);return send(200,d&&visible(b,me)?[{data:d.data,version:d.version,updated_at:d.updated_at}]:[])}
    const fn=p.replace('/rest/v1/rpc/','');const deny=()=>send(403,{code:'42501',message:'sin permiso'});
    if(fn==='save_bar_data'){if(!canEdit(body.p_bar,me))return deny();const d=st.data.get(body.p_bar);if(!d)return send(404,{code:'P0002',message:'bar inexistente'});if(d.version!==body.p_version)return send(409,{code:'40001',message:'conflicto',details:String(d.version)});st.data.set(body.p_bar,{data:body.p_data,version:d.version+1,updated_at:new Date().toISOString()});return send(200,d.version+1)}
    if(!isAdmin(me))return deny();
    if(fn==='admin_create_bar'){const b=api.addBar(String(body.p_name||'').trim());return send(200,b.id)}
    if(fn==='admin_add_member'){const us=userBy(body.p_email);if(!us)return send(404,{code:'P0002',message:'correo no invitado'});st.members.set(body.p_bar+'|'+us.id,body.p_role||'editor');return send(200,null)}
    if(fn==='admin_remove_member'){st.members.delete(body.p_bar+'|'+body.p_user);return send(200,null)}
    if(fn==='admin_bar_members')return send(200,[...st.members.entries()].filter(([k])=>k.startsWith(body.p_bar+'|')).map(([k,r])=>{const us=st.users.get(k.split('|')[1]);return{user_id:us.id,email:us.email,role:r,last_sign_in_at:us.last_sign_in_at}}));
    return send(404,{message:'no existe'})}
   send(404,{message:'no existe'})})});
 return new Promise(ok=>server.listen(0,'127.0.0.1',()=>ok({...api,server,base:`http://127.0.0.1:${server.address().port}`})))}
module.exports={start};
