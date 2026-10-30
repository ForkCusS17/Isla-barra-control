// Isla & Barra Control · función «leer-factura» (Supabase Edge Functions, Deno).
// Recibe las fotos o el PDF de una factura de proveedor y devuelve sus datos como borrador:
// proveedor, número, fechas, total y líneas. La app nunca confirma nada sola: la persona revisa cada línea.
//
// Seguridad:
// · Solo responde a usuarios con sesión que pueden editar el bar (administrador o editor): lo comprueba la base de
//   datos con la función can_edit y el token de quien llama.
// · La clave de Claude va en el secreto ANTHROPIC_API_KEY de Supabase, nunca en la app.
// · Límite: hasta 5 archivos y 6 MB en total (las fotos ya llegan reducidas por la app).
import Anthropic from "npm:@anthropic-ai/sdk@1";

const MODEL = Deno.env.get("FACTURA_MODEL") || "claude-opus-5-5";
const MAX_FILES = 5, MAX_BYTES = 6 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Esquema de la respuesta (salida estructurada: Claude devuelve JSON que lo cumple).
const LINE = {
  type: "object",
  properties: {
    text: { type: "string", description: "Descripción tal como aparece en la factura" },
    kind: { type: "string", enum: ["producto", "portes", "envase", "descuento", "otro"] },
    format: { type: "string", description: "Envase del producto: «70 cl», «1 L», «20 cl», «30 L», «1 kg»… Vacío si no se sabe" },
    qty: { type: "number", description: "Unidades compradas tal como figuran (cajas, botellas, kg…)" },
    packs: { type: "number", description: "Envases por unidad comprada: caja de 6 → 6; caja de 24 → 24; suelto, barril o kg → 1" },
    amount: { type: "number", description: "Importe de la línea SIN impuesto, en positivo (también los descuentos)" },
    taxType: { type: "string", enum: ["", "none", "IGIC", "IVA"] },
    taxRate: { type: "number", description: "Tipo del impuesto en %; 0 si no tiene" },
  },
  required: ["text", "kind", "format", "qty", "packs", "amount", "taxType", "taxRate"],
  additionalProperties: false,
};
const SCHEMA = {
  type: "object",
  properties: {
    supplier: { type: "string" },
    number: { type: "string" },
    date: { type: "string", description: "Fecha de la factura o albarán en formato AAAA-MM-DD; vacía si no se lee" },
    delivery: { type: "string", description: "Fecha de entrega AAAA-MM-DD si figura; si no, vacía" },
    total: { type: "number", description: "Total del documento con impuestos; 0 si no se lee" },
    lines: { type: "array", items: LINE },
    warnings: { type: "array", items: { type: "string" }, description: "Dudas o datos ilegibles, en español y breves" },
  },
  required: ["supplier", "number", "date", "delivery", "total", "lines", "warnings"],
  additionalProperties: false,
};

const PROMPT = `Lee este documento de compra de un bar o restaurante en España (factura, factura simplificada o albarán valorado; puede venir en varias fotos o páginas) y devuelve sus datos.

Reglas:
- Copia los datos tal como aparecen. No inventes nada: si algo no se lee, deja el texto vacío o 0 y explícalo en «warnings».
- Una línea por cada línea del documento, en el mismo orden.
- «kind»: «producto» para lo que se compra para vender o preparar (bebidas, fruta, hielo, café…); «portes» para transporte o envío; «envase» para depósitos, cascos o envases retornables y su devolución; «descuento» para descuentos, rappels o abonos; «otro» para lo demás.
- «amount» es el importe de la línea sin impuesto y siempre en positivo; un descuento también va en positivo con «kind» = «descuento». Si el documento solo muestra importes con impuesto incluido, calcula la base y avísalo en «warnings».
- «qty» son las unidades compradas tal como figuran; «packs» los envases que trae cada unidad (caja de 6 → 6, pack de 24 → 24; suelto, barril o kilo → 1). «format» es el envase individual (por ejemplo «70 cl» o «20 cl»), no la caja.
- «taxType»: «IGIC» en Canarias, «IVA» en el resto; «none» si la línea no lleva impuesto; vacío si no se sabe. «taxRate» es el tipo de esa línea (0 si no tiene).
- Las fechas en formato AAAA-MM-DD.
- «total» es el total final del documento con impuestos.`;

function b64Size(s: string) {
  return Math.floor((s.length * 3) / 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return json({ error: "Falta la sesión" }, 401);

  let body: { bar_id?: unknown; files?: unknown; check?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Petición no válida" }, 400);
  }
  // Comprobación de la app: ¿está la función instalada y con la clave? (sin leer nada ni gastar)
  if (body && body.check === true) return json({ ok: true, ready: !!Deno.env.get("ANTHROPIC_API_KEY") });
  const bar = typeof body.bar_id === "string" ? body.bar_id : "";
  const files = Array.isArray(body.files) ? body.files : [];
  if (!/^[0-9a-f-]{36}$/i.test(bar)) return json({ error: "Bar no válido" }, 400);
  if (!files.length || files.length > MAX_FILES) return json({ error: `Envía entre 1 y ${MAX_FILES} archivos` }, 400);
  let total = 0;
  for (const f of files) {
    if (!f || typeof f !== "object" || !TYPES.has((f as { type?: string }).type || "") || typeof (f as { data?: unknown }).data !== "string" || /[^A-Za-z0-9+/=]/.test((f as { data: string }).data)) {
      return json({ error: "Solo fotos (JPEG, PNG, WebP) o PDF" }, 400);
    }
    total += b64Size((f as { data: string }).data);
  }
  if (total > MAX_BYTES) return json({ error: "Los archivos ocupan demasiado (máximo 6 MB en total)" }, 413);

  // ¿Puede editar este bar quien llama? Lo decide la base de datos con su propio token.
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ error: "Falta la configuración de Supabase" }, 500);
  const perm = await fetch(`${url}/rest/v1/rpc/can_edit`, {
    method: "POST",
    headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ p_bar: bar }),
  });
  if (!perm.ok || (await perm.json()) !== true) return json({ error: "Tu cuenta no puede editar este bar" }, 403);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "Falta la clave ANTHROPIC_API_KEY en los secretos de Supabase" }, 500);
  const client = new Anthropic();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files as { type: string; data: string }[]) {
    if (f.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: f.type as "image/jpeg" | "image/png" | "image/webp", data: f.data } });
    }
  }
  content.push({ type: "text", text: PROMPT });

  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return json({ error: "La IA no ha podido leer este documento" }, 422);
    if (res.stop_reason === "max_tokens") return json({ error: "La factura es demasiado larga para leerla de una vez" }, 422);
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "La IA no ha devuelto datos" }, 502);
    let data: unknown;
    try {
      data = JSON.parse(text.text);
    } catch {
      return json({ error: "La respuesta de la IA no es válida" }, 502);
    }
    return json({ ok: true, data, model: res.model, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Demasiadas lecturas seguidas: espera un momento" }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "La clave de Claude no es válida" }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: `Error del servicio de lectura (${e.status ?? "sin código"})` }, 502);
    return json({ error: "No se ha podido leer la factura" }, 500);
  }
});
