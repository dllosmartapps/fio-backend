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
  "¿Recursos disponibles?",
  "¿Presupuesto estimado?",
  "¿Metas del proyecto?",
  "¿ODS relacionados?",
  "¿Formato requerido?",
  "¿Normas o requisitos?",
  "¿Deseas ayuda adicional?"
];

// =============================
// PROMPT NIVEL DIOS
// =============================
const PROMPT_FIO = `
Eres FIO, un asesor experto en formulación de proyectos.

REGLA CRÍTICA:
NO haces preguntas.
NO cambias flujo.
SOLO mejoras la respuesta.

FORMATO:

NIVEL: [DÉBIL | MEDIA | BUENA]

MEJORA:
"texto mejorado"

EXPLICACIÓN:
explicación breve

Si el usuario no sabe:
✔ das ejemplos
✔ lo ayudas
✔ lo devuelves a la pregunta
`;

// =============================
function initUser(id) {
  estado[id] = {
    modo: "inicio",
    paso: 0,
    respuestas: []
  };
}

// =============================
function detectarIntento(msg) {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto") || m.includes("crear")) return "proyecto";

  return null;
}

// =============================
function esPregunta(msg) {
  return msg.includes("?") || msg.toLowerCase().includes("que");
}

// =============================
async function llamarIA(pregunta, respuesta) {
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
          { role: "system", content: PROMPT_FIO },
          {
            role: "user",
            content: `
PREGUNTA DEL SISTEMA:
${pregunta}

RESPUESTA DEL USUARIO:
${respuesta}
`
          }
        ]
      })
    });

    const data = await r.json();

    return data?.choices?.[0]?.message?.content || null;

  } catch (e) {
    console.log("IA ERROR:", e.message);
    return null;
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO PRO listo 🚀");
});

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global";
    let msg = (req.body.msg || "").toString().trim();

    if (!estado[userId]) initUser(userId);

    const user = estado[userId];
    const intento = detectarIntento(msg);

    // =============================
    // SALUDO
    // =============================
    if (user.modo === "inicio") {
      user.modo = "esperando";

      return res.json({
        response: `Hola 👋 Soy FIO.

Te ayudo a formular proyectos paso a paso.

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // =============================
    // ESPERA
    // =============================
    if (user.modo === "esperando") {

      if (intento === "proyecto") {
        user.modo = "proyecto";
        user.paso = 0;
        user.respuestas = [];

        return res.json({
          response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
        });
      }

      if (intento === "convocatorias") {
        return res.json({
          response: "🔎 Convocatorias (próxima fase scraping)"
        });
      }

      return res.json({
        response: `👉 Escribe:
- Quiero crear un proyecto
- Ver convocatorias`
      });
    }

    // =============================
    // MODO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      const pregunta = preguntas[user.paso];

      // bloquear cambio de modo
      if (intento === "convocatorias") {
        return res.json({
          response: "⚠️ Termina el proyecto o escribe 'salir'"
        });
      }

      // usuario hace pregunta
      if (esPregunta(msg)) {
        return res.json({
          response: `💡 Te ayudo:

Para "${pregunta}" debes responder con claridad y detalle.

Ejemplo:
- Opción 1
- Opción 2

👉 Ahora responde:
${pregunta}`
        });
      }

      if (msg.length < 3) {
        return res.json({
          response: `👀 Dame más detalle.\n\n👉 ${pregunta}`
        });
      }

      const mejora = await llamarIA(pregunta, msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response: `${mejora || "✔ Respuesta guardada"}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      initUser(userId);

      return res.json({
        response: "🎉 Proyecto formulado correctamente (fase siguiente: generación completa)"
      });
    }

    return res.json({
      response: "Error de estado"
    });

  } catch (error) {
    console.error("ERROR:", error);

    return res.json({
      response: "⚠️ Error interno, intenta nuevamente"
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor PRO en puerto " + PORT);
});
