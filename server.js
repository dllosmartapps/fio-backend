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
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("FIO SaaS PRO activo 🚀");
});

// =============================
// MEMORIA (temporal)
// =============================
const estado = {};

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
  "¿Con qué recursos cuentas actualmente?",
  "¿Cuál es el presupuesto disponible?",
  "¿Qué metas esperas lograr?",
  "¿A qué ODS se alinea?",
  "¿Qué formato necesitas? (MGA, Marco lógico, etc.)",
  "¿Debe seguir normas específicas?",
  "¿Quieres que el agente proponga lo faltante?"
];

// =============================
// VALIDACIÓN
// =============================
function validarRespuesta(texto) {
  if (!texto) return false;

  const limpio = texto.toString().trim();

  if (limpio.length < 5) return false;

  const basura = ["1", "ok", "si", "no", "x"];
  if (basura.includes(limpio.toLowerCase())) return false;

  return true;
}

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarModo(msg = "") {
  if (!msg) return null;

  const m = msg.toLowerCase().trim();

  if (
    m.includes("proyecto") ||
    m.includes("crear") ||
    m.includes("formular")
  ) return "proyecto";

  if (
    m.includes("convocatoria") ||
    m.includes("convocatorias") ||
    m.includes("financiacion") ||
    m.includes("fondos")
  ) return "convocatorias";

  return null;
}

// =============================
// IA BASE
// =============================
async function llamarIA(prompt) {
  try {
    if (!OPENROUTER_API_KEY) {
      return "⚠️ Configura OPENROUTER_API_KEY";
    }

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6
      })
    });

    const d = await r.json();

    return d?.choices?.[0]?.message?.content || "Sin respuesta IA";
  } catch (e) {
    console.error("ERROR IA:", e);
    return "Error IA";
  }
}

// =============================
// ASESOR
// =============================
async function asesor(pregunta, respuesta) {
  const prompt = `
Eres experto en formulación de proyectos (MGA y Marco Lógico).

Respuesta:
"${respuesta}"

Pregunta:
"${pregunta}"

Corrige y mejora.

Formato:

👉 Vas bien 🔥
👉 Mejor así:
"texto mejorado"

👉 Explicación breve
`;
  return await llamarIA(prompt);
}

// =============================
// BLOQUES SaaS
// =============================
async function arbolProblemas(r) {
  return await llamarIA(`
Construye árbol de problemas:
- problema central
- 3 causas
- 3 efectos

Datos:
${r.join("\n")}
`);
}

async function arbolObjetivos(r) {
  return await llamarIA(`
Construye árbol de objetivos:
- objetivo central
- medios
- fines

Datos:
${r.join("\n")}
`);
}

async function alternativas(r) {
  return await llamarIA(`
Propón 3 soluciones viables.

Datos:
${r.join("\n")}
`);
}

async function marcoLogico(r) {
  return await llamarIA(`
Construye matriz de marco lógico:
- fin
- propósito
- componentes
- actividades
- indicadores

Formato tabla

Datos:
${r.join("\n")}
`);
}

// =============================
// RESET
// =============================
function resetUser(id) {
  estado[id] = {
    modo: null,
    paso: 0,
    respuestas: []
  };
}

// =============================
// CHAT
// =============================
app.post("/chat", async (req, res) => {
  try {
    let { userId, msg } = req.body;

    // 🔥 FIX CRÍTICO
    if (!userId || userId === "") userId = "global-user";
    if (!msg) msg = "";

    console.log("USER:", userId);
    console.log("MSG:", msg);

    if (!estado[userId]) resetUser(userId);

    const user = estado[userId];

    console.log("ESTADO:", user);

    // =============================
    // INICIO
    // =============================
    // =============================
// INICIO INTELIGENTE (ANTI-BLOQUEO)
// =============================
if (!user.modo) {
  const modo = detectarModo(msg);

  console.log("MODO DETECTADO:", modo);

  // 👉 PRIORIDAD: convocatorias
  if (modo === "convocatorias") {
    const conv = await buscarConvocatorias("social");

    return res.json({
      response: "Aquí tienes convocatorias:",
      data: conv
    });
  }

  // 👉 DEFAULT: SIEMPRE PROYECTO (CLAVE)
  user.modo = "proyecto";
  user.paso = 0;
  user.respuestas = [];

  console.log("AUTO-INICIO PROYECTO");

  return res.json({
    response: `Perfecto 👌 iniciemos tu proyecto.\n\n👉 ${preguntas[0]}`
  });
}
      const modo = detectarModo(msg);

      console.log("MODO:", modo);

      if (modo === "proyecto") {
        user.modo = "proyecto";
        user.paso = 0;
        user.respuestas = [];

        return res.json({
          response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
        });
      }

      if (modo === "convocatorias") {
        const conv = await buscarConvocatorias("social");

        return res.json({
          response: "Convocatorias encontradas:",
          data: conv
        });
      }

      return res.json({
        response: "¿Quieres crear un proyecto o buscar convocatorias?"
      });
    }

    // =============================
    // FLUJO PROYECTO
    // =============================
    if (user.modo === "proyecto") {

      if (!validarRespuesta(msg)) {
        return res.json({
          response: "Respuesta muy débil 👀 dame más detalle"
        });
      }

      const mejora = await asesor(preguntas[user.paso], msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        const progreso = Math.round((user.paso / preguntas.length) * 100);

        return res.json({
          response: `${mejora}\n\n📊 Avance: ${progreso}%\n👉 ${preguntas[user.paso]}`
        });
      }

      // =============================
      // GENERACIÓN FINAL
      // =============================
      const problemas = await arbolProblemas(user.respuestas);
      const objetivos = await arbolObjetivos(user.respuestas);
      const alt = await alternativas(user.respuestas);
      const marco = await marcoLogico(user.respuestas);

      const conv = await buscarConvocatorias("social");
      const match = hacerMatching({ sector: "social" }, conv);

      resetUser(userId);

      return res.json({
        arbol_problemas: problemas,
        arbol_objetivos: objetivos,
        alternativas: alt,
        marco_logico: marco,
        convocatorias: match
      });
    }

  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      error: "Error interno",
      detalle: error.message
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor SaaS PRO en puerto " + PORT);
});
