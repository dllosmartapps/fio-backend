import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const estado = {};

const STATES = {
  INICIO: "inicio",
  ESPERANDO: "esperando",
  PROYECTO: "proyecto",
  CONVOCATORIAS: "convocatorias"
};

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

function init(userId) {
  estado[userId] = {
    state: STATES.INICIO,
    paso: 0,
    respuestas: []
  };
}

// =============================
// NORMALIZAR INPUT
// =============================
function getMessage(body) {
  return (body.msg || body.message || body.text || "").toString();
}

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return STATES.CONVOCATORIAS;
  if (m.includes("proyecto") || m.includes("crear")) return STATES.PROYECTO;

  return null;
}

// =============================
// VALIDACIÓN BÁSICA (LOCAL)
// =============================
function validarBasico(msg) {
  if (!msg || msg.length < 5) return "debil";
  if (msg.split(" ").length < 3) return "media";
  return "buena";
}

// =============================
// IA VALIDADORA
// =============================
async function validarConIA(pregunta, respuesta) {
  if (!OPENROUTER_API_KEY) return null;

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
            content: `
Actúa como consultor de proyectos.

Pregunta: ${pregunta}
Respuesta: ${respuesta}

Evalúa:
1. ¿Es débil, media o buena?
2. Mejora la respuesta
3. Explica brevemente

Formato:
NIVEL:
MEJORA:
EXPLICACION:
`
          }
        ]
      })
    });

    const d = await r.json();
    return d?.choices?.[0]?.message?.content || null;

  } catch {
    return null;
  }
}

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global";
    let msg = getMessage(req.body);

    if (!estado[userId]) init(userId);
    const user = estado[userId];

    const intent = detectarIntencion(msg);

    // CAMBIO DE MODO INTELIGENTE
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
        response: "🔎 Aquí verás convocatorias (próxima fase)"
      });
    }

    // =============================
    // INICIO
    // =============================
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a formular proyectos paso a paso.

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // ESPERANDO
    // =============================
    if (user.state === STATES.ESPERANDO) {
      return res.json({
        response:
"👉 Puedes escribir:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // =============================
    // PROYECTO CON VALIDACIÓN REAL
    // =============================
    if (user.state === STATES.PROYECTO) {

      const preguntaActual = preguntas[user.paso];

      const nivel = validarBasico(msg);

      // 🔴 RESPUESTA DÉBIL
      if (nivel === "debil") {
        return res.json({
          response:
`👀 Tu respuesta es muy corta.

👉 Intenta describir mejor:
${preguntaActual}

Ejemplo:
"Describe el problema con contexto, población y lugar"`
        });
      }

      // IA mejora
      const analisisIA = await validarConIA(preguntaActual, msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`${analisisIA || "✔ Respuesta aceptada"}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const resumen = user.respuestas.join("\n");

      init(userId);

      return res.json({
        response: "🎉 Proyecto completo",
        data: resumen
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
  console.log("Servidor PRO listo en puerto " + PORT);
});
