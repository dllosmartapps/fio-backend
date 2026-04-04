export function calcularScore(proyecto, convocatoria) {
  let score = 0;

  if (proyecto.sector === convocatoria.sector) score += 3;

  if (proyecto.ods && convocatoria.ods) {
    const matchODS = proyecto.ods.filter(o => convocatoria.ods.includes(o));
    score += matchODS.length * 2;
  }

  if (convocatoria.pais === "Colombia") score += 2;

  if (proyecto.presupuesto <= convocatoria.monto) score += 2;

  return score;
}

export function hacerMatching(proyecto, convocatorias) {
  return convocatorias
    .map(c => ({
      ...c,
      score: calcularScore(proyecto, c)
    }))
    .sort((a, b) => b.score - a.score);
}
