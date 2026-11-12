// Primera línea de cada fragmento: comentario JSON con título y descripción (lo lee staticPage en el middleware).
export const metaComment = (meta: { title: string; description: string }) => "<!--" + JSON.stringify(meta) + "-->\n";
