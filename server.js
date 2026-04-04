import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================
// MEMORIA (SIN FS → NO CRASH)
// =============================
const estado = {};

// =============================
const STATES = {
  INICIO: "inicio",
  ESPERANDO: "esperando",
  PROYECTO: "proyecto"
};

// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal?",
  "¿Dónde se desarrolla?",
  "¿A quién beneficia?",
  "¿Qué evidencias tienes?",
  "¿Tema del proyecto?",
  "¿Duración?",
  "¿Recursos disponibles?",
  "¿Presupuesto estimado?",
  "¿Metas del proyecto?",
  "¿ODS relacionados?",
  "¿Formato requerido?",
  "¿Normas o requisitos?",
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
function getMessage(body) {
  return (body.msg || body.message || body.text || "").toString().trim();
}

// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto") || m.includes("crear")) return "proyecto";

  return null;
}

// =============================
function validarBasico(msg) {
  if (!msg || msg.length < 5) return false;
  return true;
}

// =============================
// IA SEGURA
// =============================
async function asesorIA(pregunta, respuesta) {
  try {
    if (!OPENROUTER_API_KEY) return null;

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
            role: "system",
            content: "Mejora el texto de forma breve y clara."
          },
          {
            role: "user",
            content: `Pregunta: ${pregunta}\nRespuesta: ${respuesta}`
          }
        ]
      })
    });

    const data = await r.json();

    return data?.choices?.[0]?.message?.content || null;

  } catch {
    return null;
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO OK 🚀");
});

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global";
    let msg = getMessage(req.body);

    if (!estado[userId]) init(userId);

    const user = estado[userId];
    const intent = detectarIntencion(msg);

    // =============================
    // INICIO
    // =============================
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Puedo ayudarte a:
✔ Formular proyectos
✔ Mejorar ideas

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // ESPERANDO
    // =============================
    if (user.state === STATES.ESPERANDO) {

      if (intent === "proyecto") {
        user.state = STATES.PROYECTO;
        user.paso = 0;
        user.respuestas = [];

        return res.json({
          response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
        });
      }

      if (intent === "convocatorias") {
        return res.json({
          response: "🔎 Convocatorias (próxima fase)"
        });
      }

      return res.json({
        response:
"👉 Escribe:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // =============================
    // PROYECTO
    // =============================
    if (user.state === STATES.PROYECTO) {

      const preguntaActual = preguntas[user.paso];

      if (!validarBasico(msg)) {
        return res.json({
          response:
`👀 Necesito más detalle.

👉 ${preguntaActual}`
        });
      }

      const mejora = await asesorIA(preguntaActual, msg);

      const texto = mejora || "✔ Respuesta guardada";

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${texto}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      init(userId);

      return res.json({
        response: "🎉 Proyecto completado"
      });
    }

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Error servidor"
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor funcionando en puerto " + PORT);
});
