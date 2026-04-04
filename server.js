import express from "express";
import cors from "cors";
import fetch from "node-fetch";

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
// PROMPT MAESTRO
// =============================
const SYSTEM_PROMPT = `
Eres FIO, un asesor experto en formulación de proyectos.

Debes:
- Guiar paso a paso
- Hacer preguntas una por una
- Corregir respuestas
- Ser claro, humano y profesional

Nunca digas "no entiendo".
Siempre ayuda y guía.
`;

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
  "¿Deseas ayuda adicional?"
];

// =============================
// INIT
// =============================
function init(userId) {
  estado[userId] = {
    modo: null,
    paso: 0,
    respuestas: [],
    inicio: true
  };
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
// IA (OPENROUTER)
// =============================
async function llamarIA(userMsg, contexto = "") {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contexto + "\n\nUsuario: " + userMsg }
        ]
      })
    });

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (error) {
    console.error("IA ERROR:", error);
    return "Error IA";
  }
}

// =============================
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("FIO IA funcionando 🚀");
});

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

    // =============================
    // DETECTAR INTENCIÓN GLOBAL
    // =============================
    const modoDetectado = detectarModo(msg);

    if (modoDetectado === "convocatorias") {
      return res.json({
        response: "🔎 Aquí irán convocatorias (próximamente scraping real)"
      });
    }

    if (modoDetectado === "proyecto" && user.modo !== "proyecto") {
      user.modo = "proyecto";
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 vamos paso a paso.\n\n👉 ${preguntas[0]}`
      });
    }

    // =============================
    // SALUDO INTELIGENTE
    // =============================
    if (user.inicio) {
      user.inicio = false;

      return res.json({
        response:
`Hola 👋 Soy FIO, tu asesor de proyectos.

Te ayudo a:
✔ Formular proyectos paso a paso
✔ Mejorar ideas
✔ Buscar convocatorias

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // FLUJO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      const preguntaActual = preguntas[user.paso];

      // IA mejora la respuesta
      const mejora = await llamarIA(msg, `Estamos respondiendo:\n${preguntaActual}`);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${mejora}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // =============================
      // FINAL PROYECTO
      // =============================
      const proyectoFinal = await llamarIA(
        user.respuestas.join("\n"),
        "Genera un proyecto completo estructurado con marco lógico"
      );

      init(userId);

      return res.json({
        response: "🎉 Proyecto generado:",
        proyecto: proyectoFinal
      });
    }

    // =============================
    // DEFAULT
    // =============================
    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      error: "Error interno",
      detalle: error.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor IA en puerto " + PORT);
});
