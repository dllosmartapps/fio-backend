import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔥 MEMORIA SIMPLE (control de flujo)
let estado = {};

// ✅ RUTA BASE
app.get("/", (req,res)=>{
  res.send("FIO backend activo 🚀");
});

// 🚀 CHAT PRINCIPAL
app.post("/chat", async(req,res)=>{
  const msg = req.body.message || "";
  const userId = "user1";

  // iniciar estado
  if(!estado[userId]){
    estado[userId] = { paso: 1 };
  }

  const paso = estado[userId].paso;

  // 🔵 INICIO DEL FLUJO
  if(msg.toLowerCase().includes("proyecto")){
    estado[userId].paso = 1;

    return res.json({
      response: "Hola, ¿cómo va? Soy FIO 👋\n\nEstoy acá para que juntos formulemos un proyecto impactante.\n\n(10%) Empezamos:\n¿Cuál es el problema o necesidad que quieres resolver?"
    });
  }

  // 🟢 PASO 1
  if(paso === 1){
    estado[userId].paso = 2;

    return res.json({
      response: `(10%) Vas muy bien 🔥\n\nPodemos formular tu problema así:\n"${msg}"\n\n👉 Escríbelo en tu formato de marco lógico.\n\n(20%) Sigamos:\n¿Cuál es el objetivo principal del proyecto?`
    });
  }

  // 🟢 PASO 2
  if(paso === 2){
    estado[userId].paso = 3;

    return res.json({
      response: `(20%) Excelente 👏\n\nObjetivo claro:\n"${msg}"\n\n👉 Anótalo en tu formato.\n\n(30%) Ahora:\n¿Qué resultados específicos quieres lograr?`
    });
  }

  // 🟢 PASO 3
  if(paso === 3){
    estado[userId].paso = 4;

    return res.json({
      response: `(30%) Vas muy bien 🚀\n\nResultados definidos:\n"${msg}"\n\n(40%) Ahora:\n¿Quiénes son los actores involucrados o afectados?`
    });
  }

  // 🟢 PASO 4
  if(paso === 4){
    estado[userId].paso = 5;

    return res.json({
      response: `(40%) Muy bien 💡\n\nActores identificados:\n"${msg}"\n\n(50%) Ahora:\n¿Qué actividades vas a realizar?`
    });
  }

  // 🟢 PASO 5
  if(paso === 5){
    estado[userId].paso = 6;

    return res.json({
      response: `(50%) Seguimos 🔥\n\nActividades:\n"${msg}"\n\n(60%) Ahora:\n¿Qué resultados esperas lograr?`
    });
  }

  // 🟢 PASO 6
  if(paso === 6){
    estado[userId].paso = 7;

    return res.json({
      response: `(60%) Excelente 👏\n\nResultados esperados:\n"${msg}"\n\n(70%) Ahora:\n¿Cómo medirás el éxito del proyecto?`
    });
  }

  // 🟢 PASO 7
  if(paso === 7){
    estado[userId].paso = 8;

    return res.json({
      response: `(70%) Muy bien 📊\n\nIndicadores:\n"${msg}"\n\n(80%) Ahora:\n¿Cómo verificarás esos resultados?`
    });
  }

  // 🟢 PASO 8
  if(paso === 8){
    estado[userId].paso = 9;

    return res.json({
      response: `(80%) Perfecto 🔍\n\nVerificación:\n"${msg}"\n\n(90%) Ahora:\n¿Qué riesgos puede tener el proyecto?`
    });
  }

  // 🟢 PASO FINAL
  if(paso === 9){
    estado[userId].paso = 1;

    return res.json({
      response: `(100%) 🎉 PROYECTO COMPLETO\n\nResumen final:\n"${msg}"\n\n🚀 Ya tienes tu proyecto estructurado.\n\nVas muy bien, esto ya es nivel profesional.`
    });
  }

});

// 🚀 SERVIDOR
app.listen(PORT, ()=>{
  console.log("Servidor en puerto " + PORT);
});
