// Contenido de la portada (en portugués de Brasil: el 99% del público es brasileño). Para cambiar textos de la home se edita solo este archivo.
export const meta = {
  title: "Gasparotto Viajes | Tango, city tour e passeios em Buenos Aires",
  description:
    "Reserve shows de tango, city tour, Delta do Tigre e passeios em Buenos Aires com atendimento personalizado pelo WhatsApp. Agência de viagens em Buenos Aires.",
};

export const hero = {
  lines: ["Buenos Aires,", "sob medida."],
  sub: "Shows de tango, city tour e passeios montados de acordo com as suas datas e o seu jeito de viajar.",
  secondary: { label: "Ver passeios", href: "#paquetes" },
  proof: "Reserva online com Pix ou pelo WhatsApp. Agência em Buenos Aires desde 2006.",
};

export const intents = {
  title: "O que você quer viver?",
  tiles: [
    { icon: "tango", title: "Quero tango", text: "Jantar show e espetáculos em teatros históricos.", cta: "Ver shows", tone: "rose", img: "/assets/tango.webp", alt: "Casal dançando tango em um salão com cortinas de veludo e orquestra ao vivo", pos: "74% 50%", href: "/paquetes/categoria/show-de-tango/" },
    { icon: "city", title: "Quero conhecer a cidade", text: "Roteiros guiados pelos bairros e pontos principais.", cta: "Ver city tour", tone: "blue", img: "/assets/city-tour.webp", alt: "Puerto Madero, o Obelisco e La Boca ao entardecer", pos: "62% 50%", href: "/paquetes/categoria/city-tour/" },
    { icon: "delta", title: "Quero passear", text: "Delta do Tigre, vinícolas e passeios de um dia.", cta: "Ver passeios", tone: "teal", img: "/assets/delta.webp", alt: "Lancha de madeira navegando pelo Delta do Tigre ao entardecer", pos: "72% 50%", href: "/paquetes/categoria/paseos/" },
  ],
};

export const founder = {
  img: "/assets/fundador-mario.webp",
  alt: "Mario Gasparotto, fundador da Gasparotto Viajes",
  quote: "Não vendemos passeios, criamos recordações inesquecíveis.",
  by: "Mario Gasparotto · Fundador da Gasparotto Viajes desde 2006",
  link: { label: "Conheça a agência", href: "/nosotros/" },
};

// Bloque "Paquetes o servicios": dos accesos. Paquete = varios servicios juntos; servicio = se reserva solo.
export const mix = {
  title: "Viaje do seu jeito",
  lead: "Reserve um pacote com tudo resolvido ou escolha só o que você precisa.",
  cards: [
    { kicker: "Pacotes", title: "Tudo resolvido em uma única reserva", text: "Combinamos traslados, passeios e experiências para você não precisar organizar nada.", cta: "Ver pacotes", href: "/paquetes/", img: "/assets/delta.webp", alt: "Lancha navegando pelo Delta do Tigre", pos: "70% 50%", tone: "bg-night" },
    { kicker: "Serviços", title: "Escolha só o que você precisa", text: "Cada serviço é reservado separadamente: um traslado, um show, um passeio.", cta: "Ver serviços", href: "/servicios/", img: "/assets/city-tour.webp", alt: "Puerto Madero e o Obelisco ao entardecer", pos: "60% 50%", tone: "bg-primary" },
  ],
};

export const featured = {
  title: "Os mais procurados",
  all: { label: "Ver todos os passeios e pacotes", href: "/paquetes/" },
  lead: "Escolha a data e reserve online em poucos minutos. Se preferir, tire as dúvidas pelo WhatsApp.",
};

export const how = {
  title: "Como reservar",
  steps: [
    { n: "1", title: "Escolha", text: "Veja os passeios e pacotes e fique com o que combina com a sua viagem." },
    { n: "2", title: "Reserve", text: "Escolha a data, o horário e quantas pessoas viajam. Você vê o preço total na hora." },
    { n: "3", title: "Pague e pronto", text: "Pague com Pix e receba a confirmação. Qualquer dúvida, respondemos pelo WhatsApp." },
  ],
};

export const faq = {
  title: "Perguntas frequentes",
  items: [
    { q: "Como reservo um passeio ou um show?", a: "Abra o passeio, toque em Reservar e escolha a data, o horário e quantas pessoas viajam. Você paga com Pix e recebe a confirmação. Se preferir, fale com a gente pelo WhatsApp." },
    { q: "Vocês buscam no hotel?", a: "Os tours pela cidade e pelo Delta do Tigre saem do seu hotel. Nos shows de tango, o traslado depende do setor escolhido." },
    { q: "Os preços do site são finais?", a: "Os preços são por pessoa. Ao reservar online, você vê o valor total (com a opção escolhida e os menores, se houver) antes de pagar." },
    { q: "Qual é a diferença entre passeio e pacote?", a: "Um passeio (ou serviço) é uma única experiência: um show, um city tour, um traslado. Um pacote junta vários deles em uma só reserva, com preço melhor do que comprando separado." },
    { q: "Como pago?", a: "Na reserva online, com Pix. Para outras formas de pagamento, fale com a gente pelo WhatsApp." },
    { q: "Onde vocês ficam?", a: "Florida 537, Local 356, C1005 Cidade Autônoma de Buenos Aires. Telefone +54 11 6419-9083." },
  ],
};

export const finalCta = {
  title: "Vamos montar a sua viagem?",
  lead: "Conte as suas datas e quantas pessoas viajam.",
  label: "Fale com a gente no WhatsApp",
};

// Franja de confianza bajo la portada (tarjeta que se superpone a la foto). "icon" elige el ícono en Trust.astro; "badge" es la cifra destacada.
// Cifra de clientes: dato aportado por la agencia (+100.000). Si cambia, se edita acá.
export const trust = [
  { icon: "calendar", k: "Desde 2006", v: "20 anos montando viagens em Buenos Aires.", badge: "" },
  { icon: "pin", k: "No coração do centro", v: "Visite-nos na Calle Florida 537, Local 356.", badge: "" },
  { icon: "people", k: "Atendimento pessoal", v: "Mais de 100.000 clientes já viajaram com a gente. Respondemos pelo WhatsApp, do começo ao fim.", badge: "+100.000 clientes" },
  { icon: "tag", k: "Preço claro", v: "Você vê o valor total antes de pagar. Sem surpresas.", badge: "" },
];
