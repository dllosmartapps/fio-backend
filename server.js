import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
  "¿Recursos?",
  "¿Presupuesto?",
  "¿Metas?",
  "¿ODS?",
  "¿Formato?",
  "¿Normas?",
  "¿Deseas ayuda adicional?"
];

// =============================
// INIT
// =============================
function init(userId) {
  estado[userId] = {
    state: STATES.INICIO,
    paso: 0,
    respuestas: []
  };
}

// =============================
// DETECTAR INTENCIÓN (ROBUSTO)
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
// NORMALIZAR INPUT (CLAVE)
// =============================
function getMessage(body) {
  return (
    body.msg ||
    body.message ||
    body.text ||
    ""
  ).toString();
}

// =============================
app.get("/", (req, res) => {
  res.send("FIO backend OK 🚀");
});

// =============================
// CHAT
// =============================
app.post("/chat", (req, res) => {
  try {
    let userId = req.body.userId || "global-user";
    let msg = getMessage(req.body);

    // DEBUG REAL
    console.log("BODY:", req.body);
    console.log("MSG:", msg);

    if (!estado[userId]) init(userId);
    const user = estado[userId];

    // =============================
    // 1. DETECTAR INTENCIÓN SIEMPRE
    // =============================
    const intent = detectarIntencion(msg);
    console.log("INTENT:", intent);
    console.log("STATE BEFORE:", user.state);

    if (intent === STATES.PROYECTO) {
      user.state = STATES.PROYECTO;
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: `Perfecto 👌 iniciemos paso a paso.\n\n👉 ${preguntas[0]}`
      });
    }

    if (intent === STATES.CONVOCATORIAS) {
      user.state = STATES.CONVOCATORIAS;

      return res.json({
        response: "🔎 Aquí verás convocatorias (próxima fase: scraping real)"
      });
    }

    // =============================
    // 2. ESTADOS
    // =============================

    // INICIO
    if (user.state === STATES.INICIO) {
      user.state = STATES.ESPERANDO;

      return res.json({
        response:
`Hola 👋 Soy FIO.

Te ayudo a:
✔ Formular proyectos paso a paso
✔ Mejorar ideas
✔ Buscar convocatorias

👉 Escribe:
"Quiero crear un proyecto"`
      });
    }

    // ESPERANDO
    if (user.state === STATES.ESPERANDO) {
      return res.json({
        response:
"👉 Puedes escribir:\n- Quiero crear un proyecto\n- Ver convocatorias"
      });
    }

    // PROYECTO (FLUJO REAL)
    if (user.state === STATES.PROYECTO) {

      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso++;

        return res.json({
          response:
`✔ Respuesta guardada

📊 Avance: ${Math.round((user.paso / preguntas.length) * 100)}%

👉 ${preguntas[user.paso]}`
        });
      }

      // FINAL
      const resumen = user.respuestas.join("\n");

      init(userId);

      return res.json({
        response: "🎉 Proyecto completado",
        data: resumen
      });
    }

    // CONVOCATORIAS
    if (user.state === STATES.CONVOCATORIAS) {
      return res.json({
        response: "🔎 Mostrando convocatorias (mock)"
      });
    }

    // DEFAULT
    return res.json({
      response: "👉 Escribe: 'Quiero crear un proyecto'"
    });

  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      error: "Error interno"
    });
  }
});

app.listen(PORT, () => {
  console.log("Servidor FINAL funcionando en puerto " + PORT);
});
