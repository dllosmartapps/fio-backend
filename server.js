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
// ESTADOS
// =============================
const STATES = {
  INICIO: "inicio",
  ESPERANDO: "esperando_intencion",
  PROYECTO: "modo_proyecto",
  CONVOCATORIAS: "modo_convocatorias",
  FINAL: "finalizado"
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
// INIT
// =============================
function init(userId) {
  estado[userId] = {
    state: STATES.INICIO,
    paso: 0,
    respuestas: []
  };
}

// =============================
// DETECTAR INTENCIÓN GLOBAL
// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return STATES.CONVOCATORIAS;
  if (m.includes("proyecto") || m.includes("crear")) return STATES.PROYECTO;

  return null;
}

// =============================
// IA
// =============================
async function llamarIA(prompt) {
  try {
    if (!OPENROUTER_API_KEY) return "";

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
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("FIO SaaS OK 🚀");
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
    // DETECCIÓN GLOBAL (SIEMPRE)
    // =============================
    const intent = detectarIntencion(msg);

    if (intent === STATES.CONVOCATORIAS) {
      user.state = STATES.CONVOCATORIAS;

      return res.json({
        response: "🔎 Aquí podrás ver convocatorias (siguiente fase: scraping real)"
      });
    }

    if (intent === STATES.PROYECTO) {
      user.state = STATES.PROYECTO;
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 vamos paso a paso.\n\n👉 ${preguntas[0]}`
      });
    }

    // =============================
    // ESTADO: INICIO
    // =============================
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a:
✔ Formular proyectos paso a paso
✔ Mejorar ideas
✔ Buscar convocatorias

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // ESTADO: ESPERANDO
    // =============================
    if (user.state === STATES.ESPERANDO) {
      return res.json({
        response:
"👉 Puedes escribir:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // =============================
    // ESTADO: PROYECTO
    // =============================
    if (user.state === STATES.PROYECTO) {

      // guardar respuesta
      user.respuestas.push(msg);

      // mejorar con IA (opcional)
      const mejora = await llamarIA(
        `Mejora esta respuesta para proyecto:\n${msg}`
      );

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${mejora || "👉 Respuesta registrada"}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // =============================
      // FINAL
      // =============================
      const resultado = await llamarIA(
        `Genera un proyecto estructurado:\n${user.respuestas.join("\n")}`
      );

      init(userId);

      return res.json({
        response: "🎉 Proyecto generado:",
        proyecto: resultado
      });
    }

    // =============================
    // DEFAULT
    // =============================
    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error interno"
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor SaaS en puerto " + PORT);
});
