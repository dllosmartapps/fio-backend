import fetch from "node-fetch";

const SERP_API_KEY = process.env.SERP_API_KEY;

export async function buscarConvocatorias(query = "") {
  const url = `https://serpapi.com/search.json?q=convocatorias+${query}&api_key=${SERP_API_KEY}`;

  const r = await fetch(url);
  const d = await r.json();

  return d.organic_results?.slice(0, 3).map(x => ({
    nombre: x.title,
    link: x.link,
    descripcion: x.snippet,
    sector: "social"
  })) || [];
}
