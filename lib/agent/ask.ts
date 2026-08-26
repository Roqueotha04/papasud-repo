"use server";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { calcularStock } from "@/lib/stock";

export type RespuestaAsistente =
  | { ok: true; texto: string; filas: number }
  | { ok: false; error: string };

const MODELO = "claude-opus-5";

/**
 * Foto del stock derivado, serializada como tabla de texto.
 * Son ~150 filas (~2k tokens): entra entera en el prompt, así que el modelo
 * responde sobre datos reales sin necesidad de consultar la base por su cuenta.
 */
async function snapshotStock(): Promise<{ texto: string; filas: number }> {
  const [locations, filas] = await Promise.all([
    prisma.location.findMany({
      select: { id: true, nombre: true, tipo: true, esPropia: true },
      orderBy: { nombre: "asc" },
    }),
    calcularStock(),
  ]);

  const porId = new Map(locations.map((l) => [l.id, l]));
  const lineas: string[] = [];

  for (const loc of locations) {
    const propias = filas.filter((f) => f.locId === loc.id);
    if (propias.length === 0) continue;

    const totalKg = propias.reduce((sum, f) => sum + f.kg, 0);
    lineas.push(
      `\n## ${loc.nombre} (${loc.tipo}${loc.esPropia ? ", propia" : ""}) - total ${Math.round(totalKg)} kg`,
    );
    lineas.push("variedad | lote | kg | bolsas");
    for (const f of propias) {
      lineas.push(
        `${f.variedad} | ${f.lote} | ${Math.round(f.kg)} | ${f.bolsas}`,
      );
    }
  }

  const sinUbicacion = filas.filter((f) => !porId.has(f.locId)).length;
  if (sinUbicacion > 0) {
    lineas.push(`\n(${sinUbicacion} filas sin ubicación reconocida)`);
  }

  return { texto: lineas.join("\n"), filas: filas.length };
}

function systemPrompt(snapshot: string, filas: number): string {
  return `Sos el asistente de Papasud Tech, el sistema de gestión de la operación de papa de Papasud. Respondés preguntas sobre el stock de la operación.

CONTEXTO DE NEGOCIO
- El stock no se guarda en ninguna tabla: se deriva sumando los movimientos (remitos) contra el origen y el destino de cada uno. Un lote es una partida de mercadería identificada por número.
- Las ubicaciones propias son campos, plantas, galpones y frigoríficos. Los clientes también son ubicaciones, y la mercadería que figura ahí ya fue entregada.
- Categorías comerciales del negocio: exportación, sin chicas, recibo, granel, descarte, solo chasis, semilla.
- El mismo número de lote en dos ubicaciones distintas es mercadería distinta.

STOCK ACTUAL (${filas} filas, derivado de todos los movimientos registrados)
${snapshot}

REGLAS
- Respondé únicamente con los datos de la tabla de arriba. Si la pregunta no se puede contestar con eso, decilo en una línea y aclarás qué dato haría falta. Nunca inventes números.
- Sé breve: dos o tres frases, o una lista corta. Es una consulta operativa, no un informe.
- Los kilos van redondeados y con separador de miles. Aclarás siempre la unidad.
- Si sumás varias filas, decí cuántas sumaste.
- Escribí en español rioplatense, sin em-dash.
- Texto plano: nada de markdown, asteriscos, viñetas con guion ni encabezados. La respuesta se muestra tal cual, sin renderizar.`;
}

export async function preguntarAlAsistente(
  pregunta: string,
): Promise<RespuestaAsistente> {
  const limpia = pregunta.trim();
  if (!limpia) return { ok: false, error: "Escribí una pregunta." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Falta ANTHROPIC_API_KEY en el entorno." };
  }

  try {
    const { texto: snapshot, filas } = await snapshotStock();
    const client = new Anthropic();

    const response = await client.messages.create({
      model: MODELO,
      max_tokens: 8000,
      output_config: { effort: "low" },
      // El snapshot no cambia mientras no se registren movimientos, así que
      // cachearlo abarata y acelera las preguntas siguientes de una misma sesión.
      cache_control: { type: "ephemeral" },
      system: systemPrompt(snapshot, filas),
      messages: [{ role: "user", content: limpia }],
    });

    const texto = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) {
      return { ok: false, error: "El modelo no devolvió texto." };
    }
    return { ok: true, texto, filas };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "La API key de Anthropic fue rechazada." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de la API alcanzado. Probá de nuevo." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Error de la API (${error.status}).` };
    }
    console.error("[asistente]", error);
    return { ok: false, error: "No se pudo consultar el asistente." };
  }
}
