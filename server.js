// =============================
// FIO BACKEND PRO SaaS
// =============================

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import { buscarConvocatorias } from "./modules/scraper.js";
import { hacerMatching } from "./modules/matching.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================
// RUTA BASE
// =============================
app.get("/", (req, res) => {
  res.send("FIO backend PRO activo 🚀");
});

// =============================
// MEMORIA
// =============================
const estado = {};

// =============================
// VALIDACIÓN
// =============================
function validar(msg) {
  return msg && msg.trim().length > 5;
}

// =============================
// MEJORA TIPO CONSULTOR
// =============================
function mejorar(paso, msg) {
  const t = msg.trim();
  const texto = t.charAt(0).toUpperCase() + t.slice(1);

  if (paso === 2) {
    return `Problema formulado:
"${texto}"

👉 Debe expresar una situación negativa, con población afectada y sin soluciones.`;
  }

  if (paso === 10) {
    return `Meta reformulada:
"${texto}"

👉 Debe ser medible y alcanzable.`;
  }

  return `"${texto}"`;
}

// =============================
// 14 PREGUNTAS
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal que se desea resolver?",
  "¿Dónde se desarrolla el proyecto?",
  "¿A quién está dirigido?",
  "¿Qué evidencias tienes del problema?",
  "¿Cuál es el tema del proyecto?",
  "¿Cuál es la duración estimada?",
  "¿Con qué recursos cuentas?",
  "¿Cuál es el presupuesto disponible?",
  "¿Qué metas esperas lograr?",
  "¿A qué ODS se alinea?",
  "¿Qué formato institucional debo usar?",
  "¿Debo seguir normas específicas?",
  "¿Deseas que proponga alternativas?"
];

// =============================
// LLAMADA A IA
// =============================
async function llamarIA(prompt) {
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
  return d.choices?.[0]?.message?.content || "Error IA";
}

// =============================
// ENDPOINT PRINCIPAL
// =============================
app.post("/chat", async (req, res) => {
  const { userId = "default", msg = "" } = req.body;

  if (!estado[userId]) {
    estado[userId] = { paso: 0, respuestas: [] };
  }

  let paso = estado[userId].paso;

  // =============================
  // INICIO
  // =============================
  if (paso === 0) {
    estado[userId].paso = 1;

    return res.json({
      response: `Hola 👋 Soy FIO, tu consultor en formulación de proyectos.

Vamos a construir un proyecto sólido paso a paso.

(7%) 👉 ${preguntas[0]}`
    });
  }

  // =============================
  // VALIDACIÓN
  // =============================
  if (!validar(msg)) {
    return res.json({
      response: "Necesito un poco más de detalle para que esto quede bien formulado 👀"
    });
  }

  estado[userId].respuestas.push(msg);

  const mejora = mejorar(paso, msg);

  // =============================
  // SIGUIENTE PREGUNTA
  // =============================
  if (paso < preguntas.length) {
    estado[userId].paso++;

    return res.json({
      response: `(${paso * 7}%) 👍

${mejora}

👉 ${preguntas[paso]}`
    });
  }

  // =============================
  // GENERAR PROYECTO COMPLETO
  // =============================
  const r = estado[userId].respuestas;

  const promptFinal = `
Eres un experto en formulación de proyectos usando metodología Marco Lógico, MGA y ODS.

Con esta información:

${r.join("\n")}

Construye:

1. Árbol de problemas
2. Árbol de objetivos
3. Alternativas
4. Proyecto completo estructurado

Usa redacción técnica, tablas y coherencia total.
`;

  const resultado = await llamarIA(promptFinal);

  // =============================
  // MATCHING CONVOCATORIAS
  // =============================
  const proyectoData = {
    sector: "social",
    ods: ["4", "17"],
    presupuesto: 4000000000,
    poblacion: "organizaciones"
  };

  const convocatorias = await buscarConvocatorias(proyectoData.sector);
  const matches = hacerMatching(proyectoData, convocatorias);

  // RESET
  estado[userId] = { paso: 0, respuestas: [] };

  // =============================
  // RESPUESTA FINAL
  // =============================
  return res.json({
    proyecto: resultado,
    convocatorias: matches
  });
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor FIO PRO en puerto " + PORT);
});
