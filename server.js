// =============================
// FIO BACKEND PRO FINAL (ESTABLE)
// =============================

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
// TEST
// =============================
app.get("/", (req, res) => {
  res.send("FIO PRO activo 🚀");
});

// =============================
// MEMORIA
// =============================
const estado = {};

// =============================
// PREGUNTAS REALES (14)
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "Describe claramente el problema (situación negativa, población afectada)",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué evidencias tienes?",
  "¿Tema del proyecto?",
  "¿Duración estimada?",
  "¿Recursos disponibles?",
  "¿Presupuesto disponible?",
  "¿Qué metas esperas lograr?",
  "¿A qué ODS se alinea?",
  "¿Formato institucional?",
  "¿Normas específicas?",
  "¿Deseas que proponga alternativas?"
];

// =============================
// VALIDACIÓN INTELIGENTE
// =============================
function validarRespuesta(paso, msg) {
  if (!msg || msg.trim().length < 5) {
    return "Necesito más detalle para formular correctamente 👀";
  }

  if (paso === 1 && msg.length < 15) {
    return "El problema debe ser más claro, con población afectada.";
  }

  if (paso === 9 && msg.toLowerCase().includes("no se")) {
    return "Las metas deben ser claras y medibles.";
  }

  return null;
}

// =============================
// MEJORA DE TEXTO
// =============================
function mejorarTexto(paso, msg) {
  const t = msg.trim();
  const texto = t.charAt(0).toUpperCase() + t.slice(1);

  if (paso === 1) {
    return `Problema mejor formulado:
"${texto}"

👉 Debe ser negativo, concreto y sin soluciones.`;
  }

  if (paso === 9) {
    return `Meta reformulada:
"${texto}"

👉 Debe ser medible.`;
  }

  return `"${texto}"`;
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
  } catch (e) {
    return "Error IA";
  }
}

// =============================
// SCRAPING CONTEXTO
// =============================
async function obtenerContexto(msg) {
  try {
    const data = await buscarConvocatorias(msg);
    return data.map(x => x.descripcion).join("\n");
  } catch {
    return "";
  }
}

// =============================
// ENDPOINT PRINCIPAL
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId = "default", msg = "" } = req.body;

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
        response: `Hola 👋 Soy FIO, tu consultor experto en proyectos.

Vamos a construir un proyecto sólido paso a paso.

👉 ${preguntas[0]}`
      });
    }

    // =============================
    // VALIDAR
    // =============================
    const errorValidacion = validarRespuesta(paso, msg);
    if (errorValidacion) {
      return res.json({ response: errorValidacion });
    }

    estado[userId].respuestas.push(msg);

    const mejora = mejorarTexto(paso, msg);

    // =============================
    // SIGUIENTE PASO
    // =============================
    if (paso < preguntas.length) {
      estado[userId].paso++;

      return res.json({
        response: `(${Math.round((paso / preguntas.length) * 100)}%) 👍

${mejora}

👉 ${preguntas[paso]}`
      });
    }

    // =============================
    // GENERAR PROYECTO COMPLETO
    // =============================
    const respuestas = estado[userId].respuestas;

    const contexto = await obtenerContexto(respuestas[1]);

    const prompt = `
Eres un experto en formulación de proyectos (Marco Lógico, MGA, ODS).

Información del usuario:
${respuestas.join("\n")}

Contexto real:
${contexto}

Genera:

1. Árbol de problemas
2. Árbol de objetivos
3. Alternativas
4. Proyecto completo estructurado
5. Indicadores
6. Cronograma
7. Presupuesto

Debe ser profesional, coherente y técnico.
`;

    const resultado = await llamarIA(prompt);

    // =============================
    // MATCHING CONVOCATORIAS
    // =============================
    const proyectoData = {
      sector: "social",
      ods: ["4", "17"],
      presupuesto: 100000000
    };

    const convocatorias = await buscarConvocatorias("social");
    const matches = hacerMatching(proyectoData, convocatorias);

    // RESET
    estado[userId] = { paso: 0, respuestas: [] };

    // =============================
    // RESPUESTA FINAL
    // =============================
    return res.json({
      proyecto: resultado,
      convocatorias: matches
    });

  } catch (error) {
    return res.json({
      error: "Error en servidor",
      detalle: error.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("FIO PRO corriendo en puerto " + PORT);
});
