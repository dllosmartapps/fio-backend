import fetch from "node-fetch";

const SERP_API_KEY = process.env.SERP_API_KEY;

export async function buscarConvocatorias(query = "") {

  const q = `convocatorias proyectos Colombia site:.gov OR site:.org ${query}`;

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${SERP_API_KEY}`;

  const r = await fetch(url);
  const data = await r.json();

  return data.organic_results?.slice(0, 5).map(x => ({
    nombre: x.title,
    link: x.link,
    descripcion: x.snippet,
    sector: "social",
    ods: ["4"],
    pais: "Colombia",
    monto: 50000000
  })) || [];
}
