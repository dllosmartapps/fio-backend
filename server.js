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
// PREGUNTAS
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal?",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué evidencias tienes?",
  "¿Tema del proyecto?",
  "¿Duración?",
  "¿Recursos?",
  "¿Presupuesto?",
  "¿Metas?",
  "¿ODS?",
  "¿Formato?",
  "¿Normas?",
  "¿Deseas ayuda adicional?"
];

// =============================
// UTILS
// =============================
const clean = (m = "") => m.toLowerCase().trim();

function detectarModo(msg) {
  const m = clean(msg);

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto")) return "proyecto";

  return null;
}

function validar(msg) {
  return msg && msg.trim().length > 3;
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
    return d?.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

// =============================
// ASESOR
// =============================
async function asesor(p, r) {
  return await llamarIA(`
Eres experto en proyectos.

Usuario: "${r}"
Pregunta: "${p}"

Mejora la respuesta y guía.

Formato:
👉 Mejor así:
"texto mejorado"
`);
}

// =============================
// RESET
// =============================
function init(userId) {
  estado[userId] = {
    inicio: true,
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

    if (!estado[userId]) init(userId);

    const user = estado[userId];
    const modoDetectado = detectarModo(msg);

    // =============================
    // 1. DETECCIÓN GLOBAL (CLAVE)
    // =============================
    if (modoDetectado === "convocatorias") {
      const conv = await buscarConvocatorias("social");

      return res.json({
        response: "🔎 Aquí tienes convocatorias:",
        data: conv
      });
    }

    if (modoDetectado === "proyecto") {
      user.modo = "proyecto";
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Excelente decisión 🙌\n\nVamos paso a paso.\n\n👉 ${preguntas[0]}`
      });
    }

    // =============================
    // 2. SALUDO SOLO SI NO DIJO NADA ÚTIL
    // =============================
    if (user.inicio) {
      user.inicio = false;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a:
✔ Crear proyectos paso a paso
✔ Mejorar ideas
✔ Buscar convocatorias

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // 3. FLUJO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      if (!validar(msg)) {
        return res.json({
          response: "💡 Dame un poco más de detalle"
        });
      }

      const mejora = await asesor(preguntas[user.paso], msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${mejora}

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const proyecto = await llamarIA(`
Genera proyecto estructurado:
${user.respuestas.join("\n")}
`);

      init(userId);

      return res.json({
        response: "🎉 Proyecto listo:",
        proyecto
      });
    }

    // =============================
    // 4. DEFAULT
    // =============================
    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (error) {
    return res.json({ error: error.message });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor OK en " + PORT);
});
  console.log("Servidor PRO activo en " + PORT);
});
