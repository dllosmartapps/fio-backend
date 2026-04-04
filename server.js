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
// PREGUNTAS
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal?",
  "¿Dónde se desarrolla?"
];

// =============================
// INIT USUARIO
// =============================
function init(userId) {
  estado[userId] = {
    inicio: true,
    modo: null,
    paso: 0,
    respuestas: []
  };
}

// =============================
// DETECTAR INTENCIÓN
// =============================
function detectarModo(msg) {
  if (!msg) return null;

  const m = msg.toLowerCase();

  if (m.includes("convocatoria")) return "convocatorias";
  if (m.includes("proyecto")) return "proyecto";

  return null;
}

// =============================
// HEALTH
// =============================
app.get("/", (req, res) => {
  res.send("Servidor OK 🚀");
});

// =============================
// CHAT
// =============================
app.post("/chat", (req, res) => {
  try {
    let userId = req.body.userId;
    let msg = req.body.msg;

    if (!userId) userId = "global-user";
    if (!msg) msg = "";

    // crear usuario
    if (!estado[userId]) {
      init(userId);
    }

    const user = estado[userId];

    // =============================
    // DETECTAR INTENCIÓN GLOBAL
    // =============================
    const modo = detectarModo(msg);

    if (modo === "convocatorias") {
      return res.json({
        response: "🔎 Aquí verás convocatorias (mock)"
      });
    }

    if (modo === "proyecto") {
      user.modo = "proyecto";
      user.paso = 0;
      user.respuestas = [];

      return res.json({
        response: "Perfecto 👌 iniciemos.\n👉 " + preguntas[0]
      });
    }

    // =============================
    // SALUDO
    // =============================
    if (user.inicio === true) {
      user.inicio = false;

      return res.json({
        response:
          "Hola 👋 Soy FIO.\n\nEscribe:\n👉 Quiero crear un proyecto\n👉 Ver convocatorias"
      });
    }

    // =============================
    // FLUJO PROYECTO
    // =============================
    if (user.modo === "proyecto") {
      user.respuestas.push(msg);

      if (user.paso < preguntas.length - 1) {
        user.paso = user.paso + 1;

        return res.json({
          response: "👉 " + preguntas[user.paso]
        });
      }

      // finalizar
      init(userId);

      return res.json({
        response: "🎉 Proyecto básico completado"
      });
    }

    // =============================
    // DEFAULT
    // =============================
    return res.json({
      response: "No entendí 👀 escribe 'proyecto'"
    });

  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

// =============================
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
