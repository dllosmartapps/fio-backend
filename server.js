const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// =============================
// MEMORIA
// =============================

const estado = {};

// =============================
// VALIDACIÓN
// =============================

function validar(msg) {
  return msg && msg.trim().length > 10;
}

// =============================
// MEJORA DE RESPUESTAS
// =============================

function mejorarRespuesta(paso, msg) {
  const texto = msg.charAt(0).toUpperCase() + msg.slice(1);

  if (paso === 1) {
    return `Podemos formular el problema así:
"${texto}."

👉 Debe expresar una situación negativa, concreta y con población afectada.`;
  }

  if (paso === 2) {
    return `Tu objetivo puede quedar así:
"${texto}."

👉 Usa verbo en infinitivo (mejorar, fortalecer, implementar).`;
  }

  if (paso === 3) {
    return `Ubicación definida:
"${texto}"

👉 Sé específico (ciudad, municipio, institución).`;
  }

  if (paso === 4) {
    return `Población clara:
"${texto}"

👉 Intenta segmentar o cuantificar.`;
  }

  if (paso === 5) {
    return `Evidencia del problema:
"${texto}"

👉 Ideal incluir datos o cifras.`;
  }

  return `"${texto}"`;
}

// =============================
// PREGUNTAS
// =============================

const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema principal que quieres resolver?",
  "¿Dónde se desarrolla el proyecto?",
  "¿A quién está dirigido?",
  "¿Qué evidencias tienes del problema?",
  "¿Cuál es el tema del proyecto?",
  "¿Cuál es la duración estimada?",
  "¿Con qué recursos cuentas actualmente?",
  "¿Cuál es el presupuesto aproximado?",
  "¿Qué metas o logros esperas alcanzar?",
  "¿A qué ODS o política se alinea?",
  "¿Qué formato institucional debes usar?",
  "¿Debo seguir normas específicas?",
  "¿Quieres que FIO complete lo faltante?"
];

// =============================
// MENSAJES DINÁMICOS
// =============================

function mensajePaso(paso) {
  if (paso === 1) return "Estamos arrancando fuerte.";
  if (paso === 5) return "Aquí ya hay estructura técnica.";
  if (paso === 10) return "Este punto define viabilidad.";
  return "Sigamos afinando.";
}

// =============================
// ENDPOINT
// =============================

app.post("/chat", (req, res) => {
  const { userId, msg } = req.body;

  if (!userId) {
    return res.json({ response: "Falta userId" });
  }

  if (!estado[userId]) {
    estado[userId] = { paso: 0, respuestas: [] };
  }

  let paso = estado[userId].paso;

  // BIENVENIDA
  if (paso === 0) {
    estado[userId].paso = 1;

    return res.json({
      response: `Hola, ¿cómo va? Soy FIO, tu asesor de proyectos 🚀

Vamos a formular un proyecto impactante juntos.

No te preocupes, yo te guío paso a paso.

(5%) Arranquemos:
👉 ${preguntas[0]}`
    });
  }

  // VALIDACIÓN
  if (!validar(msg)) {
    return res.json({
      response: `Hey, pilas 👀

Necesito un poco más de detalle para que esto quede sólido.

Respóndeme mejor y seguimos 👇`
    });
  }

  // MEJORA
  const mejora = mejorarRespuesta(paso, msg);

  estado[userId].respuestas.push(msg);

  // SIGUIENTE PREGUNTA
  if (paso < preguntas.length) {
    estado[userId].paso++;

    return res.json({
      response: `(${paso * 7}%) Vas muy bien 🔥

${mejora}

${mensajePaso(paso)}

👉 Sigamos:
${preguntas[paso]}`
    });
  }

  // RESULTADO FINAL
  const r = estado[userId].respuestas;

  const proyecto = `
📄 PROYECTO FORMULADO

🔹 Nombre:
${r[0]}

🔹 Problema:
${r[1]}

🔹 Ubicación:
${r[2]}

🔹 Población:
${r[3]}

🔹 Evidencia:
${r[4]}

🎯 Objetivo General:
${r[9]}

📅 Duración:
${r[6]}

💰 Presupuesto:
${r[8]}

🌍 ODS:
${r[10]}
`;

  estado[userId] = { paso: 0, respuestas: [] };

  return res.json({
    response: `(100%) Lo logramos 🚀🔥

Tu proyecto ya tiene base estructurada.

Ahora pudes organizar tu formato completo y enviarlo.

👉 Dime cómo quieres seguir.

${proyecto}`
  });
});

// =============================
// SERVER
// =============================

app.listen(3000, () => {
  console.log("FIO PRO corriendo en http://localhost:3000 🚀");
});
