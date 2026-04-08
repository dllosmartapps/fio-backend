const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// =============================
// 🔒 VALIDAR API KEY
// =============================
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ FALTA OPENROUTER_API_KEY");
  process.exit(1);
}

// =============================
// 🧠 MEMORIA EN RAM
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
// 🤖 IA (OpenRouter)
// =============================
async function consultarIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Eres experto en metodología de marco lógico (CEPAL).

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
      },
      {
        headers: {
          Authorization: \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error("❌ ERROR IA:", error.message);
    return "⚠️ Error IA. Revisa API o conexión.";
  }
}

// =============================
// 📊 MATRIZ
// =============================
async function generarMatrizIA(respuestas) {
  const prompt = `
Genera una MATRIZ DE MARCO LÓGICO profesional con:

Fin
Propósito
Componentes
Actividades
Indicadores
Supuestos

Basado en:
${JSON.stringify(respuestas, null, 2)}
`;

  return await consultarIA(prompt);
}

// =============================
// ✔ VALIDACIÓN SIMPLE
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
        response: `👋 Asistente MML activo\n\n👉 ${pasos[0]}`
      });
    }

    // VALIDACIÓN
    if (!validar(msg)) {
      return res.json({
        response: "⚠️ Escribe una respuesta más completa."
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
            response: "🎉 Proyecto completo\n\nEscribe: MATRIZ"
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
    console.error("❌ ERROR CHAT:", error.message);
    return res.status(500).json({
      response: "Error servidor"
    });
  }
});

// =============================
// 📊 ENDPOINT MATRIZ
// =============================
app.post("/matriz", async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || "default";

    if (!estado[uid]) {
      return res.json({
        response: "⚠️ No hay proyecto iniciado"
      });
    }

    const matriz = await generarMatrizIA(estado[uid].respuestas);

    return res.json({
      response: `📊 MATRIZ DE MARCO LÓGICO\n\n${matriz}`
    });

  } catch (error) {
    console.error("❌ ERROR MATRIZ:", error.message);
    return res.status(500).json({
      response: "Error generando matriz"
    });
  }
});

// =============================
// ❤️ HEALTH CHECK (IMPORTANTE)
// =============================
app.get("/", (req, res) => {
  res.send("🚀 FIO Backend activo");
});

// =============================
// 🚀 SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Backend corriendo en puerto " + PORT);
});
