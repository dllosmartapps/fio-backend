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

const STATES = {
  INICIO: "inicio",
  ESPERANDO: "esperando",
  PROYECTO: "proyecto",
  CONVOCATORIAS: "convocatorias"
};

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
function init(userId) {
  estado[userId] = {
    state: STATES.INICIO,
    paso: 0,
    respuestas: []
  };
}

// =============================
// DETECTAR INTENCIÓN (MEJORADO)
// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria") || m.includes("convocatorias")) {
    return STATES.CONVOCATORIAS;
  }

  if (
    m.includes("proyecto") ||
    m.includes("crear") ||
    m.includes("formular")
  ) {
    return STATES.PROYECTO;
  }

  return null;
}

// =============================
// IA (opcional)
// =============================
async function mejorarRespuesta(msg) {
  if (!OPENROUTER_API_KEY) return "";

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Mejora esta respuesta de proyecto de forma profesional:\n${msg}`
          }
        ]
      })
    });

    const d = await r.json();
    return d?.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO OK 🚀");
});

// =============================
// CHAT (FLUJO CORREGIDO)
// =============================
app.post("/chat", async (req, res) => {
  try {
    let { userId, msg } = req.body;

    if (!userId) userId = "global";
    if (!msg) msg = "";

    if (!estado[userId]) init(userId);

    const user = estado[userId];

    // 🔥 1. DETECTAR INTENCIÓN SIEMPRE
    const intent = detectarIntencion(msg);

    if (intent === STATES.PROYECTO) {
      user.state = STATES.PROYECTO;
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
      });
    }

    if (intent === STATES.CONVOCATORIAS) {
      user.state = STATES.CONVOCATORIAS;

      return res.json({
        response: "🔎 Aquí verás convocatorias (siguiente fase scraping)"
      });
    }

    // 🔥 2. EJECUTAR ESTADO

    // INICIO
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a:
✔ Formular proyectos
✔ Mejorar ideas
✔ Buscar convocatorias

👉 Dime:
"Quiero crear un proyecto"`
      });
    }

    // ESPERANDO
    if (user.state === STATES.ESPERANDO) {
      return res.json({
        response:
"👉 Escribe:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // PROYECTO
    if (user.state === STATES.PROYECTO) {
      user.respuestas.push(msg);

      const mejora = await mejorarRespuesta(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${mejora || "✔ Respuesta guardada"}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const resumen = user.respuestas.join("\n");

      init(userId);

      return res.json({
        response: "🎉 Proyecto completo generado",
        data: resumen
      });
    }

    // CONVOCATORIAS
    if (user.state === STATES.CONVOCATORIAS) {
      return res.json({
        response: "🔎 (Aquí irá scraping real en siguiente fase)"
      });
    }

    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error interno" });
  }
});

app.listen(PORT, () => {
  console.log("Servidor funcionando en puerto " + PORT);
});
