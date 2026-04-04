import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// =============================
// RUTA BASE
// =============================
app.get("/", (req, res) => {
  res.send("FIO backend activo 🚀");
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
// MEJORA RESPUESTAS
// =============================
function mejorar(paso, msg) {
  const t = msg.trim();
  const texto = t.charAt(0).toUpperCase() + t.slice(1);

  if (paso === 1) {
    return `Formulación del problema:
"${texto}."

👉 Debe ser una situación negativa, clara y con población afectada.`;
  }

  if (paso === 2) {
    return `Ubicación definida:
"${texto}"

👉 Sé específico (municipio, territorio, institución).`;
  }

  if (paso === 3) {
    return `Población objetivo:
"${texto}"

👉 Intenta segmentar (edad, sector, cantidad).`;
  }

  if (paso === 4) {
    return `Resultado esperado:
"${texto}"

👉 Redáctalo como cambio o impacto (mejorar, fortalecer, reducir).`;
  }

  return `"${texto}"`;
}

// =============================
// FLUJO
// =============================
const preguntas = [
  "¿Cómo se llama el proyecto?",
  "¿Cuál es el problema que quieres resolver?",
  "¿Dónde se desarrolla el proyecto?",
  "¿A quién beneficia?",
  "¿Qué resultados esperas lograr?"
];

// =============================
// ENDPOINT
// =============================
app.post("/chat", (req, res) => {
  const { userId, msg } = req.body;

  const uid = userId || "default";

  if (!estado[uid]) {
    estado[uid] = { paso: 0, respuestas: [] };
  }

  let paso = estado[uid].paso;

  // BIENVENIDA
  if (paso === 0) {
    estado[uid].paso = 1;

    return res.json({
      response: `Hola, ¿cómo va? Soy FIO 👋

Estoy acá para que juntos formulemos un proyecto impactante.

No te preocupes, vamos paso a paso.

(10%) Empezamos:
👉 ${preguntas[0]}`
    });
  }

  // VALIDACIÓN
  if (!validar(msg)) {
    return res.json({
      response: `Hey, pilas 👀

Dame un poco más de detalle para que esto quede sólido.`
    });
  }

  // GUARDAR
  estado[uid].respuestas.push(msg);

  // MEJORA
  const mejora = mejorar(paso, msg);

  // SIGUIENTE PASO
  if (paso < preguntas.length) {
    estado[uid].paso++;

    return res.json({
      response: `(${paso * 20}%) Vas muy bien 🔥

${mejora}

👉 Sigamos:
${preguntas[paso]}`
    });
  }

  // RESULTADO FINAL
  const r = estado[uid].respuestas;

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

🎯 Resultado esperado:
${r[4]}
`;

  // RESET
  estado[uid] = { paso: 0, respuestas: [] };

  return res.json({
    response: `(100%) Lo logramos 🚀🔥

Tu proyecto ya tiene una base clara y estructurada.

👉 Podemos llevarlo a marco lógico completo cuando quieras.

${proyecto}`
  });
});

// =============================
// PUERTO
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor FIO corriendo en puerto " + PORT + " 🚀");
});
