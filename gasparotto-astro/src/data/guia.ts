// Guía gratuita /guia-buenos-aires/ (portugués de Brasil). Textos de la página y del bloque de la portada.
// Datos que cambian (documentos, pagos, transporte): revisados en noviembre de 2026. Si cambia algo, se edita acá y la fecha en "updated".
export const guia = {
  path: "/guia-buenos-aires/",
  updated: "novembro de 2026",
  updatedIso: "2026-11-14",
  meta: {
    title: "Guia grátis de Buenos Aires 2026: roteiro e dicas | {{BRAND}}",
    description: "Guia gratuito de Buenos Aires para brasileiros: monte seu roteiro dia a dia, veja documentos, dinheiro e Pix, transporte, onde ficar e o que fazer. Atualizado em 2026.",
  },
  h1: "Guia grátis de Buenos Aires para brasileiros",
  lead: "Monte seu roteiro em 1 minuto e tire as dúvidas de antes da viagem: documentos, dinheiro, transporte, onde ficar e o que não pode faltar. Feito por quem vive e trabalha em Buenos Aires desde 2006.",

  // Bloque de la portada (reemplaza "O que você quer viver?").
  teaser: {
    kicker: "Guia grátis",
    title: "Vai para Buenos Aires? Monte seu roteiro grátis",
    lead: "Diga quantos dias você vai ficar e o que gosta. O guia monta o roteiro dia a dia e responde as dúvidas de antes da viagem.",
    q: "Quantos dias você vai ficar?",
    days: [2, 3, 4, 5, 7],
    points: ["Roteiro dia a dia, do seu jeito", "Documentos, Pix e câmbio", "Do aeroporto ao hotel", "Melhores bairros para ficar"],
    cta: "Abrir o guia completo",
  },

  checklist: [
    "RG físico em bom estado ou passaporte válido",
    "Seguro viagem com cobertura médica",
    "Autorização de viagem dos menores (se for o caso)",
    "Cartão internacional ou conta global ativada",
    "Um pouco de dinheiro vivo para o primeiro dia",
    "Adaptador de tomada tipo I (três pinos em V)",
    "Chip ou eSIM com internet",
    "Traslado do aeroporto ao hotel combinado",
    "Show de tango reservado (as melhores mesas esgotam)",
    "Casaco leve, mesmo no verão (noites e ar-condicionado)",
  ],

  sections: [
    {
      id: "documentos", title: "Documentos para entrar na Argentina",
      html: `<p>Brasileiros não precisam de passaporte nem visto para turismo. Na imigração valem:</p>
<ul><li><strong>RG físico em bom estado</strong> (sem rasuras, foto reconhecível) <strong>ou passaporte válido</strong>.</li>
<li><strong>Não valem:</strong> CNH (nem física nem digital) e RG digital no celular.</li>
<li><strong>Seguro viagem com cobertura médica</strong> é exigido para entrar.</li>
<li><strong>Menores de idade</strong> que viajam sem os pais (ou com só um deles) precisam de autorização. Confirme os documentos antes de sair do Brasil.</li></ul>`,
    },
    {
      id: "dinheiro", title: "Dinheiro, câmbio e Pix",
      html: `<p>A moeda é o <strong>peso argentino (ARS)</strong>. O jeito mais barato de pagar muda com frequência, então vale ter duas formas de pagamento:</p>
<ul><li><strong>Cartão de débito internacional ou conta global</strong>: costuma ter o menor custo de conversão (mais o IOF).</li>
<li><strong>Pix</strong>: já funciona em parte do comércio, pelo Mercado Pago e pelo Pix no Exterior do Banco do Brasil. Você escaneia o QR da loja no app do seu banco e paga em reais. A aceitação ainda é limitada e mais comum em áreas turísticas, como a Calle Florida e a feira de San Telmo.</li>
<li><strong>Dinheiro vivo</strong>: leve um pouco para táxis, gorjetas e lojinhas. Troque só em casas de câmbio oficiais e evite o câmbio de rua.</li></ul>
<div class="gvb-tip"><strong>Dica da agência</strong><p>Muitos dos nossos passeios e shows podem ser reservados online e pagos com Pix, em reais, antes da viagem.</p></div>`,
    },
    {
      id: "aeroporto", title: "Do aeroporto ao hotel",
      html: `<p>Buenos Aires tem dois aeroportos:</p>
<ul><li><strong>Ezeiza (EZE)</strong>: voos internacionais, a cerca de 35 km do centro. De carro, de 40 minutos a mais de 1 hora, conforme o trânsito.</li>
<li><strong>Aeroparque Jorge Newbery (AEP)</strong>: dentro da cidade, à beira do rio. Recebe voos domésticos e alguns do Brasil; fica a uns 15–20 minutos do centro.</li></ul>
<p>Depois de um voo, o mais tranquilo é ter o traslado já combinado: o motorista espera com seu nome na saída e leva direto ao hotel. <a href="/traslados/">Veja os traslados</a>.</p>`,
    },
    {
      id: "transporte", title: "Como se locomover",
      html: `<ul><li><strong>Metrô (subte)</strong>: rápido para o centro, Palermo e Recoleta. Aceita cartão de crédito ou débito por aproximação e QR, além do cartão SUBE.</li>
<li><strong>Ônibus (colectivos)</strong>: chegam a todo lugar; pague com o cartão <strong>SUBE</strong>, vendido e recarregado em bancas e estações.</li>
<li><strong>Uber, Cabify e táxi</strong>: funcionam bem e não são caros em comparação com o Brasil.</li>
<li><strong>A pé</strong>: o centro, San Telmo, Recoleta e Palermo são ótimos para caminhar.</li></ul>`,
    },
    {
      id: "onde-ficar", title: "Onde ficar: os melhores bairros",
      html: `<ul><li><strong>Centro / Microcentro</strong>: perto da Calle Florida, do Obelisco e da Av. Corrientes. Prático e com bom preço; mais movimentado de dia.</li>
<li><strong>Recoleta</strong>: elegante, tranquila e bem localizada. Ótima para a primeira viagem e para famílias.</li>
<li><strong>Palermo</strong>: bares, restaurantes e vida noturna. Ideal para casais e grupos de amigos.</li>
<li><strong>Puerto Madero</strong>: moderno e seguro, com restaurantes à beira do dique. O mais caro.</li>
<li><strong>San Telmo</strong>: histórico e boêmio, com a feira de domingo e o tango nas ruas.</li></ul>`,
    },
    {
      id: "o-que-fazer", title: "O que não pode faltar",
      html: `<ul><li><strong>Show de tango com jantar</strong>: o programa mais típico da cidade. <a href="/paquetes/categoria/show-de-tango/">Veja os shows</a>.</li>
<li><strong>City tour</strong>: Plaza de Mayo, Casa Rosada, San Telmo, La Boca (Caminito), Puerto Madero, Recoleta e Palermo em uma manhã. <a href="/paquetes/categoria/city-tour/">Veja o city tour</a>.</li>
<li><strong>Delta do Tigre</strong>: passeio de barco pelos canais, a uma hora da cidade. <a href="/paquetes/categoria/paseos/">Veja os passeios</a>.</li>
<li><strong>Cemitério da Recoleta</strong>, <strong>Teatro Colón</strong> (visita guiada) e um café em um <strong>café notável</strong>, como o Tortoni.</li>
<li><strong>Comer bem</strong>: parrilla (bife de chorizo, ojo de bife), empanadas, doce de leite, alfajores e um bom Malbec.</li></ul>`,
    },
    {
      id: "quando-ir", title: "Clima e melhor época",
      html: `<ul><li><strong>Primavera (set–nov) e outono (mar–mai)</strong>: temperaturas agradáveis, a melhor época para passear.</li>
<li><strong>Verão (dez–fev)</strong>: quente e úmido, com dias acima de 30 °C. A cidade fica mais vazia em janeiro.</li>
<li><strong>Inverno (jun–ago)</strong>: frio, de cerca de 5 °C a 15 °C. Época de férias no Brasil em julho: reserve com antecedência.</li></ul>`,
    },
    {
      id: "dicas", title: "Dicas práticas",
      html: `<ul><li><strong>Horários</strong>: o argentino janta tarde, a partir das 21 h. Muitos restaurantes abrem para o jantar só às 20 h.</li>
<li><strong>Gorjeta</strong>: em restaurantes, o costume é deixar cerca de 10%. O "cubierto" (couvert) é cobrado à parte.</li>
<li><strong>Tomadas</strong>: 220 V, padrão tipo I (três pinos em V). Leve adaptador.</li>
<li><strong>Segurança</strong>: como em qualquer cidade grande, cuidado com o celular em lugares cheios. Em La Boca, fique na área do Caminito.</li>
<li><strong>Tax free</strong>: em lojas aderidas, compras de produtos argentinos podem ter o IVA devolvido. Peça a nota com seus dados e valide na saída do país, no aeroporto.</li></ul>`,
    },
  ],

  faq: [
    { q: "Brasileiro precisa de passaporte para ir a Buenos Aires?", a: "Não. Basta o RG físico em bom estado ou o passaporte válido. CNH e RG digital não são aceitos na imigração, e o seguro viagem com cobertura médica é exigido." },
    { q: "Dá para pagar com Pix em Buenos Aires?", a: "Sim, em parte do comércio: lojas com maquininhas do Mercado Pago ou que aceitam o Pix no Exterior do Banco do Brasil. A aceitação ainda é limitada, então leve também cartão internacional e um pouco de dinheiro vivo." },
    { q: "Quantos dias ficar em Buenos Aires?", a: "Com 3 dias dá para ver o principal: city tour, show de tango e os bairros clássicos. Com 4 ou 5 dias você inclui o Delta do Tigre, compras e restaurantes com calma." },
    { q: "Qual é o melhor bairro para ficar em Buenos Aires?", a: "Recoleta e Palermo são as opções preferidas por quem visita a cidade pela primeira vez. O Centro é mais prático e econômico, e Puerto Madero é o mais moderno e caro." },
    { q: "Como ir do aeroporto de Ezeiza ao centro?", a: "Ezeiza fica a cerca de 35 km do centro; de carro, leva de 40 minutos a mais de 1 hora. O mais simples é reservar um traslado com motorista esperando na saída." },
  ],
};
