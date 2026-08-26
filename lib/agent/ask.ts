"use server";

// Asistente del sistema. Es un agente con herramientas, no un resumidor: en
// vez de recibir una foto del stock pegada en el prompt, consulta lo que
// necesita contra los mismos módulos derivados que alimentan las páginas (ver
// lib/agent/tools.ts). Eso es lo que le permite responder sobre stock,
// movimientos, trazabilidad de un lote, parcelas, muestreos, órdenes de
// trabajo, costos y discrepancias, y no solo sobre el saldo del depósito.
//
// Solo lee. No hay ninguna herramienta que escriba en la base: registrar un
// movimiento o un conteo sigue pasando por el formulario, con su validación de
// stock y su control de rol.

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getUsuarioActual } from "@/lib/auth";
import { HERRAMIENTAS, ejecutarHerramienta } from "./tools";

export type PasoHerramienta = {
  nombre: string;
  argumentos: Record<string, unknown>;
  error: boolean;
};

export type RespuestaAsistente =
  | { ok: true; texto: string; pasos: PasoHerramienta[] }
  | { ok: false; error: string };

const MODELO = "claude-opus-5";

/**
 * Cuántas veces puede volver a pedir datos antes de tener que contestar.
 * Una pregunta cruzada de verdad ("¿qué parcela proyectaba bien y terminó
 * abajo, y cuánto gastó en insumos?") necesita tres o cuatro consultas; más
 * que esto es el modelo dando vueltas.
 */
const MAX_TURNOS = 8;

function systemPrompt(usuario: { nombre: string; rol: string }): string {
  return `Sos el asistente de Papasud Tech, el sistema con el que Papasud maneja su operación de papa: del campo al depósito y del depósito al cliente. Te consulta ${usuario.nombre}, con rol ${usuario.rol}.

CÓMO ESTÁ ARMADO EL NEGOCIO
- La cadena es parcela -> orden de trabajo -> cosecha -> lote -> movimiento -> stock -> cliente. Todo lo que informás sale de algún eslabón de esa cadena.
- Nada que se pueda calcular está guardado. El stock no vive en ninguna tabla: se deriva sumando los movimientos contra el origen y el destino de cada remito. Lo mismo el rendimiento, el porcentaje de exportación y el costo de insumos.
- Un lote es una partida de mercadería identificada por número. El mismo número de lote en dos ubicaciones distintas es mercadería distinta.
- Las ubicaciones propias son campos, plantas, galpones y frigoríficos. Los clientes también son ubicaciones: lo que figura ahí ya se entregó y no es stock disponible.
- La categoría comercial (exportación, sin chicas, recibo, granel, descarte, solo chasis, semilla) no se decide en el campo. La papa entra a planta como granel o recibo y recién se clasifica después de tamañar, en los movimientos posteriores. Por eso los kilos de exportación de una parcela se reconstruyen siguiendo el par variedad-lote, no leyendo la categoría del ingreso.
- La proyección de cosecha es aritmética sobre la distribución de calibres de un muestreo pre-cosecha. No es un modelo predictivo y no hay que presentarla como tal.
- Una discrepancia es la diferencia entre el stock derivado y el último conteo físico. Casi siempre es un remito sin asentar o un pesaje mal tomado, no un faltante real.

CÓMO TRABAJÁS
- Usá las herramientas para buscar los datos. Nunca respondas un número de memoria ni lo estimes: si no lo consultaste, no lo sabés.
- Podés encadenar varias consultas para cruzar información. Si una pregunta necesita stock y órdenes, pedí las dos.
- Si no sabés qué valores existen (nombres de ubicación, variedades, clientes, campañas), consultá los catálogos antes de filtrar a ciegas.
- Si una herramienta avisa que recortó filas, decilo o volvé a consultar con un filtro más angosto.
- Si la pregunta no se puede responder con los datos del sistema, decilo en una línea y aclarás qué dato haría falta. No inventes.
- Solo podés leer. Si te piden registrar, corregir o borrar algo, explicá que eso se hace desde el formulario de la sección correspondiente.

CÓMO RESPONDÉS
- Breve: dos o tres frases, o una lista corta. Es una consulta operativa, no un informe.
- Los kilos van redondeados y con separador de miles, siempre con la unidad.
- Si sumaste varias filas, decí cuántas sumaste.
- Español rioplatense, sin em-dash.
- Texto plano: nada de markdown, asteriscos, viñetas con guion ni encabezados. La respuesta se muestra tal cual, sin renderizar.`;
}

export async function preguntarAlAsistente(
  pregunta: string,
): Promise<RespuestaAsistente> {
  const limpia = pregunta.trim();
  if (!limpia) return { ok: false, error: "Escribí una pregunta." };
  if (limpia.length > 1000) {
    return { ok: false, error: "La pregunta es demasiado larga." };
  }

  const usuario = await getUsuarioActual();
  if (!usuario) {
    return { ok: false, error: "Sesión vencida. Volvé a entrar." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Falta ANTHROPIC_API_KEY en el entorno." };
  }

  const client = new Anthropic();
  const messages: MessageParam[] = [{ role: "user", content: limpia }];
  const pasos: PasoHerramienta[] = [];

  try {
    for (let turno = 0; turno < MAX_TURNOS; turno++) {
      const response = await client.messages.create({
        model: MODELO,
        max_tokens: 8000,
        output_config: { effort: "low" },
        system: [
          {
            type: "text",
            text: systemPrompt({ nombre: usuario.nombre, rol: usuario.rol }),
            // El prompt de sistema y las definiciones de herramientas no
            // cambian entre turnos: cachearlos abarata cada ida y vuelta del
            // bucle, que es donde se va el costo de un agente.
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: HERRAMIENTAS,
        messages,
      });

      const usos = response.content.filter((b) => b.type === "tool_use");

      if (response.stop_reason !== "tool_use" || usos.length === 0) {
        const texto = response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();

        if (!texto) {
          return { ok: false, error: "El modelo no devolvió una respuesta." };
        }
        return { ok: true, texto, pasos };
      }

      messages.push({ role: "assistant", content: response.content });

      const resultados: ContentBlockParam[] = [];
      for (const uso of usos) {
        const args = (uso.input ?? {}) as Record<string, unknown>;
        const { resultado, error } = await ejecutarHerramienta(uso.name, args);
        pasos.push({ nombre: uso.name, argumentos: args, error });
        resultados.push({
          type: "tool_result",
          tool_use_id: uso.id,
          content: resultado,
          is_error: error,
        });
      }
      messages.push({ role: "user", content: resultados });
    }

    return {
      ok: false,
      error:
        "La consulta necesitó demasiados pasos y se cortó. Probá con una pregunta más acotada.",
    };
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
