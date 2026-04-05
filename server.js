import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================
// MEMORIA SEGURA (RAM)
// =============================
const estado = {};

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
function initUser(userId) {
  estado[userId] = {
    modo: "inicio",
    paso: 0,
    respuestas: []
  };
}

// =============================
function getMsg(body) {
  try {
    return (body.msg || body.message || "").toString().trim();
  } catch {
    return "";
  }
}

// =============================
function detectarIntento(msg) {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto") || m.includes("crear")) return "proyecto";

  return null;
}

// =============================
function validar(msg) {
  if (!msg || msg.length < 5) return false;
  return true;
}

// =============================
// IA SEGURA (NUNCA CRASHEA)
// =============================
async function mejorarRespuesta(pregunta, respuesta) {
  try {
    if (!OPENROUTER_API_KEY) return null;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            content: `
Eres consultor de proyectos.
Mejora la respuesta de forma clara y breve.
NO hagas preguntas.
`
          },
          {
            role: "user",
            content: `Pregunta: ${pregunta}\nRespuesta: ${respuesta}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!data || !data.choices) return null;

    return data.choices[0]?.message?.content || null;

  } catch (e) {
    console.log("IA ERROR:", e.message);
    return null;
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO estable 🚀");
});

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global";
    let msg = getMsg(req.body);

    if (!estado[userId]) initUser(userId);

    const user = estado[userId];
    const intent = detectarIntento(msg);

    // =============================
    // SALUDO
    // =============================
    if (user.modo === "inicio") {
      user.modo = "esperando";

      return res.json({
        response:
`Hola 👋 Soy FIO.

Puedo ayudarte a formular proyectos paso a paso.

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // ESPERANDO
    // =============================
    if (user.modo === "esperando") {

      if (intent === "proyecto") {
        user.modo = "proyecto";
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
    if (user.modo === "proyecto") {

      const pregunta = preguntas[user.paso];

      // BLOQUEAR CAMBIO DE TEMA
      if (intent === "convocatorias") {
        return res.json({
          response:
"⚠️ Estamos creando tu proyecto.\nEscribe 'salir' si quieres cambiar de modo."
        });
      }

      if (!validar(msg)) {
        return res.json({
          response:
`👀 Necesito más detalle.\n\n👉 ${pregunta}`
        });
      }

      const mejora = await mejorarRespuesta(pregunta, msg);
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
      initUser(userId);

      return res.json({
        response: "🎉 Proyecto completado correctamente"
      });
    }

    return res.json({
      response: "Error de estado, escribe 'Quiero crear un proyecto'"
    });

  } catch (error) {
    console.error("CRASH:", error);

    return res.status(200).json({
      response: "⚠️ Ocurrió un error, intenta de nuevo"
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor estable en puerto " + PORT);
});
