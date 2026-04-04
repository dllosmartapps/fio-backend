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
}

// =============================
function getMessage(body) {
  return (body.msg || body.message || body.text || "").toString();
}

// =============================
function detectarIntencion(msg = "") {
  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return STATES.CONVOCATORIAS;
  if (m.includes("proyecto") || m.includes("crear")) return STATES.PROYECTO;

  return null;
}

// =============================
// VALIDACIÓN BÁSICA
// =============================
function validarBasico(msg) {
  if (!msg || msg.length < 5) return "debil";
  if (msg.split(" ").length < 3) return "media";
  return "buena";
}

// =============================
// CONTEXTO WORDPRESS
// =============================
async function obtenerContextoWP() {
  try {
    const r = await fetch("https://tusitio.com/wp-json/wp/v2/posts?per_page=3");
    const data = await r.json();

    return data
      .map(p => `${p.title.rendered} ${p.excerpt.rendered}`)
      .join("\n");

  } catch {
    return "";
  }
}

// =============================
// IA ASESOR
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

Usa este conocimiento:
${contextoWP}

Responde SIEMPRE así:

👉 Vas muy bien 🔥  
👉 Podemos formularlo mejor así:
"texto mejorado"

👉 Explicación breve

Luego guía al siguiente paso.
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
// GENERADOR FINAL
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
Construye:

1. Árbol de problemas
2. Árbol de objetivos
3. Alternativas
4. Marco lógico

Con base en:
${respuestas.join("\n")}
`
          }
        ]
      })
    });

    const d = await r.json();
    return d?.choices?.[0]?.message?.content || "Error generando";

  } catch {
    return "Error IA";
  }
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO PRO 🚀");
});

// =============================
app.post("/chat", async (req, res) => {
  try {
    let userId = req.body.userId || "global";
    let msg = getMessage(req.body);

    if (!estado[userId]) init(userId);
    const user = estado[userId];

    const intent = detectarIntencion(msg);

    // CAMBIO DE MODO
    if (intent === STATES.PROYECTO) {
      user.state = STATES.PROYECTO;
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 iniciemos.\n\n👉 ${preguntas[0]}`
      });
    }

    if (intent === STATES.CONVOCATORIAS) {
      user.state = STATES.CONVOCATORIAS;

      return res.json({
        response: "🔎 Convocatorias (siguiente fase scraping real)"
      });
    }

    // INICIO
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a formular proyectos paso a paso.

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // ESPERANDO
    if (user.state === STATES.ESPERANDO) {
      return res.json({
        response:
"👉 Escribe:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // PROYECTO
    if (user.state === STATES.PROYECTO) {

      const preguntaActual = preguntas[user.paso];

      // evitar romper flujo
      if (msg.includes("?")) {
        return res.json({
          response: `👉 Vamos paso a paso.\n\nResponde:\n${preguntaActual}`
        });
      }

      const nivel = validarBasico(msg);

      if (nivel === "debil") {
        return res.json({
          response:
`👀 Necesito más detalle.

👉 ${preguntaActual}

Ejemplo:
Describe con contexto, población y lugar`
        });
      }

      const mejora = await asesorIA(preguntaActual, msg);

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

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
        response: "🎉 Proyecto formulado",
        proyecto: resultado
      });
    }

    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error interno" });
  }
});

app.listen(PORT, () => {
  console.log("FIO PRO corriendo en puerto " + PORT);
});
