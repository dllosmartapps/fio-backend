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
// MEMORIA POR USUARIO
// =============================
const estado = {};

// =============================
// 14 PREGUNTAS
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal que se desea resolver?",
  "¿Dónde se desarrolla el proyecto?",
  "¿A quién está dirigido?",
  "¿Qué evidencias tienes del problema?",
  "¿Cuál es el tema del proyecto?",
  "¿Cuál es la duración estimada?",
  "¿Con qué recursos cuentas actualmente?",
  "¿Cuál es el presupuesto disponible?",
  "¿Qué metas esperas lograr?",
  "¿A qué ODS se alinea?",
  "¿Qué formato necesitas? (MGA, Marco lógico, etc.)",
  "¿Debe seguir normas específicas?",
  "¿Quieres que el agente proponga lo faltante?"
];

// =============================
// VALIDACIÓN
// =============================
function validarRespuesta(texto) {
  if (!texto) return false;
  if (texto.trim().length < 3) return false;
  return true;
}

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarModo(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("proyecto")) return "proyecto";
  if (m.includes("convocatoria")) return "convocatorias";

  return null;
}

// =============================
// LLAMADA A IA (OPENROUTER)
// =============================
async function llamarIA(prompt) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

    const data = await response.json();

    return data?.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (error) {
    return "Error IA";
  }
}

// =============================
// ASESOR EXPERTO
// =============================
async function mejorarRespuesta(pregunta, respuestaUsuario) {
  const prompt = `
Eres un experto en formulación de proyectos (Marco Lógico, MGA).

El usuario respondió:
"${respuestaUsuario}"

La pregunta fue:
"${pregunta}"

Tareas:
1. Evalúa la calidad de la respuesta
2. Mejórala con redacción técnica
3. Enséñale brevemente cómo mejorarla

Formato EXACTO:

👉 Vas bien 🔥
👉 Podemos formularlo así:
"Texto mejorado"

👉 Explicación breve (máx 1 línea)
`;

  return await llamarIA(prompt);
}

// =============================
// GENERAR PROYECTO FINAL
// =============================
async function generarProyecto(respuestas) {
  const prompt = `
Actúa como experto en formulación de proyectos bajo metodología Marco Lógico y MGA.

Construye un proyecto estructurado con:

- Problema
- Objetivo general
- Objetivos específicos
- Justificación
- Resultados esperados

Usa redacción técnica, clara y profesional.

Datos del usuario:
${respuestas.join("\n")}
`;

  return await llamarIA(prompt);
}

// =============================
// CHAT PRINCIPAL
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId = "default", msg = "" } = req.body;

    // iniciar usuario
    if (!estado[userId]) {
      estado[userId] = {
        modo: null,
        paso: 0,
        respuestas: []
      };
    }

    const user = estado[userId];

    // =============================
    // DETECTAR MODO
    // =============================
    if (!user.modo) {
      const modo = detectarModo(msg);

      if (modo === "proyecto") {
        user.modo = "proyecto";
        user.paso = 0;
        user.respuestas = [];

        return res.json({
          response: `Perfecto 👌 vamos a formular tu proyecto paso a paso.\n\n👉 ${preguntas[0]}`
        });
      }

      if (modo === "convocatorias") {
        const convocatorias = await buscarConvocatorias("social");

        return res.json({
          response: "Aquí tienes algunas convocatorias:",
          data: convocatorias
        });
      }

      return res.json({
        response: "¿Quieres crear un proyecto o buscar convocatorias?"
      });
    }

    // =============================
    // MODO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      // validar
      if (!validarRespuesta(msg)) {
        return res.json({
          response: "Necesito más detalle para ayudarte bien 👀"
        });
      }

      const preguntaActual = preguntas[user.paso];

      // mejorar respuesta con IA
      const mejora = await mejorarRespuesta(preguntaActual, msg);

      // guardar respuesta
      user.respuestas.push(msg);

      // avanzar preguntas
      if (user.paso < preguntas.length - 1) {
        user.paso++;

        const progreso = Math.round((user.paso / preguntas.length) * 100);

        return res.json({
          response: `${mejora}\n\n✅ ${progreso}% completado\n👉 ${preguntas[user.paso]}`
        });
      }

      // =============================
      // GENERAR PROYECTO
      // =============================
      const proyecto = await generarProyecto(user.respuestas);

      // =============================
      // MATCHING
      // =============================
      const convocatorias = await buscarConvocatorias("social");

      const matches = hacerMatching(
        { sector: "social" },
        convocatorias
      );

      // reset usuario
      estado[userId] = {
        modo: null,
        paso: 0,
        respuestas: []
      };

      return res.json({
        proyecto,
        convocatorias: matches
      });
    }

  } catch (error) {
    return res.json({
      error: error.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
