import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 VARIABLE DESDE RAILWAY
const OPENROUTER_API_KEY = process.env.openr;

// 🧠 CONFIG BASE IA
const MODEL = "openai/gpt-4o-mini";

// 🔍 HEALTH CHECK
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "FIO Agente IA",
    version: "PRO",
    endpoints: ["/chat", "/matriz"]
  });
});

// 🔧 FUNCIÓN CENTRAL IA (REUTILIZABLE)
async function consultarIA(messages) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages
      })
    });

    const data = await response.json();

    if (!data || !data.choices) {
      throw new Error("Respuesta inválida IA");
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error("ERROR IA:", error.message);
    return "⚠️ Error procesando la solicitud.";
  }
}

// 💬 CHAT INTELIGENTE (AGENTE)
app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje requerido" });
    }

    // 🧠 PROMPT AGENTE FIO
    const messages = [
      {
        role: "system",
        content: `
Eres un formulador experto de proyectos bajo metodología de marco lógico (CEPAL, BID).
Respondes estructurado, claro y aplicable.
Ayudas a construir:
- Diagnóstico
- Problema central
- Árbol de problemas
- Objetivos
- Indicadores
- Actividades
`
      },
      {
        role: "user",
        content: message
      }
    ];

    const respuesta = await consultarIA(messages);

    res.json({ response: respuesta });

  } catch (error) {
    console.error("ERROR CHAT:", error.message);
    res.status(500).json({ error: "Error en chat" });
  }
});

// 🔥 GENERADOR MATRIZ AUTOMÁTICA
app.post("/matriz", async (req, res) => {
  try {
    const { contexto } = req.body;

    const prompt = `
Actúa como experto en marco lógico (BID/CEPAL).
Genera una MATRIZ COMPLETA con:

1. Fin
2. Propósito
3. Componentes
4. Actividades
5. Indicadores (SMART)
6. Medios de verificación
7. Supuestos

Contexto:
${contexto || "Proyecto social general"}

Formato en tabla clara.
`;

    const messages = [
      { role: "system", content: "Eres experto en formulación de proyectos." },
      { role: "user", content: prompt }
    ];

    const respuesta = await consultarIA(messages);

    res.json({ response: respuesta });

  } catch (error) {
    console.error("ERROR MATRIZ:", error.message);
    res.status(500).json({ error: "Error generando matriz" });
  }
});

// 🧪 DEBUG ENDPOINT
app.get("/test-ia", async (req, res) => {
  const respuesta = await consultarIA([
    { role: "user", content: "di hola en 5 palabras" }
  ]);

  res.json({ test: respuesta });
});

// 🚀 SERVIDOR ROBUSTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 FIO backend PRO corriendo en puerto ${PORT}`);
});

// 🛑 CAPTURA GLOBAL (ANTI-CRASH)
process.on("uncaughtException", (err) => {
  console.error("ERROR GLOBAL:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("PROMESA FALLIDA:", err);
});
