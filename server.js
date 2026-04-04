import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =============================
// DB LOCAL (PERSISTENCIA)
// =============================
const DB_PATH = "./data/estado.json";

function cargarEstado() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function guardarEstado(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let estado = cargarEstado();

// =============================
// ESTADOS
// =============================
const STATES = {
  INICIO: "inicio",
  ESPERANDO: "esperando",
  PROYECTO: "proyecto",
  CONVOCATORIAS: "convocatorias"
};

// =============================
// PREGUNTAS (14)
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
function init(userId) {
  estado[userId] = {
    state: STATES.INICIO,
    paso: 0,
    respuestas: []
  };
  guardarEstado(estado);
}

// =============================
function getMessage(body) {
  return (body.msg || body.message || body.text || "").toString();
}

function limpiarTexto(msg) {
  return msg.trim();
}

// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return STATES.CONVOCATORIAS;

  if (
    m.includes("proyecto") ||
    m.includes("crear") ||
    m.includes("formular")
  ) {
    return STATES.PROYECTO;
  }

  return null;
}

// =============================
function validarBasico(msg) {
  if (!msg || msg.length < 5) return "debil";
  if (msg.split(" ").length < 3) return "media";
  return "buena";
}

// =============================
function esPregunta(msg) {
  const m = msg.toLowerCase();

  return (
    msg.includes("?") ||
    m.includes("como") ||
    m.includes("ejemplo") ||
    m.includes("que debe") ||
    m.includes("explica")
  );
}

// =============================
// WORDPRESS CONTEXTO
// =============================
async function obtenerContextoWP() {
  try {
    const r = await fetch("https://tusitio.com/wp-json/wp/v2/posts?per_page=5");
    const data = await r.json();

    return data
      .map(p =>
        p.content.rendered.replace(/<[^>]*>?/gm, "")
      )
      .join("\n")
      .slice(0, 3000);

  } catch {
    return "";
  }
}

// =============================
// IA ASESOR (CONTROLADO)
// =============================
async function asesorIA(pregunta, respuesta) {
  if (!OPENROUTER_API_KEY) return null;

  const contextoWP = await obtenerContextoWP();

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
            role: "system",
            content: `
Eres FIO, consultor experto en formulación de proyectos.

REGLAS:
- NO hagas preguntas
- SOLO mejora la respuesta
- NO cambies el flujo

Usa este conocimiento:
${contextoWP}

Formato obligatorio:

👉 Vas muy bien 🔥  
👉 Podemos formularlo mejor así:
"texto mejorado"

👉 Explicación breve
`
          },
          {
            role: "user",
            content: `
Pregunta: ${pregunta}
Respuesta: ${respuesta}
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
// GENERACIÓN FINAL
// =============================
async function generarProyecto(respuestas) {
  if (!OPENROUTER_API_KEY) return respuestas.join("\n");

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
Genera:

1. Árbol de problemas
2. Árbol de objetivos
3. Alternativas
4. Marco lógico

Basado en:
${respuestas.join("\n")}
`
          }
        ]
      })
    });

    const d = await r.json();
    return d?.choices?.[0]?.message?.content || "Error IA";

  } catch {
    return "Error IA";
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO SaaS PRO 🚀");
});

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global-user";
    let msg = limpiarTexto(getMessage(req.body));

    if (!estado[userId]) init(userId);

    const user = estado[userId];
    const intent = detectarIntencion(msg);

    // =============================
    // CAMBIO DE MODO (CONTROLADO)
    // =============================
    if (intent === STATES.PROYECTO && user.state !== STATES.PROYECTO) {
      user.state = STATES.PROYECTO;
      user.paso = 0;
      user.respuestas = [];
      guardarEstado(estado);

      return res.json({
        response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
      });
    }

    if (intent === STATES.CONVOCATORIAS) {
      user.state = STATES.CONVOCATORIAS;
      guardarEstado(estado);

      return res.json({
        response: "🔎 Convocatorias (siguiente fase scraping real)"
      });
    }

    // =============================
    // INICIO
    // =============================
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;
      guardarEstado(estado);

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
"👉 Escribe:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // =============================
    // PROYECTO
    // =============================
    if (user.state === STATES.PROYECTO) {

      const preguntaActual = preguntas[user.paso];

      if (esPregunta(msg)) {
        return res.json({
          response:
`💡 Buena pregunta 👌

👉 Para "${preguntaActual}" incluye:
- contexto
- población
- ubicación
- impacto

👉 Ahora responde:
${preguntaActual}`
        });
      }

      const nivel = validarBasico(msg);

      if (nivel === "debil") {
        return res.json({
          response:
`👀 Necesito más detalle.

👉 ${preguntaActual}

Ejemplo:
Describe con contexto claro, población y problema`
        });
      }

      const mejora = await asesorIA(preguntaActual, msg);

      user.respuestas.push(msg);
      guardarEstado(estado);

      if (user.paso < preguntas.length - 1) {
        user.paso++;
        guardarEstado(estado);

        return res.json({
          response:
`${mejora || "✔ Respuesta guardada"}

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const resultado = await generarProyecto(user.respuestas);

      init(userId);

      return res.json({
        response: "🎉 Tu proyecto ha sido formulado correctamente",
        proyecto: resultado
      });
    }

    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

app.listen(PORT, () => {
  console.log("Servidor SaaS funcionando en puerto " + PORT);
});
