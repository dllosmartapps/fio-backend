import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// =============================
// 🔒 CONFIG
// =============================
const OPENROUTER_API_KEY = process.env.openr;
const MODEL = "openai/gpt-4o-mini";

if (!OPENROUTER_API_KEY) {
  console.error("❌ FALTA API KEY openr en Railway");
}

// =============================
// 🧠 MEMORIA
// =============================
const estado = {};

// =============================
// 📋 PASOS (14)
// =============================
const pasos = [
  "¿Qué problema quieres resolver?",
  "¿A quién afecta el problema?",
  "Describe claramente el problema central.",
  "¿Cuáles son las causas principales?",
  "¿Qué efectos genera el problema?",
  "¿Deseas ajustar el problema central?",
  "Convierte el problema en objetivo general.",
  "Define objetivos específicos.",
  "¿Qué soluciones posibles existen?",
  "¿Cuál eliges y por qué?",
  "¿Qué entregará el proyecto?",
  "¿Qué actividades se deben realizar?",
  "¿Cómo medirás el éxito?",
  "¿Qué puede afectar el proyecto?"
];

const claves = [
  "problema",
  "grupo",
  "descripcion",
  "causas",
  "efectos",
  "validacion",
  "objetivo",
  "objetivos_especificos",
  "alternativas",
  "estrategia",
  "componentes",
  "actividades",
  "indicadores",
  "supuestos"
];

// =============================
// 🤖 IA (SIN AXIOS)
// =============================
async function consultarIA(mensaje) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `
Eres un profesor experto en formulación de proyectos con metodología de marco lógico (CEPAL).

Analiza la respuesta del usuario.

Responde SIEMPRE así:

🔍 ANÁLISIS:
...

✏️ CORRECCIÓN:
...

✅ VERSIÓN MEJORADA:
"texto mejorado"

👉 Responde "SI" para confirmar o escribe tu mejora
`
          },
          { role: "user", content: mensaje }
        ],
        temperature: 0.4
      })
    });

    const data = await response.json();

    if (!data || !data.choices) {
      throw new Error("Respuesta inválida IA");
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error("IA ERROR:", error.message);
    return "⚠️ Error IA. Escribe una respuesta más clara.";
  }
}

// =============================
// 📊 MATRIZ IA
// =============================
async function generarMatrizIA(respuestas) {
  const prompt = `
Genera una MATRIZ DE MARCO LÓGICO profesional con:

Fin
Propósito
Componentes
Actividades
Indicadores (SMART)
Medios de verificación
Supuestos

Basado en:
${JSON.stringify(respuestas, null, 2)}
`;

  return await consultarIA(prompt);
}

// =============================
// ✔ VALIDACIÓN
// =============================
function validar(msg) {
  return msg && msg.trim().length > 8;
}

// =============================
// 💬 CHAT
// =============================
app.post("/chat", async (req, res) => {
  try {
    const { userId, msg } = req.body;
    const uid = userId || "default";

    if (!estado[uid]) {
      estado[uid] = {
        paso: 0,
        respuestas: {},
        esperandoConfirmacion: false,
        propuesta: ""
      };
    }

    const user = estado[uid];

    // INICIO
    if (user.paso === 0) {
      user.paso = 1;
      return res.json({
        response: `Hola, soy tu asistente MML (CEPAL).

👉 ${pasos[0]}`
      });
    }

    // VALIDACIÓN
    if (!validar(msg)) {
      return res.json({
        response: "⚠️ Respuesta muy corta. Mejora un poco más."
      });
    }

    // CONFIRMACIÓN
    if (user.esperandoConfirmacion) {

      if (msg.toLowerCase().includes("si")) {

        user.respuestas[claves[user.paso - 1]] = user.propuesta;

        user.esperandoConfirmacion = false;
        user.paso++;

        if (user.paso > pasos.length) {
          return res.json({
            response: `🎉 Proyecto completo

Escribe: MATRIZ`
          });
        }

        return res.json({
          response: `👉 ${pasos[user.paso - 1]}`
        });

      } else {

        user.propuesta = msg;
        const feedback = await consultarIA(msg);

        return res.json({ response: feedback });
      }
    }

    // PROCESAR RESPUESTA
    user.propuesta = msg;
    user.esperandoConfirmacion = true;

    const feedback = await consultarIA(msg);

    return res.json({ response: feedback });

  } catch (error) {
    console.error("CHAT ERROR:", error.message);
    return res.status(500).json({
      response: "Error servidor"
    });
  }
});

// =============================
// 📊 MATRIZ
// =============================
app.post("/matriz", async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || "default";

    if (!estado[uid]) {
      return res.json({
        response: "No hay proyecto"
      });
    }

    const matriz = await generarMatrizIA(estado[uid].respuestas);

    return res.json({ response: matriz });

  } catch (error) {
    console.error("MATRIZ ERROR:", error.message);
    return res.status(500).json({
      response: "Error matriz"
    });
  }
});

// =============================
// ❤️ TEST
// =============================
app.get("/", (req, res) => {
  res.send("🚀 FIO Backend PRO activo");
});

// =============================
// 🚀 SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 FIO PRO activo en puerto " + PORT);
});

// =============================
// 🛑 ANTI CRASH GLOBAL
// =============================
process.on("uncaughtException", err => {
  console.error("GLOBAL ERROR:", err);
});

process.on("unhandledRejection", err => {
  console.error("PROMISE ERROR:", err);
});
