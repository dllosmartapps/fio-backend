
// =============================

app.post("/chat", (req, res) => {
  const { userId, msg } = req.body;

  if (!estado[userId]) {
    estado[userId] = { paso: 0, respuestas: [] };
  }

  let paso = estado[userId].paso;

  // BIENVENIDA
  if (paso === 0) {
    estado[userId].paso = 1;

    return res.json({
      response: `Hola, ¿cómo va? Soy FIO, tu asesor de proyectos 🚀\n\nVamos a formular un proyecto impactante juntos.\n\nNo te preocupes, yo te guío paso a paso.\n\n(5%) Arranquemos:\n👉 ${preguntas[0]}`
    });
  }

  // VALIDACIÓN
  if (!validar(msg)) {
    return res.json({
      response: `Hey, pilas 👀\n\nNecesito un poco más de detalle para que esto quede sólido.\n\nRespóndeme mejor y seguimos 👇`
    });
  }

  // MEJORAR RESPUESTA
  const mejora = mejorarRespuesta(paso, msg);

  estado[userId].respuestas.push(msg);

  // SIGUIENTE
  if (paso < preguntas.length) {
    estado[userId].paso++;

    return res.json({
      response: `(${paso * 7}%) Vas muy bien 🔥\n\n${mejora}\n\n${mensajePaso(paso)}\n\n👉 Sigamos:\n${preguntas[paso]}`
    });
  }

  // GENERACIÓN FINAL
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
    response: `(100%) Lo logramos 🚀🔥\n\nTu proyecto ya tiene base estructurada.\n\nAhora podemos llevarlo a nivel profesional (marco lógico, DOFA, etc).\n\n👉 Dime cómo quieres seguir.\n\n${proyecto}`
  });
});

// SERVER
app.listen(3000, () => {
  console.log("FIO PRO corriendo en puerto 3000 🚀");
});
