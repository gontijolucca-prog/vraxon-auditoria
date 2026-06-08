// Gera o guia "5 erros no Google Maps" como asset estático (PT-PT, AO90).
// Texto puro com jsPDF (sem canvas) → corre em Node e o PDF é servido de /public.
// Correr: node scripts/build-guide-pdf.mjs
import { jsPDF } from "jspdf";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RED = [255, 42, 42];
const INK = [5, 5, 5];
const GREY = [90, 90, 90];

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const M = 18; // margem
const CW = W - M * 2; // largura de conteúdo
let y = 0;

function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
function ensure(space) {
  if (y + space > H - 22) { footer(); doc.addPage(); y = M + 6; }
}
function footer() {
  const fy = H - 12;
  doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
  doc.line(M, fy - 4, W - M, fy - 4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); setColor(GREY);
  doc.text("Diagnóstico PontoFinal · pontofinal.site", M, fy);
  doc.text("Marca já a tua reunião em pontofinal.site", W - M, fy, { align: "right" });
}

// ── Capa ──
doc.setFillColor(INK[0], INK[1], INK[2]);
doc.rect(0, 0, W, 52, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(255, 255, 255);
doc.text("PontoFinal", M, 26);
doc.setTextColor(RED[0], RED[1], RED[2]);
doc.text(".", M + doc.getTextWidth("PontoFinal"), 26);
doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
doc.text("DIAGNÓSTICO · GOOGLE MAPS", M, 36);

y = 72;
doc.setFont("helvetica", "bold"); doc.setFontSize(24); setColor(INK);
const title = doc.splitTextToSize("5 erros que afastam clientes do seu Google Maps", CW);
doc.text(title, M, y); y += title.length * 10 + 4;

doc.setFont("helvetica", "normal"); doc.setFontSize(12); setColor(GREY);
const sub = doc.splitTextToSize(
  "Um guia rápido e honesto: os erros mais comuns nos perfis de negócios locais — e como corrigir cada um hoje mesmo, sem gastar dinheiro.",
  CW
);
doc.text(sub, M, y); y += sub.length * 6 + 8;

doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(1.5);
doc.line(M, y, M + 40, y); y += 14;

const erros = [
  {
    t: "Perfil incompleto",
    p: "Sem fotografias, sem horário ou com a categoria errada, o perfil transmite menos confiança e aparece menos nas pesquisas. É o erro nº1 — e o mais fácil de resolver.",
    fix: "Adicione fotos reais do espaço, equipa e trabalhos; preencha o horário; escolha a categoria principal certa e as secundárias.",
  },
  {
    t: "Não responder a avaliações",
    p: "Quem ainda está a decidir lê as respostas do dono. Não responder — nem às boas nem às más — passa a ideia de um negócio ausente.",
    fix: "Responda a todas as avaliações com educação e em poucas linhas. Nas negativas, agradeça, assuma e proponha resolver em privado.",
  },
  {
    t: "Poucas avaliações recentes",
    p: "Um perfil com avaliações antigas parece parado. A data conta tanto como a nota: avaliações recentes mostram que o negócio está vivo.",
    fix: "Peça uma avaliação a cada cliente satisfeito. Facilite com um link direto ou um código QR no balcão. Sem comprar avaliações.",
  },
  {
    t: "Informação desatualizada",
    p: "Horário errado, morada antiga ou telefone que já não atende fazem perder o cliente no momento exato em que ele queria comprar.",
    fix: "Reveja morada, telefone, site e horários (incluindo feriados). Confirme que o botão de chamada e as direções funcionam no telemóvel.",
  },
  {
    t: "Descrição e categoria mal escolhidas",
    p: "Se o perfil não usa as palavras que os clientes escrevem na pesquisa, o Google mostra-o menos. Muitos negócios descrevem-se de forma genérica.",
    fix: "Escreva a descrição com os serviços e a zona que serve, nas palavras que um cliente usaria. Acerte a categoria à atividade principal.",
  },
];

erros.forEach((e, i) => {
  ensure(46);
  // número em caixa vermelha
  doc.setFillColor(RED[0], RED[1], RED[2]);
  doc.rect(M, y - 5, 9, 9, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text(String(i + 1), M + 4.5, y + 1.5, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); setColor(INK);
  doc.text(e.t, M + 13, y + 1.5); y += 11;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); setColor(GREY);
  const pp = doc.splitTextToSize(e.p, CW); doc.text(pp, M, y); y += pp.length * 5.4 + 2;

  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); setColor(RED);
  doc.text("COMO CORRIGIR", M, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); setColor(INK);
  const ff = doc.splitTextToSize(e.fix, CW); doc.text(ff, M, y); y += ff.length * 5.4 + 10;
});

// ── Fecho / CTA ──
ensure(50);
doc.setFillColor(INK[0], INK[1], INK[2]);
doc.rect(M, y, CW, 34, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
doc.text("Quer ajuda para corrigir tudo isto?", M + 6, y + 12);
doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
const cta = doc.splitTextToSize(
  "Fazemos o diagnóstico ao vivo do seu perfil e tratamos das correções consigo. Marque uma reunião em pontofinal.site.",
  CW - 12
);
doc.text(cta, M + 6, y + 20);
y += 34;

footer();

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../public/guia-5-erros-google-maps.pdf");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(doc.output("arraybuffer")));
console.log("OK →", out);
