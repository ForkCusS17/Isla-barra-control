import json,datetime,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP='Isla & Barra Control';S='Distribuciones Isla (ficticio)'
FACT={'ml':1,'cl':10,'l':1000,'g':1,'kg':1000,'unit':1};BASE={'ml':'ml','cl':'ml','l':'ml','g':'g','kg':'g','unit':'unit'}
I=[('ron-blanco','Ron blanco','Destilado','Botella',700,'ml',14.00),('ron-anejo','Ron añejo','Destilado','Botella',700,'ml',19.50),('ginebra','Ginebra','Destilado','Botella',700,'ml',16.00),('vodka','Vodka','Destilado','Botella',700,'ml',12.60),('tequila','Tequila','Destilado','Botella',700,'ml',18.20),('triple-sec','Licor de naranja (triple sec)','Destilado','Botella',700,'ml',11.90),('vermut','Vermut rojo','Vino / cerveza','Botella',1,'l',9.00),('vino-blanco','Vino blanco','Vino / cerveza','Botella',750,'ml',6.80),('cerveza','Cerveza (botellín 330 ml)','Vino / cerveza','Caja',24,'unit',21.60),('lima-zumo','Zumo de lima','Fruta / verdura','Envase',1,'l',4.50),('sirope','Sirope de azúcar','Sirope / azúcar','Garrafa',1,'l',3.20),('hierbabuena','Hierbabuena','Fruta / verdura','Manojo',100,'g',1.50),('soda','Agua con gas','Refresco / mixer','Caja 24 × 200 ml',4800,'ml',8.40),('tonica','Tónica','Refresco / mixer','Caja 24 × 200 ml',4800,'ml',12.00),('cola','Refresco de cola','Refresco / mixer','Caja 24 × 200 ml',4800,'ml',11.50),('hielo','Hielo','Otro','Bolsa',2,'kg',2.40),('cafe','Café en grano','Café / infusión','Bolsa',1,'kg',14.00),('leche','Leche','Lácteo','Brik',1,'l',1.05),('naranja-deshid','Naranja deshidratada (guarnición)','Fruta / verdura','Bolsa',50,'unit',0.00)]
# Los cócteles clásicos salen de la biblioteca (data/cocktail_library.json), como si se añadieran con «Añadir desde la biblioteca».
LIB=json.load(open(os.path.join(ROOT,'data','cocktail_library.json'),encoding='utf-8'))
UNITS={'dash':0.8,'gota':0.05,'cucharada':5,'rellenar':100}
TYPE2ING={'ron-blanco':'ron-blanco','zumo-lima':'lima-zumo','sirope-simple':'sirope','hierbabuena':'hierbabuena','soda':'soda','cola':'cola','tequila':'tequila','licor-naranja':'triple-sec','ginebra':'ginebra','tonica':'tonica'}
OPT={('cuba-libre','zumo-lima')}
def comp_qty(k):
    if k['tipo']=='guarnicion' or k['unidad']=='al_gusto':return 0,False
    if k['unidad']=='rellenar':return UNITS['rellenar'],True
    if k['unidad'] in UNITS:return round(k['cantidad']*UNITS[k['unidad']],6),True
    return k['cantidad'],False
FROMLIB={}
def from_lib(cid,name,pvp,other):
    c=next(x for x in LIB['cocteles'] if x['id']==cid);comps=[];rec=[]
    for k in c['componentes']:
        q,ap=comp_qty(k);use=q>0 and (not k['opcional'] or (cid,k['tipo']) in OPT);ig=TYPE2ING[k['tipo']] if use else ''
        comps.append(dict(tipo=k['tipo'],cantidad=k['cantidad'],unidad=k['unidad'],opcional=k['opcional'],nota=k['nota'],qty=q if use else 0,approx=ap,ingredientId=ig))
        if use:rec.append((ig,q))
    FROMLIB[cid]=dict(templateId=cid,templateVersion=c['version'],templateSnapshot=[dict(tipo=k['tipo'],cantidad=k['cantidad'],unidad=k['unidad'],opcional=k['opcional'],nota=k['nota']) for k in c['componentes']],components=comps)
    return (cid,name,'Cóctel',pvp,other,rec,c['metodo']+' Medidas orientativas: revísalas en tu barra.')
D=[from_lib('mojito','Mojito',9.00,0.10),from_lib('cuba-libre','Cuba libre',8.00,0.10),from_lib('gin-tonic','Gin-tonic',9.50,0.10),from_lib('margarita','Margarita',9.50,0.10),('vodka-limon','Vodka con limón','Cóctel',7.50,0.10,[('vodka',50),('lima-zumo',20),('sirope',10),('soda',100),('hielo',150)],''),('chupito-tequila','Chupito de tequila','Destilado',2.20,0,[('tequila',40)],''),('ron-anejo-copa','Copa de ron añejo','Destilado',6.00,0,[('ron-anejo',50),('hielo',100)],''),('cana','Caña (botellín)','Cerveza',2.60,0,[('cerveza',1)],''),('vino-blanco-copa','Copa de vino blanco','Vino',3.20,0,[('vino-blanco',120)],''),('cafe-solo','Café solo','Café',1.40,0,[('cafe',7)],''),('cafe-leche','Café con leche','Café',1.70,0,[('cafe',7),('leche',100)],'')]
TAX=7
SALES={'mojito':54,'cuba-libre':46,'gin-tonic':38,'margarita':30,'vodka-limon':22,'chupito-tequila':25,'ron-anejo-copa':12,'cana':120,'vino-blanco-copa':41,'cafe-solo':85,'cafe-leche':64}
ing=[];unitc={};base={}
# Categoría y subcategoría de cada ingrediente (taxonomía por defecto de la app, esquema 5)
SUB={'ron-blanco':('Destilados','Rones'),'ron-anejo':('Destilados','Rones'),'ginebra':('Destilados','Ginebras'),'vodka':('Destilados','Vodkas'),'tequila':('Destilados','Tequilas y mezcales'),'triple-sec':('Destilados','Licores y amargos'),'vermut':('Vinos','Vermuts y generosos'),'vino-blanco':('Vinos','Blancos'),'cerveza':('Cervezas','Botellín y lata'),'lima-zumo':('Frutas, hierbas y zumos','Zumos'),'sirope':('Siropes y azúcares','Siropes'),'hierbabuena':('Frutas, hierbas y zumos','Hierbas'),'soda':('Refrescos y mixers','Aguas'),'tonica':('Refrescos y mixers','Tónicas'),'cola':('Refrescos y mixers','Refrescos'),'hielo':('Otros','Hielo'),'cafe':('Café e infusiones','Café'),'leche':('Otros','Lácteos'),'naranja-deshid':('Otros','Guarniciones')}
assert set(SUB)==set(x[0] for x in I)
for i,n,c,f,q,u,p in I:
    pq=round(q*FACT[u],6);unitc[i]=p/pq if pq>0 else 0;base[i]=BASE[u]
    ing.append(dict(id=i,name=n,category=SUB[i][0],subcategory=SUB[i][1],supplier=S,format=f,unit=BASE[u],packUnit=u,packInput=q,packQty=pq,packPrice=p,unitCost=unitc[i],notes='Precio de ejemplo sin impuestos' if p>0 else 'Precio pendiente de pedir al proveedor',active=True))
theo={}
for i,n,c,pvp,o,rec,t in D:
    for g,q in rec:theo[g]=theo.get(g,0)+q*SALES[i]
assert theo['ron-blanco']==5000 and theo['ginebra']==1900 and theo['tequila']==2500 and theo['lima-zumo']==2730 and theo['cerveza']==120
drinks=[];E={'drinks':{},'ing':unitc}
for i,n,c,pvp,o,rec,t in D:
    cost_i=sum(unitc[g]*q for g,q in rec);cost=cost_i+o;net=pvp/(1+TAX/100);gr=net-cost
    E['drinks'][i]=dict(name=n,cat=c,cost=cost,net=net,gross=gr,cp=cost/net*100,m=gr/net*100)
    drinks.append(dict(id=i,name=n,category=c,price=pvp,taxRate=TAX,ingredientCost=cost_i,otherCost=o,recipe=t,notes=('De la biblioteca de cócteles (versión 1). ' if i in FROMLIB else '')+'Precio de carta con impuesto de ejemplo (7 %) incluido',recipeItems=[dict(ingredientId=g,qty=q) for g,q in rec],**FROMLIB.get(i,{})))
dv=list(E['drinks'].values());av=lambda k:sum(x[k] for x in dv)/len(dv)
E['avg']=dict(cost=av('cost'),cp=av('cp'),m=av('m'),gross=av('gross'),review=sum(1 for x in dv if x['m']<55),neg=0)
def st(sid,prod,unit,start,end,op,pu,cl,tast,comp,waste,oth,thr,status,notes,key,T=None):
    sales=(T or theo)[key];actual=op+pu-cl;out=tast+comp+waste+oth;t=sales+out
    return dict(id=sid,date='2026-10-14',start=start,end=end,product=prod,unit=unit,opening=op,purchases=pu,closing=cl,salesUse=sales,tastings=tast,comps=comp,waste=waste,otherOut=oth,legitUse=out,threshold=thr,status=status,notes=notes,actual=actual,theoretical=t,variance=actual-t)
stocks=[st('s-ron','Ron blanco','ml','2026-10-07','2026-10-13',7000,2800,3500,300,200,100,200,300,'Sin validar','Ventas: Mojito 54 × 50 ml + Cuba libre 46 × 50 ml. Desviación detectada; causa sin determinar. Pendiente: reconteo de botellas abiertas y revisar invitaciones sin anotar.','ron-blanco'),
st('s-gin','Ginebra','ml','2026-10-07','2026-10-13',3500,1400,2940,0,0,0,0,150,'Validados','Ventas: Gin-tonic 38 × 50 ml. Inventario contado dos veces.','ginebra'),
st('s-teq','Tequila','ml','2026-10-07','2026-10-13',2800,0,200,0,0,0,0,150,'Validados','Ventas: Margarita 30 × 50 ml + Chupito 25 × 40 ml.','tequila'),
st('s-lima','Zumo de lima','ml','2026-10-07','2026-10-13',3000,2000,2370,0,0,0,0,150,'Sin validar','Ventas: Mojito 54 × 20 + Cuba libre 46 × 10 + Margarita 30 × 25 + Vodka con limón 22 × 20. Consumo real inferior al teórico: revisar medición.','lima-zumo'),
st('s-cerv','Cerveza (botellín 330 ml)','unit','2026-10-07','',96,48,24,0,0,0,0,6,'Sin validar','Periodo sin cerrar: falta la fecha final del control.','cerveza')]
SALES2={'mojito':50,'cuba-libre':48,'gin-tonic':40,'margarita':28,'vodka-limon':20,'chupito-tequila':22,'ron-anejo-copa':10,'cana':110,'vino-blanco-copa':38,'cafe-solo':80,'cafe-leche':60}
theo2={}
for i,n,c,pvp,o,rec,t in D:
    for g,q in rec:theo2[g]=theo2.get(g,0)+q*SALES2[i]
assert theo2['ron-blanco']==4900
ron2=st('s-ron2','Ron blanco','ml','2026-10-14','2026-10-20',3500,2800,1250,0,100,0,0,300,'Validados','Control de seguimiento tras repetir el recuento y anotar invitaciones a diario.','ron-blanco',theo2)
assert ron2['actual']==5050 and ron2['theoretical']==5000 and ron2['variance']==50
ron2['date']='2026-10-21'
stocks[0].update(hypothesis='Posibles invitaciones sin anotar o error en el recuento de botellas abiertas. Sin comprobar.',causeState='Hipótesis sin comprobar',action='Repetir el recuento entre dos personas y anotar invitaciones y degustaciones el mismo día.',result='El control siguiente (14–20 oct) muestra una desviación de +50 ml. Falta comprobar que la causa fue la falta de registro.')
stocks.insert(0,ron2)
E['stockList']=[dict(product=s['product'],start=s['start'],a=s['actual'],t=s['theoretical'],v=s['variance']) for s in stocks]
E['theo2']=theo2
diag=[dict(id='g1',area='Stock e inventario',status='En revisión',priority='Alta',due='2026-10-28',finding='Ron blanco: desviación residual de +500 ml en la semana (7.000 + 2.800 − 3.500 = 6.300 ml de consumo real frente a 5.800 ml explicados). Causa sin determinar.',action='Repetir el recuento de botellas abiertas entre dos personas y comprobar que invitaciones y degustaciones se anotan el mismo día.',check='Repetir el control la semana siguiente con el mismo método y comparar la desviación residual.'),
dict(id='g2',area='Recetas y dosificación',status='Pendiente',priority='Media',due='2026-11-04',finding='Mojito y cuba libre se sirven sin una medida estándar escrita.',action='Definir la receta en ml, usar medidor y hacer una prueba controlada de 7 días.',check='Comparar el consumo de ron por cada 100 bebidas vendidas antes y después de aplicar la medida.'),
dict(id='g3',area='Carta y precios',status='Pendiente',priority='Media',due='2026-11-04',finding='El chupito de tequila tiene un margen bruto estimado bajo (%d %%) con 40 ml y precio de 2,20 €.'%round(E['drinks']['chupito-tequila']['m']),action='Valorar ajustar el tamaño del chupito o el precio. No asumir ningún ahorro hasta medirlo.',check='Recalcular el margen y revisar las ventas del chupito durante dos semanas.'),
dict(id='g4',area='Compras y proveedores',status='Pendiente',priority='Baja',due='2026-10-28',finding='La naranja deshidratada de la guarnición del gin-tonic no tiene precio registrado: la guarnición no está incluida en su coste.',action='Pedir el precio al proveedor, completarlo en Mi barra y sumar el coste por copa a «otros costes» del gin-tonic.',check='El coste del gin-tonic incluye la guarnición y su margen se recalcula.'),
dict(id='g5',area='Organización del servicio',status='Verificado',priority='Media',due='2026-10-14',finding='Invitaciones y degustaciones no tenían registro diario.',action='Usar una hoja de cierre con invitaciones, degustaciones y mermas.',check='Revisar la hoja durante tres cierres consecutivos.')]
ch=E['drinks']['chupito-tequila']
eu=lambda x:('%.2f'%x).replace('.',',')
EXTRA={'g1':dict(evidence='Control de ron blanco 7–13 oct (datos sin validar): consumo real 6.300 ml, teórico 5.800 ml, desviación +500 ml; umbral orientativo 300 ml.',owner='Encargado de barra (ficticio)',result='Control 14–20 oct con recuento entre dos personas: desviación +50 ml, dentro del umbral. Un solo control no basta: repetir otra semana antes de concluir.'),
'g2':dict(evidence='Observado en la visita del 14 oct: no hay hoja de recetas en barra ni medidor en uso.',owner='',result=''),
'g3':dict(evidence='Coste directo %s € (40 ml de tequila); precio neto %s € (7 %% incluido); margen bruto %s %% frente al umbral orientativo del 55 %%.'%(eu(ch['cost']),eu(ch['net']),('%.1f'%ch['m']).replace('.',',')),owner='',result=''),
'g4':dict(evidence='En el catálogo, «Naranja deshidratada (guarnición)» tiene precio 0,00 €.',owner='',result=''),
'g5':dict(evidence='En el control 7–13 oct las invitaciones y degustaciones se estimaron a final de semana: no había hoja diaria.',owner='Encargado de barra (ficticio)',result='Hoja de cierre revisada en tres cierres consecutivos (14–16 oct): invitaciones, degustaciones y mermas anotadas los tres días.')}
for g in diag:g.update(EXTRA[g['id']])
for s_ in stocks:s_['salesId']='v-sem42' if s_['id']=='s-ron2' else 'v-sem41'
sales=[dict(id='v-sem41',label='Semana 7–13 octubre',start='2026-10-07',end='2026-10-13',lines=[dict(drinkId=i,qty=q) for i,q in SALES.items()]),dict(id='v-sem42',label='Semana 14–20 octubre',start='2026-10-14',end='2026-10-20',lines=[dict(drinkId=i,qty=q) for i,q in SALES2.items()])]
data=dict(app=APP,schema=6,sales=sales,exportedAt='2026-10-21T00:00:00Z',settings=dict(marginMin=55),
business=dict(isDemo=True,name='Bar Atlántico (ejemplo ficticio)',contact='Responsable de barra (ficticio)',location='Arrecife',date='2026-10-14',type='Bar / coctelería',period='7–20 octubre 2026',notes='CASO DE EJEMPLO FICTICIO para validar la app. Objetivo: entender costes y márgenes de la carta de cócteles y revisar las desviaciones de stock de la semana. Precios, ventas, proveedores y el 7 % de impuesto son inventados: ajústalos antes de usar datos reales.'),
ingredients=ing,drinks=drinks,stocks=stocks,diagnostics=diag)
json.dump(data,open(os.path.join(ROOT,'data','isla_barra_demo_bar_atlantico.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
# El mismo bar ficticio va embebido en la app («Probar con un bar de ejemplo»).
HTML=os.path.join(ROOT,'isla_barra_control_mvp.html');OPEN='<script type="application/json" id="demoData">';h=open(HTML,encoding='utf-8').read()
a=h.index(OPEN)+len(OPEN);b=h.index('</script>',a)
h=h[:a]+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+h[b:]
open(HTML,'w',encoding='utf-8').write(h)
E['theo']=theo
json.dump(E,open(os.path.join(ROOT,'data','expected.json'),'w',encoding='utf-8'),ensure_ascii=False)
print(len(ing),'ingredientes',len(drinks),'bebidas',len(stocks),'controles',len(diag),'hallazgos');print({k:round(v,4) for k,v in E['avg'].items()});print({k:(round(v['m'],2)) for k,v in E['drinks'].items()});print(E['stockList'][0])
