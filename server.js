// =============================
// FIO BACKEND PRO - ESTABLE
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
  res.send("FIO backend funcionando 🚀");
});

// =============================
// MEMORIA SIMPLE
// =============================
const estado = {};

// =============================
// PREGUNTAS (simplificado estable)
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal?",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué resultados esperas?"
];

// =============================
// VALIDACIÓN SIMPLE
// =============================
function validar(msg) {
  return msg && msg.trim().length > 3;
}

// =============================
// IA (SEGURA)
// =============================
async function llamarIA(texto) {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: texto }]
      })
    });

    const d = await r.json();
    return d.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (e) {
    return "Error conectando con IA";
  }
}

// =============================
// ENDPOINT PRINCIPAL
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId = "default", msg = "" } = req.body;

    // crear memoria
    if (!estado[userId]) {
      estado[userId] = {
        paso: 0,
        respuestas: []
      };
    }

    let paso = estado[userId].paso;

    // =============================
    // INICIO
    // =============================
    if (paso === 0) {
      estado[userId].paso = 1;

      return res.json({
        response: `Hola 👋 Soy FIO.

Vamos a construir tu proyecto paso a paso.

👉 ${preguntas[0]}`
      });
    }

    // =============================
    // VALIDACIÓN
    // =============================
    if (!validar(msg)) {
      return res.json({
        response: "Dame un poco más de detalle 👀"
      });
    }

    // guardar respuesta
    estado[userId].respuestas.push(msg);

    // =============================
    // SIGUIENTE PREGUNTA
    // =============================
    if (paso < preguntas.length) {
      estado[userId].paso++;

      return res.json({
        response: `Perfecto 👍

👉 ${preguntas[paso]}`
      });
    }

    // =============================
    // GENERAR PROYECTO
    // =============================
    const respuestas = estado[userId].respuestas;

    const prompt = `
Eres un experto en formulación de proyectos.

Con esta información:

${respuestas.join("\n")}

Genera un proyecto estructurado con:
- problema
- objetivos
- solución
- resultados
`;

    const resultado = await llamarIA(prompt);

    // =============================
    // MATCHING
    // =============================
    const proyectoData = {
      sector: "social",
      ods: ["4"],
      presupuesto: 100000000
    };

    const convocatorias = await buscarConvocatorias("social");
    const matches = hacerMatching(proyectoData, convocatorias);

    // reset memoria
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
  console.log("Servidor en puerto " + PORT);
});
