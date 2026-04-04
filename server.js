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
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("FIO SaaS PRO activo 🚀");
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
  "¿Cuál es el problema principal?",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué evidencias tienes del problema?",
  "¿Cuál es el tema?",
  "¿Duración estimada?",
  "¿Recursos disponibles?",
  "¿Presupuesto?",
  "¿Metas?",
  "¿ODS?",
  "¿Formato?",
  "¿Normas?",
  "¿Deseas que proponga lo faltante?"
];

// =============================
// VALIDACIÓN
// =============================
function validarRespuesta(texto) {
  if (!texto) return false;
  const t = texto.trim();
  if (t.length < 5) return false;

  const basura = ["1", "ok", "si", "no", "x"];
  if (basura.includes(t.toLowerCase())) return false;

  return true;
}

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarModo(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto")) return "proyecto";

  return null;
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
    return d?.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (e) {
    console.error("IA ERROR:", e);
    return "Error IA";
  }
}

// =============================
// ASESOR
// =============================
async function asesor(pregunta, respuesta) {
  return await llamarIA(`
Eres experto en proyectos.

Respuesta: "${respuesta}"
Pregunta: "${pregunta}"

Corrige y mejora.

Formato:
👉 Mejor así:
"texto mejorado"
`);
}

// =============================
// BLOQUES
// =============================
async function arbolProblemas(r) {
  return await llamarIA(`Genera árbol de problemas:\n${r.join("\n")}`);
}

async function arbolObjetivos(r) {
  return await llamarIA(`Genera árbol de objetivos:\n${r.join("\n")}`);
}

async function alternativas(r) {
  return await llamarIA(`Genera soluciones:\n${r.join("\n")}`);
}

async function marcoLogico(r) {
  return await llamarIA(`Genera marco lógico:\n${r.join("\n")}`);
}

// =============================
// RESET
// =============================
function resetUser(id) {
  estado[id] = {
    modo: null,
    paso: 0,
    respuestas: []
  };
}

// =============================
// CHAT
// =============================
app.post("/chat", async (req, res) => {
  try {
    let { userId, msg } = req.body;

    if (!userId) userId = "global-user";
    if (!msg) msg = "";

    if (!estado[userId]) {
      resetUser(userId);
    }

    const user = estado[userId];

    // =============================
    // INICIO (ANTI LOOP)
    // =============================
    if (!user.modo) {
      const modo = detectarModo(msg);

      // convocatorias directo
      if (modo === "convocatorias") {
        const conv = await buscarConvocatorias("social");
        return res.json({
          response: "Aquí tienes convocatorias:",
          data: conv
        });
      }

      // 👉 SIEMPRE INICIA PROYECTO
      user.modo = "proyecto";
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
      });
    }

    // =============================
    // PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      if (!validarRespuesta(msg)) {
        return res.json({
          response: "Dame más detalle 👀"
        });
      }

      const mejora = await asesor(preguntas[user.paso], msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response: `${mejora}\n\n👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const problemas = await arbolProblemas(user.respuestas);
      const objetivos = await arbolObjetivos(user.respuestas);
      const alt = await alternativas(user.respuestas);
      const marco = await marcoLogico(user.respuestas);

      const conv = await buscarConvocatorias("social");
      const match = hacerMatching({ sector: "social" }, conv);

      resetUser(userId);

      return res.json({
        arbol_problemas: problemas,
        arbol_objetivos: objetivos,
        alternativas: alt,
        marco_logico: marco,
        convocatorias: match
      });
    }

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor funcionando en puerto " + PORT);
});
