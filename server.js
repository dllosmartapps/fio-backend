import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

import { buscarConvocatorias } from "./modules/scraper.js";
import { hacerMatching } from "./modules/matching.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// VALIDAR KEYS
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ Falta OPENROUTER_API_KEY");
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

// IA (FETCH)
async function consultarIA(mensaje) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres experto en marco lógico. Analiza y mejora la respuesta."
          },
          { role: "user", content: mensaje }
        ]
      })
    });

    const data = await response.json();

    return data.choices?.[0]?.message?.content || "⚠️ Sin respuesta IA";

  } catch (error) {
    console.error("ERROR IA:", error.message);
    return "⚠️ Error IA";
  }
}

// CHAT
app.post("/chat", (req, res) => {
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
      return res.json({ response: "Escribe MATRIZ o MATCH" });
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

    const matriz = await consultarIA(JSON.stringify(estado[uid]?.respuestas || {}));

    return res.json({ response: matriz });

  } catch (error) {
    return res.status(500).json({ response: "Error matriz" });
  }
});

// MATCH CONVOCATORIAS
app.post("/match", async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = userId || "default";

    const proyecto = estado[uid]?.respuestas || {};

    const convocatorias = await buscarConvocatorias(proyecto.problema || "");

    const resultado = hacerMatching(proyecto, convocatorias);

    return res.json({ response: resultado });

  } catch (error) {
    return res.status(500).json({ response: "Error matching" });
  }
});

// TEST
app.get("/", (req, res) => {
  res.send("🚀 FIO backend OK");
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Server corriendo en puerto " + PORT);
});
