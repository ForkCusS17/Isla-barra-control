"""Biblioteca de cócteles clásicos de Isla & Barra Control.

Datos escritos para esta app como información estructurada: tipo de ingrediente, cantidad y unidad,
y un método redactado en una frase propia. No se han copiado textos, imágenes ni marcas de terceros.
Las medidas son orientativas (cada barra puede servir distinto) y todas las recetas están pendientes de
revisión (revisada: False). Antes de un uso comercial hay que confirmar origen y derechos (ver CLAUDE.md).

Escribe data/cocktail_library.json y lo incrusta en isla_barra_control_mvp.html
(<script type="application/json" id="cocktailLibrary">). Ejecutar: python3 tools/make_library.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = 1
UNITS = ['ml', 'g', 'unidad', 'dash', 'gota', 'cucharada', 'rellenar', 'al_gusto']
NO_QTY = {'rellenar', 'al_gusto'}  # sin cantidad fija: la pone el ajuste o no tiene coste

# Tipos de ingrediente: id → nombre
TYPES = [
    ('ron-blanco', 'Ron blanco'), ('ron-anejo', 'Ron añejo'), ('cachaca', 'Cachaça'), ('ginebra', 'Ginebra'),
    ('vodka', 'Vodka'), ('tequila', 'Tequila'), ('whisky', 'Whisky'), ('brandy', 'Brandy'), ('pisco', 'Pisco'),
    ('vermut-rojo', 'Vermut rojo'), ('vermut-seco', 'Vermut seco'), ('licor-naranja', 'Licor de naranja'),
    ('bitter-rojo', 'Bitter rojo'), ('aperitivo-naranja', 'Aperitivo de naranja'), ('licor-cafe', 'Licor de café'),
    ('amargo-aromatico', 'Amargo aromático'), ('zumo-lima', 'Zumo de lima'), ('zumo-limon', 'Zumo de limón'),
    ('zumo-naranja', 'Zumo de naranja'), ('zumo-pina', 'Zumo de piña'), ('zumo-tomate', 'Zumo de tomate'),
    ('zumo-arandano', 'Zumo de arándano'), ('pure-melocoton', 'Puré de melocotón'), ('lima', 'Lima'),
    ('sirope-simple', 'Sirope simple'), ('sirope-almendra', 'Sirope de almendra'), ('granadina', 'Granadina'),
    ('crema-coco', 'Crema de coco'), ('azucar', 'Azúcar'), ('soda', 'Soda'), ('tonica', 'Tónica'),
    ('ginger-beer', 'Ginger beer'), ('cola', 'Refresco de cola'), ('refresco-pomelo', 'Refresco de pomelo'),
    ('espumoso', 'Vino espumoso'), ('cafe', 'Café'), ('nata', 'Nata'), ('huevo', 'Huevo (clara)'),
    ('hierbabuena', 'Hierbabuena'), ('salsa-inglesa', 'Salsa inglesa'), ('salsa-picante', 'Salsa picante'),
    ('sal-pimienta', 'Sal y pimienta'), ('hielo', 'Hielo'), ('guarnicion', 'Guarnición'),
]

def c(tipo, cantidad, unidad='ml', opcional=False, nota=''):
    return {'tipo': tipo, 'cantidad': cantidad, 'unidad': unidad, 'opcional': opcional, 'nota': nota}

HIELO = c('hielo', None, 'al_gusto', True)
def guarnicion(nota): return c('guarnicion', 1, 'unidad', True, nota)

# id, nombre, base, componentes, método (frase propia)
COCKTAILS = [
    ('mojito', 'Mojito', 'ron', [c('ron-blanco', 50), c('zumo-lima', 20), c('sirope-simple', 15), c('hierbabuena', 8, 'g', nota='unas 10 hojas'), c('soda', None, 'rellenar'), HIELO, guarnicion('rama de hierbabuena')],
     'Machaca suavemente la hierbabuena con la lima y el sirope, añade el ron y hielo picado y termina con soda.'),
    ('daiquiri', 'Daiquiri', 'ron', [c('ron-blanco', 60), c('zumo-lima', 25), c('sirope-simple', 15), HIELO],
     'Agita todo con hielo y sirve colado en copa fría.'),
    ('cuba-libre', 'Cuba libre', 'ron', [c('ron-blanco', 50), c('cola', None, 'rellenar'), c('zumo-lima', 10, opcional=True), HIELO, guarnicion('gajo de lima')],
     'Sirve el ron sobre hielo en vaso alto, añade la lima y completa con cola.'),
    ('mai-tai', 'Mai Tai', 'ron', [c('ron-anejo', 40), c('ron-blanco', 20), c('licor-naranja', 15), c('sirope-almendra', 15), c('zumo-lima', 25), HIELO, guarnicion('hierbabuena y lima')],
     'Agita con hielo y sirve sobre hielo picado en vaso bajo.'),
    ('pina-colada', 'Piña colada', 'ron', [c('ron-blanco', 50), c('crema-coco', 30), c('zumo-pina', 90), HIELO, guarnicion('trozo de piña')],
     'Bate o agita con hielo hasta que quede cremoso y sirve en vaso alto.'),
    ('caipirinha', 'Caipirinha', 'cachaça', [c('cachaca', 60), c('lima', 1, 'unidad', nota='en gajos'), c('azucar', 10, 'g'), HIELO],
     'Machaca la lima con el azúcar en el vaso, añade hielo picado y la cachaça, y remueve.'),
    ('margarita', 'Margarita', 'tequila', [c('tequila', 50), c('licor-naranja', 20), c('zumo-lima', 25), c('sal-pimienta', None, 'al_gusto', True, 'borde de sal'), HIELO],
     'Agita con hielo y sirve colado en copa con medio borde de sal.'),
    ('paloma', 'Paloma', 'tequila', [c('tequila', 50), c('zumo-lima', 10), c('refresco-pomelo', None, 'rellenar'), c('sal-pimienta', None, 'al_gusto', True, 'pizca de sal'), HIELO],
     'Sirve el tequila y la lima sobre hielo en vaso alto y completa con refresco de pomelo.'),
    ('tequila-sunrise', 'Tequila sunrise', 'tequila', [c('tequila', 45), c('zumo-naranja', 90), c('granadina', 15), HIELO, guarnicion('rodaja de naranja')],
     'Sirve tequila y naranja sobre hielo y deja caer la granadina para que se quede en el fondo.'),
    ('cosmopolitan', 'Cosmopolitan', 'vodka', [c('vodka', 40), c('licor-naranja', 15), c('zumo-arandano', 30), c('zumo-lima', 15), HIELO, guarnicion('piel de naranja')],
     'Agita con hielo y sirve colado en copa fría.'),
    ('moscow-mule', 'Moscow mule', 'vodka', [c('vodka', 45), c('zumo-lima', 10), c('ginger-beer', None, 'rellenar'), HIELO, guarnicion('rodaja de lima')],
     'Sirve vodka y lima sobre hielo y completa con ginger beer.'),
    ('bloody-mary', 'Bloody Mary', 'vodka', [c('vodka', 45), c('zumo-tomate', 90), c('zumo-limon', 15), c('salsa-inglesa', 3, 'dash'), c('salsa-picante', 2, 'dash'), c('sal-pimienta', None, 'al_gusto'), HIELO, guarnicion('rama de apio')],
     'Mezcla todo removiendo con hielo, sin agitar, y sirve en vaso alto.'),
    ('espresso-martini', 'Espresso martini', 'vodka', [c('vodka', 50), c('licor-cafe', 30), c('cafe', 7, 'g', nota='un espresso recién hecho'), c('sirope-simple', 10, opcional=True), HIELO],
     'Agita fuerte con hielo para que haga espuma y sirve colado en copa fría.'),
    ('negroni', 'Negroni', 'ginebra', [c('ginebra', 30), c('bitter-rojo', 30), c('vermut-rojo', 30), HIELO, guarnicion('piel de naranja')],
     'Remueve con hielo en vaso bajo y perfuma con la piel de naranja.'),
    ('dry-martini', 'Dry martini', 'ginebra', [c('ginebra', 60), c('vermut-seco', 10), HIELO, guarnicion('aceituna o piel de limón')],
     'Remueve con hielo hasta enfriar y sirve colado en copa fría.'),
    ('tom-collins', 'Tom Collins', 'ginebra', [c('ginebra', 45), c('zumo-limon', 30), c('sirope-simple', 15), c('soda', None, 'rellenar'), HIELO, guarnicion('rodaja de limón')],
     'Agita ginebra, limón y sirope con hielo, sirve en vaso alto y completa con soda.'),
    ('gin-tonic', 'Gin-tonic', 'ginebra', [c('ginebra', 50), c('tonica', None, 'rellenar'), HIELO, guarnicion('piel de cítrico')],
     'Sirve la ginebra sobre mucho hielo y añade la tónica despacio.'),
    ('gimlet', 'Gimlet', 'ginebra', [c('ginebra', 60), c('zumo-lima', 20), c('sirope-simple', 15), HIELO],
     'Agita con hielo y sirve colado en copa fría.'),
    ('old-fashioned', 'Old fashioned', 'whisky', [c('whisky', 60), c('sirope-simple', 1, 'cucharada'), c('amargo-aromatico', 2, 'dash'), HIELO, guarnicion('piel de naranja')],
     'Remueve el sirope y el amargo con el whisky sobre hielo grande en vaso bajo.'),
    ('manhattan', 'Manhattan', 'whisky', [c('whisky', 50), c('vermut-rojo', 20), c('amargo-aromatico', 1, 'dash'), HIELO, guarnicion('cereza')],
     'Remueve con hielo y sirve colado en copa fría.'),
    ('whisky-sour', 'Whisky sour', 'whisky', [c('whisky', 45), c('zumo-limon', 25), c('sirope-simple', 15), c('huevo', 1, 'unidad', True, 'para la espuma'), HIELO],
     'Agita primero sin hielo si usas clara, después con hielo, y sirve colado.'),
    ('sidecar', 'Sidecar', 'brandy', [c('brandy', 50), c('licor-naranja', 20), c('zumo-limon', 20), HIELO],
     'Agita con hielo y sirve colado en copa fría.'),
    ('pisco-sour', 'Pisco sour', 'pisco', [c('pisco', 60), c('zumo-lima', 30), c('sirope-simple', 20), c('huevo', 1, 'unidad', True, 'para la espuma'), c('amargo-aromatico', 3, 'gota', True, 'sobre la espuma'), HIELO],
     'Agita sin hielo, después con hielo, sirve colado y pon unas gotas de amargo sobre la espuma.'),
    ('bellini', 'Bellini', 'espumoso', [c('pure-melocoton', 50), c('espumoso', 100)],
     'Pon el puré en copa alta y completa despacio con el espumoso bien frío.'),
    ('mimosa', 'Mimosa', 'espumoso', [c('zumo-naranja', 75), c('espumoso', 75)],
     'Sirve el zumo frío en copa alta y completa con espumoso.'),
    ('spritz', 'Spritz', 'espumoso', [c('espumoso', 90), c('aperitivo-naranja', 60), c('soda', 30), HIELO, guarnicion('rodaja de naranja')],
     'Sirve sobre hielo en copa de vino: espumoso, aperitivo y un toque de soda.'),
    ('french-75', 'French 75', 'espumoso', [c('ginebra', 30), c('zumo-limon', 15), c('sirope-simple', 10), c('espumoso', None, 'rellenar')],
     'Agita ginebra, limón y sirope con hielo, sirve colado en copa alta y completa con espumoso.'),
    ('americano', 'Americano', 'vermut', [c('bitter-rojo', 30), c('vermut-rojo', 30), c('soda', None, 'rellenar'), HIELO, guarnicion('rodaja de naranja')],
     'Sirve bitter y vermut sobre hielo y completa con soda.'),
    ('mojito-sin-alcohol', 'Mojito sin alcohol', 'sin alcohol', [c('zumo-lima', 25), c('sirope-simple', 20), c('hierbabuena', 8, 'g', nota='unas 10 hojas'), c('soda', None, 'rellenar'), HIELO],
     'Machaca la hierbabuena con la lima y el sirope, añade hielo picado y completa con soda.'),
    ('san-francisco', 'San Francisco', 'sin alcohol', [c('zumo-naranja', 60), c('zumo-pina', 60), c('zumo-limon', 15), c('granadina', 10), HIELO, guarnicion('rodaja de naranja')],
     'Agita los zumos con hielo, sirve en vaso alto y deja caer la granadina.'),
]

NOTE = ('Recetas clásicas con medidas orientativas: cada barra puede servirlas distinto. '
        'Revisa cantidades y productos y ajústalos a tu receta.')

def build():
    type_ids = [t[0] for t in TYPES]
    assert len(set(type_ids)) == len(type_ids), 'tipos repetidos'
    ids = [x[0] for x in COCKTAILS]
    assert len(set(ids)) == len(ids), 'cócteles repetidos'
    assert len(COCKTAILS) == 30, len(COCKTAILS)
    for cid, name, base, comps, method in COCKTAILS:
        for k in comps:
            assert k['tipo'] in type_ids, (cid, k['tipo'])
            assert k['unidad'] in UNITS, (cid, k['unidad'])
            if k['unidad'] in NO_QTY: assert k['cantidad'] is None, (cid, k)
            else: assert isinstance(k['cantidad'], (int, float)) and k['cantidad'] > 0, (cid, k)
    lib = {'version': VERSION, 'nota': NOTE, 'unidades': UNITS,
           'tipos': [{'id': i, 'nombre': n} for i, n in TYPES],
           'cocteles': [{'id': i, 'nombre': n, 'base': b, 'componentes': comps, 'metodo': m, 'version': VERSION, 'revisada': False}
                        for i, n, b, comps, m in COCKTAILS]}
    return lib

def embed(lib):
    path = os.path.join(ROOT, 'isla_barra_control_mvp.html')
    h = open(path, encoding='utf-8').read()
    OPEN = '<script type="application/json" id="cocktailLibrary">'
    a = h.index(OPEN) + len(OPEN); b = h.index('</script>', a)
    h = h[:a] + json.dumps(lib, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + h[b:]
    open(path, 'w', encoding='utf-8').write(h)

if __name__ == '__main__':
    lib = build()
    json.dump(lib, open(os.path.join(ROOT, 'data', 'cocktail_library.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    embed(lib)
    print(len(lib['cocteles']), 'cócteles,', len(lib['tipos']), 'tipos de ingrediente · versión', lib['version'])
