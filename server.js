import { buscarConvocatorias } from "./modules/scraper.js";
import { hacerMatching } from "./modules/matching.js";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const WP_API = process.env.WP_API; // https://tusitio.com/wp-json/wp/v2/documentos_fio

// =============================
// MEMORIA
// =============================
const estado = {};

// =============================
// BUSCAR EN WORDPRESS (RAG)
// =============================
async function buscarWP(query) {
  if (!WP_API) return "";

  try {
    const r = await fetch(`${WP_API}?search=${encodeURIComponent(query)}&per_page=3`);
    const data = await r.json();

    return data.map(x => x.content.rendered.replace(/<[^>]+>/g, "")).join("\n");
  } catch {
    return "";
  }
}

// =============================
// BUSCAR EN INTERNET
// =============================
async function buscarWeb(q) {
  if (!SERP_API_KEY) return "";

  const url = `https://serpapi.com/search.json?q=${q}&api_key=${SERP_API_KEY}`;
  const r = await fetch(url);
  const d = await r.json();

  return d.organic_results?.slice(0, 2).map(x => x.snippet).join("\n") || "";
}

// =============================
// PREGUNTAS
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
// PROMPT BASE (TU AGENTE)
// =============================
function construirPrompt(contexto, respuestas, msg) {
  return `
Eres un Agente Experto en Formulación de Proyectos.

Reglas:
- NO inventas metodologías
- SOLO usas formatos oficiales y documentos cargados
- Si hay conflicto, usa el más reciente

Contexto técnico:
${contexto}

Datos del usuario:
${JSON.stringify(respuestas)}

Nueva entrada:
${msg}

Debes continuar con la secuencia:
1. Árbol de problemas
2. Árbol de objetivos
3. Alternativas
4. Formulación completa (según formato)
5. Validación lógica

Respuesta técnica, estructurada y profesional.
`;
}

// =============================
// CHAT
// =============================
app.post("/chat", async (req, res) => {
  const { userId, msg } = req.body;
  const uid = userId || "default";

  if (!estado[uid]) {
    estado[uid] = { paso: 0, respuestas: [] };
  }

  let paso = estado[uid].paso;

  // =============================
  // FASE 1: PREGUNTAS
  // =============================
  if (paso < preguntas.length) {
    if (paso > 0) estado[uid].respuestas.push(msg);

    estado[uid].paso++;

    return res.json({
      response: `(${Math.round((paso / 14) * 100)}%) 

👉 ${preguntas[paso]}`
    });
  }

  // =============================
  // FASE 2: IA + RAG
  // =============================
  const respuestas = estado[uid].respuestas;

  const contextoWP = await buscarWP(msg);
  const contextoWeb = await buscarWeb(msg);

  const contexto = contextoWP + "\n" + contextoWeb;

  const prompt = construirPrompt(contexto, respuestas, msg);

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const d = await r.json();

  return res.json({
    response: d.choices?.[0]?.message?.content || "Error IA"
  });
});

// =============================
app.listen(PORT, () => {
  console.log("FIO PRO corriendo 🚀 " + PORT);
});
