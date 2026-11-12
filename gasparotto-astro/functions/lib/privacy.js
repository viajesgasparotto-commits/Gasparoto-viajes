// Política de privacidade (/privacidade/). Pedida pela Meta para publicar a app do WhatsApp; também é o link do banner de cookies.
import { BRAND, initBrand } from "./seo.js";
const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function privacyPage(env) {
  initBrand(env);
  const b = e(BRAND || "Gasparotto Viajes"), wa = String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const waLink = wa ? `<a href="https://wa.me/${wa}">WhatsApp +${wa}</a>` : "WhatsApp";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de privacidade | ${b}</title><meta name="robots" content="index,follow"><link rel="canonical" href="/privacidade/">
<style>body{margin:0;background:#f6f7fb;color:#1c2333;font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:760px;margin:0 auto;padding:40px 16px 64px}h1{font-size:30px;line-height:1.2;margin:0 0 6px}h2{font-size:19px;margin:28px 0 6px}p,li{margin:6px 0}a{color:#0066a9}.u{color:#6b7390;font-size:14px}</style></head><body><main>
<p><a href="/">← ${b}</a></p><h1>Política de privacidade</h1><p class="u">Última atualização: 12 de novembro de 2026</p>
<p>Esta política explica como a ${b}, agência de turismo receptivo em Buenos Aires, Argentina, trata os dados pessoais de quem usa o nosso site e fala conosco pelo WhatsApp.</p>
<h2>Quais dados coletamos</h2><ul><li>Dados que você nos informa: nome, telefone, e-mail, datas, número de pessoas e detalhes da reserva.</li><li>Mensagens que você nos envia pelo WhatsApp ou pelo formulário do site.</li><li>Dados do pagamento necessários para confirmar a reserva (não guardamos dados de cartão).</li><li>Dados técnicos de navegação, apenas se você aceitar os cookies de medição.</li></ul>
<h2>Para que usamos</h2><ul><li>Responder às suas consultas, recomendar passeios e gerenciar reservas e pagamentos.</li><li>Enviar informações sobre a sua reserva.</li><li>Melhorar o nosso atendimento e o site.</li></ul>
<h2>Atendimento com inteligência artificial</h2><p>No WhatsApp, as primeiras respostas podem ser dadas por um assistente virtual com inteligência artificial, que usa apenas as informações dos nossos passeios. Para gerar as respostas, o texto das mensagens é processado por um provedor de IA (Google ou Anthropic) como prestador de serviço. A qualquer momento você pode pedir para falar com uma pessoa da equipe.</p>
<h2>Com quem compartilhamos</h2><p>Não vendemos seus dados. Compartilhamos apenas o necessário com prestadores que nos ajudam a operar: Meta (WhatsApp), provedores de pagamento, hospedagem do site (Cloudflare), provedores de IA e guias ou parceiros que realizam o passeio contratado.</p>
<h2>Por quanto tempo guardamos</h2><p>Pelo tempo necessário para atender você e cumprir obrigações legais e contábeis. Depois, os dados são apagados ou anonimizados.</p>
<h2>Seus direitos</h2><p>Você pode pedir acesso, correção ou exclusão dos seus dados, conforme a Lei 25.326 da Argentina e, no que for aplicável, a LGPD do Brasil.</p>
<h2>Exclusão de dados</h2><p>Para pedir a exclusão dos seus dados e das conversas, envie uma mensagem para ${waLink} com o texto “Excluir meus dados”. Respondemos em até 10 dias úteis.</p>
<h2>Contato</h2><p>${b} · Buenos Aires, Argentina · ${waLink}</p>
</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
