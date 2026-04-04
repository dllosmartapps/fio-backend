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
// PREGUNTAS
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema?",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué resultados esperas?"
];

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
    return d.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (e) {
    return "Error IA";
  }
}

// =============================
// CHAT
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId = "default", msg = "" } = req.body;

    if (!estado[userId]) {
      estado[userId] = { paso: 0, respuestas: [] };
    }

    let paso = estado[userId].paso;

    if (paso === 0) {
      estado[userId].paso = 1;
      return res.json({
        response: `Hola 👋 Soy FIO.\n👉 ${preguntas[0]}`
      });
    }

    estado[userId].respuestas.push(msg);

    if (paso < preguntas.length) {
      estado[userId].paso++;
      return res.json({
        response: `👉 ${preguntas[paso]}`
      });
    }

    // =============================
    // GENERAR PROYECTO
    // =============================
    const respuestas = estado[userId].respuestas;

    const resultado = await llamarIA(`
Genera un proyecto con:
${respuestas.join("\n")}
`);

    // =============================
    // MATCHING
    // =============================
    const convocatorias = await buscarConvocatorias("social");
    const matches = hacerMatching(
      { sector: "social" },
      convocatorias
    );

    estado[userId] = { paso: 0, respuestas: [] };

    return res.json({
      proyecto: resultado,
      convocatorias: matches
    });

  } catch (error) {
    return res.json({
      error: error.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor en puerto " + PORT);
});
