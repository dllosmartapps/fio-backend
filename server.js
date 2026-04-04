import express from "express";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";
import fs from "fs";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

app.get("/", (req,res)=>{
  res.send("FIO backend activo");
});

// 🔎 BUSCAR EN INTERNET
async function buscarDatos(q){
  if(!SERP_API_KEY) return "";
  const url=`https://serpapi.com/search.json?q=${q}&api_key=${SERP_API_KEY}`;
  const r=await fetch(url);
  const d=await r.json();
  return d.organic_results?.slice(0,2).map(x=>x.snippet).join("\n")||"";
}

// 🌐 LEER WORDPRESS
async function obtenerContenidoWP() {
  try {
    const base = process.env.WP_URL;

    const [proyectos, metodologias, convocatorias] = await Promise.all([
      fetch(`${base}/wp-json/wp/v2/posts?categories=1&per_page=5`).then(r=>r.json()),
      fetch(`${base}/wp-json/wp/v2/posts?categories=2&per_page=5`).then(r=>r.json()),
      fetch(`${base}/wp-json/wp/v2/posts?categories=3&per_page=5`).then(r=>r.json())
    ]);

    const limpiar = (arr) =>
      arr.map(p =>
        p.title.rendered + ": " +
        p.content.rendered.replace(/<[^>]+>/g, "")
      ).join("\n\n");

    return `
PROYECTOS:
${limpiar(proyectos)}

METODOLOGÍAS:
${limpiar(metodologias)}

CONVOCATORIAS:
${limpiar(convocatorias)}
`;
  } catch (e) {
    return "";
  }
}

// 📄 GENERAR PDF
function generarPDF(texto){
  const doc=new PDFDocument();
  const path="proyecto.pdf";
  doc.pipe(fs.createWriteStream(path));
  doc.text(texto);
  doc.end();
  return path;
}

// 💬 CHAT
app.post("/chat", async(req,res)=>{
  const msg=req.body.message || "";
  if(msg.toLowerCase().includes("proyecto")){
  return res.json({
    response: "Hola, ¿cómo va? Soy FIO 👋\n\nVamos a construir tu proyecto paso a paso.\n\nDime algo primero:\n¿ya tienes avance o empezamos desde cero?"
  });
}

  if(msg.toLowerCase().includes("pdf")){
    const file=generarPDF("Proyecto FIO");
    return res.json({response:"PDF generado",file});
  }

  // 🔗 CONTEXTOS
  const contextoInternet = await buscarDatos(msg);
  const contextoWP = await obtenerContenidoWP();

  // 🧠 PROMPT INTELIGENTE
  const prompt=`
Hola, ¿cómo va? Soy FIO, tu asesor de proyectos.
Estoy acá para que juntos formulemos un proyecto impactante 🚀

Trabajo contigo paso a paso usando metodología de marco lógico.

MI ESTILO:
- Experto pero cercano
- Claro, directo y estratégico
- Motivador (vas muy bien, sigamos, no te preocupes, pilas, lo estás logrando)

REGLAS:
1. SOLO haces una pregunta a la vez
2. Esperas la respuesta del usuario
3. Analizas su respuesta
4. Das una recomendación corta
5. Pasas al siguiente paso
6. Indicas porcentaje de avance
7. NUNCA das todo el proceso de una vez

SI EL USUARIO YA TIENE AVANCE:
Preguntar:
"¿En qué parte del proyecto vas? Puedes copiar y pegar lo que llevas"

Luego continúas desde ahí.

FLUJO (MARCO LÓGICO):

PASO 1 (10%)
Problema:
Pregunta:
¿Cuál es el problema o necesidad que quieres resolver?

PASO 2 (20%)
Objetivo general:
¿Cuál es el propósito principal del proyecto?

PASO 3 (30%)
Objetivos específicos:
¿Qué resultados concretos quieres lograr?

PASO 4 (40%)
Actores:
¿Quiénes están involucrados o afectados?

PASO 5 (50%)
Actividades:
¿Qué acciones vas a realizar?

PASO 6 (60%)
Resultados:
¿Qué cambios esperas lograr?

PASO 7 (70%)
Indicadores:
¿Cómo medirás el éxito?

PASO 8 (80%)
Verificación:
¿Cómo comprobarás resultados?

PASO 9 (90%)
Riesgos:
¿Qué puede afectar el proyecto?

PASO FINAL (100%):
- Muestra el proyecto organizado
- Motiva al usuario a ejecutarlo

IMPORTANTE:
Siempre dile:
"Anota esto en tu formato de marco lógico"

Usas dos fuentes:

1. Base interna (WordPress):
${contextoWP}

2. Información actual (Internet):
${contextoInternet}

Reglas:
- Prioriza toda información de internet acorde al tema, organizadamente 
- Utiliza el conocimiento de FIO
- Responde claro, estructurado y útil
- Guía paso a paso

Usuario: ${msg}
`;

  const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      model:"openai/gpt-3.5-turbo",
      messages:[{role:"user",content:prompt}]
    })
  });

  const d=await r.json();

  res.json({
    response:d.choices?.[0]?.message?.content || "Error IA"
  });
});

app.listen(PORT, ()=>console.log("Servidor en "+PORT));
