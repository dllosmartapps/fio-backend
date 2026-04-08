import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// VALIDAR API KEY
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ Falta API KEY");
  process.exit(1);
}

// MEMORIA
const estado = {};

// PASOS
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
  "problema","grupo","descripcion","causas","efectos","validacion",
  "objetivo","objetivos_especificos","alternativas","estrategia",
  "componentes","actividades","indicadores","supuestos"
];

// IA
async function consultarIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres experto en marco lógico. Analiza y mejora la respuesta."
          },
          { role: "user", content: mensaje }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error("ERROR IA:", error.message);
    return "⚠️ Error IA";
  }
}

// CHAT
app.post("/chat", async (req, res) => {
  try {
    const { userId, msg } = req.body;
    const uid = userId || "default";

    if (!estado[uid]) {
      estado[uid] = { paso: 0, respuestas: {} };
    }

    const user = estado[uid];

    if (user.paso === 0) {
      user.paso = 1;
      return res.json({ response: pasos[0] });
    }

    user.respuestas[claves[user.paso - 1]] = msg;
    user.paso++;

    if (user.paso > pasos.length) {
      return res.json({ response: "Escribe MATRIZ" });
    }

    return res.json({ response: pasos[user.paso - 1] });

  } catch (error) {
    return res.status(500).json({ response: "Error servidor" });
  }
});

// MATRIZ
app.post("/matriz", async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || "default";

    if (!estado[uid]) {
      return res.json({ response: "No hay datos" });
    }

    const matriz = await consultarIA(JSON.stringify(estado[uid].respuestas));

    return res.json({ response: matriz });

  } catch (error) {
    return res.status(500).json({ response: "Error matriz" });
  }
});

// TEST
app.get("/", (req, res) => {
  res.send("🚀 Backend activo");
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Server corriendo en " + PORT);
});
