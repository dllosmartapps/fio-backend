import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import { buscarConvocatorias } from "./modules/scraper.js";
import { hacerMatching } from "./modules/matching.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================
// MEMORIA
// =============================
const estado = {};

// =============================
// PREGUNTAS (CONSULTOR REAL)
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "Describe el problema claramente (situación negativa + quién afecta)",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia? (tipo de población)",
  "¿Qué resultados esperas lograr?"
];

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarIntencion(msg) {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria") || m.includes("financiación")) {
    return "convocatorias";
  }

  if (m.includes("proyecto") || m.includes("crear")) {
    return "proyecto";
  }

  return "continuar";
}

// =============================
// VALIDACIÓN REAL
// =============================
function validar(paso, msg) {
  if (!msg || msg.trim().length < 5) {
    return "Necesito más detalle para ayudarte bien 👀";
  }

  if (paso === 1 && msg.length < 20) {
    return "El problema debe ser claro, con población afectada. Ej: 'Baja articulación de organizaciones sociales en Manizales'.";
  }

  if (paso === 4 && msg.length < 10) {
    return "Los resultados deben ser concretos y medibles.";
  }

  return null;
}

// =============================
// MEJORAR RESPUESTA
// =============================
function mejorar(paso, msg) {
  const texto = msg.trim();
  const limpio = texto.charAt(0).toUpperCase() + texto.slice(1);

  if (paso === 1) {
    return `Problema reformulado:
"${limpio}"

👉 Debe ser negativo, claro y sin solución incluida.`;
  }

  if (paso === 4) {
    return `Resultado esperado:
"${limpio}"

👉 Intenta que sea medible.`;
  }

  return `"${limpio}"`;
}

// =============================
// IA
// =============================
async function llamarIA(prompt) {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const d = await r.json();
    return d.choices?.[0]?.message?.content || "Error IA";
  } catch {
    return "Error conectando con IA";
  }
}

// =============================
// ROOT
// =============================
app.get("/", (req, res) => {
  res.send("FIO inteligente activo 🚀");
});

// =============================
// CHAT PRINCIPAL
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId = "default", msg = "" } = req.body;

    const intencion = detectarIntencion(msg);

    // =============================
    // CONVOCATORIAS DIRECTO
    // =============================
    if (intencion === "convocatorias") {
      const convocatorias = await buscarConvocatorias("social");

      return res.json({
        response: "Aquí tienes convocatorias reales:",
        convocatorias
      });
    }

    // =============================
    // CREAR MEMORIA
    // =============================
    if (!estado[userId]) {
      estado[userId] = { paso: 0, respuestas: [] };
    }

    let paso = estado[userId].paso;

    // =============================
    // INICIO
    // =============================
    if (paso === 0) {
      estado[userId].paso = 1;

      return res.json({
        response: `Hola 👋 Soy FIO, tu consultor de proyectos.

Te voy a ayudar a formular un proyecto sólido (no plantillas vacías).

👉 ${preguntas[0]}`
      });
    }

    // =============================
    // VALIDAR
    // =============================
    const error = validar(paso, msg);
    if (error) {
      return res.json({ response: error });
    }

    // =============================
    // GUARDAR
    // =============================
    estado[userId].respuestas.push(msg);

    const mejora = mejorar(paso, msg);

    // =============================
    // SIGUIENTE
    // =============================
    if (paso < preguntas.length) {
      estado[userId].paso++;

      return res.json({
        response: `👍 Vamos bien

${mejora}

👉 ${preguntas[paso]}`
      });
    }

    // =============================
    // GENERAR PROYECTO REAL
    // =============================
    const respuestas = estado[userId].respuestas;

    const prompt = `
Eres un consultor experto en formulación de proyectos.

Construye un proyecto completo con:

- problema bien redactado
- objetivos claros
- solución estructurada
- resultados medibles

Información:
${respuestas.join("\n")}
`;

    const proyecto = await llamarIA(prompt);

    // =============================
    // MATCHING
    // =============================
    const convocatorias = await buscarConvocatorias("social");
    const matches = hacerMatching(
      { sector: "social" },
      convocatorias
    );

    // RESET
    estado[userId] = { paso: 0, respuestas: [] };

    return res.json({
      response: "Proyecto formulado correctamente 🚀",
      proyecto,
      convocatorias: matches
    });

  } catch (e) {
    return res.json({
      error: "Error interno",
      detalle: e.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("FIO inteligente en puerto " + PORT);
});
