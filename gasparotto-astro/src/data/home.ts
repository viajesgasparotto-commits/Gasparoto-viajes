// Contenido de la portada (en portugués de Brasil: el 99% del público es brasileño). Para cambiar textos de la home se edita solo este archivo.
export const meta = {
  title: "Gasparotto Viajes | Tango, city tour e passeios em Buenos Aires",
  description:
    "Reserve shows de tango, city tour, Delta do Tigre e passeios em Buenos Aires com atendimento personalizado pelo WhatsApp. Agência de viagens em Buenos Aires.",
};

export const hero = {
  lines: ["Buenos Aires,", "sob medida."],
  sub: "Shows de tango, city tour e passeios montados de acordo com as suas datas e o seu jeito de viajar.",
  secondary: { label: "Ver experiências", href: "#paquetes" },
  proof: "Respondemos pelo WhatsApp. Agência em Buenos Aires desde 2006.",
};

export const intents = {
  title: "O que você quer viver?",
  tiles: [
    { icon: "tango", title: "Quero tango", text: "Jantar show e espetáculos em teatros históricos.", cta: "Ver shows", tone: "rose", img: "/assets/tango.webp", alt: "Casal dançando tango em um salão com cortinas de veludo e orquestra ao vivo", pos: "74% 50%", href: "/paquetes/categoria/show-de-tango/" },
    { icon: "city", title: "Quero conhecer a cidade", text: "Roteiros guiados pelos bairros e pontos principais.", cta: "Ver city tour", tone: "blue", img: "/assets/city-tour.webp", alt: "Puerto Madero, o Obelisco e La Boca ao entardecer", pos: "62% 50%", href: "/paquetes/categoria/city-tour/" },
    { icon: "delta", title: "Descubra Nossos Passeios", text: "Delta do Tigre, vinícolas e passeios de um dia.", cta: "Ver passeios", tone: "teal", img: "/assets/delta.webp", alt: "Lancha de madeira navegando pelo Delta do Tigre ao entardecer", pos: "72% 50%", href: "/paquetes/categoria/paseos/" },
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
  lead: "Consulte a disponibilidade para as suas datas; o preço final é confirmado pelo WhatsApp.",
};

export const how = {
  title: "Como reservar",
  steps: [
    { n: "1", title: "Escolha", text: "Veja as experiências e fique com a que combina melhor com a sua viagem." },
    { n: "2", title: "Consulte", text: "Informe a data e quantas pessoas viajam. Respondemos pelo WhatsApp." },
    { n: "3", title: "Confirme", text: "Enviamos a disponibilidade e o preço final. Se estiver tudo certo, deixamos reservado." },
  ],
};

export const faq = {
  title: "Perguntas frequentes",
  items: [
    { q: "Como reservo um passeio ou um show?", a: "Escolha a experiência e fale com a gente pelo WhatsApp informando a data e quantas pessoas viajam. Confirmamos a disponibilidade e o preço antes de reservar." },
    { q: "Vocês buscam no hotel?", a: "Os tours pela cidade e pelo Delta do Tigre saem do seu hotel. Nos shows de tango, o traslado depende do setor escolhido." },
    { q: "Os preços do site são finais?", a: "Os preços publicados são por pessoa e servem como referência. Podem variar conforme a data, o setor escolhido e o número de viajantes, por isso confirmamos o valor final pelo WhatsApp antes de reservar." },
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
  { icon: "tag", k: "Preço final claro", v: "Confirmamos o valor total antes de você reservar. Sem surpresas.", badge: "" },
];
