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
  "¿Cuál es el problema principal que quieres resolver?",
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
// UTILIDADES
// =============================
function limpiar(msg = "") {
  return msg.toString().toLowerCase().trim();
}

function esCambioModo(msg) {
  const m = limpiar(msg);

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto")) return "proyecto";

  return null;
}

function esValida(msg) {
  if (!msg) return false;
  if (msg.trim().length < 3) return false;
  return true;
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
// ASESOR HUMANO
// =============================
async function asesor(pregunta, respuesta) {
  return await llamarIA(`
Eres un consultor experto en proyectos.

Usuario dijo:
"${respuesta}"

Pregunta:
"${pregunta}"

Haz esto:
- mejora la respuesta
- guía al usuario
- sé amable y motivador

Formato:

👉 Vas muy bien 🔥
👉 Podemos formularlo así:
"texto mejorado"

👉 Consejo breve
`);
}

// =============================
// RESET
// =============================
function reset(userId) {
  estado[userId] = {
    modo: null,
    paso: 0,
    respuestas: [],
    inicio: true
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

    if (!estado[userId]) reset(userId);

    const user = estado[userId];
    const m = limpiar(msg);

    // =============================
    // SALUDO INICIAL
    // =============================
    if (user.inicio) {
      user.inicio = false;

      return res.json({
        response:
`Hola 👋 Soy FIO, tu asesor en formulación de proyectos.

Puedo ayudarte a:
✔ Crear proyectos paso a paso
✔ Mejorar ideas
✔ Buscar convocatorias

💡 Solo dime qué quieres hacer o escribe tu idea.

Por ejemplo:
👉 "Quiero crear un proyecto"
👉 "Ver convocatorias"`
      });
    }

    // =============================
    // CAMBIO DE MODO GLOBAL
    // =============================
    const cambio = esCambioModo(msg);

    if (cambio === "convocatorias") {
      const conv = await buscarConvocatorias("social");

      return res.json({
        response: "🔎 Aquí tienes convocatorias disponibles:",
        data: conv
      });
    }

    if (cambio === "proyecto" && !user.modo) {
      user.modo = "proyecto";
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response:
`Perfecto 👌 vamos paso a paso.

👉 ${preguntas[0]}`
      });
    }

    // =============================
    // SI NO HAY MODO → GUIAR
    // =============================
    if (!user.modo) {
      return res.json({
        response:
`Cuéntame 👀

¿Quieres crear un proyecto o ver convocatorias?

👉 Ejemplo:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // FLUJO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      if (!esValida(msg)) {
        return res.json({
          response: "💡 Dame un poco más de detalle para ayudarte mejor"
        });
      }

      const mejora = await asesor(preguntas[user.paso], msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${mejora}

📊 Vamos avanzando paso a paso

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const proyecto = await llamarIA(`
Genera un proyecto estructurado:
${user.respuestas.join("\n")}
`);

      reset(userId);

      return res.json({
        response: "🎉 Proyecto generado:",
        proyecto
      });
    }

  } catch (error) {
    return res.json({ error: error.message });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor PRO activo en " + PORT);
});
