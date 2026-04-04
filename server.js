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
    const res = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/posts?per_page=10`);
    const data = await res.json();

    return data
      .map(p => p.title.rendered + ": " + p.content.rendered.replace(/<[^>]+>/g, ""))
      .join("\n\n");
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

  if(msg.toLowerCase().includes("pdf")){
    const file=generarPDF("Proyecto FIO");
    return res.json({response:"PDF generado",file});
  }

  // 🔗 CONTEXTOS
  const contextoInternet = await buscarDatos(msg);
  const contextoWP = await obtenerContenidoWP();

  // 🧠 PROMPT INTELIGENTE
  const prompt=`
Eres FIO, asesor experto en proyectos sociales, ambientales, culturales y productivos.

Trabajas por etapas:
- haces preguntas
- validas información
- construyes soluciones reales

Usas dos fuentes:

1. Base interna (WordPress):
${contextoWP}

2. Información actual (Internet):
${contextoInternet}

Reglas:
- Prioriza el conocimiento de FIO
- Usa internet solo como complemento
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
