import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnóstico PontoFinal – Política de Privacidade",
  description: "Como tratamos os seus dados pessoais no Diagnóstico PontoFinal. Transparência, segurança e conformidade com o RGPD.",
};

export default function Privacidade() {
  const h2Class = "text-xl font-semibold text-foreground mt-10 mb-4";
  const pClass = "text-sm text-muted leading-relaxed mb-4";
  const liClass = "text-sm text-muted leading-relaxed mb-2";

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-xs text-muted-dim mb-8">Última atualização: 5 de Junho de 2026</p>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <p className={pClass}>
            O Diagnóstico PontoFinal valoriza a sua privacidade. Temos o compromisso de proteger os seus
            dados e usá-los apenas para lhe dar uma análise clara do seu perfil no Google Maps.
          </p>

          <h2 className={h2Class}>1. Que dados recolhemos?</h2>
          <ul className="list-disc pl-5 space-y-1 mb-5">
            <li className={liClass}><strong className="text-foreground">Dados de contacto:</strong> nome, e-mail e WhatsApp quando submete o formulário (apenas para desbloquear o relatório).</li>
            <li className={liClass}><strong className="text-foreground">Dados do perfil:</strong> o link do Google Maps que fornecer e as informações públicas por ele acessíveis (nome da empresa, avaliações, classificação, fotos).</li>
            <li className={liClass}><strong className="text-foreground">Dados técnicos:</strong> endereço IP temporário durante a análise, mantido em memória e nunca guardado permanentemente.</li>
          </ul>

          <h2 className={h2Class}>2. Para que usamos os dados?</h2>
          <ul className="list-disc pl-5 space-y-1 mb-5">
            <li className={liClass}>Gerar o relatório de auditoria personalizado.</li>
            <li className={liClass}>Enviar o resumo por e-mail (se ativado).</li>
            <li className={liClass}>Contacto futuro sobre a auditoria, única e exclusivamente se solicitado.</li>
          </ul>

          <h2 className={h2Class}>3. Quanto tempo guardamos os dados?</h2>
          <p className={pClass}>Os seus dados de lead são guardados até 12 meses ou até pedir remoção. Os resultados da auditoria são eliminados automaticamente após 30 dias.</p>

          <h2 className={h2Class}>4. Os seus direitos (RGPD)</h2>
          <ul className="list-disc pl-5 space-y-1 mb-5">
            <li className={liClass}><strong className="text-foreground">Acesso:</strong> saber que dados temos sobre si.</li>
            <li className={liClass}><strong className="text-foreground">Retificação:</strong> corrigir informações.</li>
            <li className={liClass}><strong className="text-foreground">Eliminação:</strong> pedir para apagarmos os seus dados.</li>
            <li className={liClass}><strong className="text-foreground">Portabilidade:</strong> transferir dados para outro fornecedor.</li>
          </ul>
          <p className={pClass}>Para exercer os seus direitos, envie um e-mail para <strong className="text-primary">geral@pontofinal.site</strong> com assunto «RGPD».</p>

          <h2 className={h2Class}>5. Segurança</h2>
          <p className={pClass}>Usamos encriptação TLS/SSL em todas as comunicações. O site é servido pela rede da Cloudflare e os e-mails são enviados através do Resend. Sempre que aplicável, recorremos às cláusulas contratuais-tipo da Comissão Europeia para transferências internacionais de dados.</p>

          <h2 className={h2Class}>6. Cookies</h2>
          <p className={pClass}>Utilizamos apenas cookies essenciais para o funcionamento do site e Google Analytics (anonimizado). Não usamos cookies de terceiros para publicidade.</p>

          <h2 className={h2Class}>7. Contactos</h2>
          <p className={pClass}>Se tiver questões sobre esta política:</p>
          <p className="text-sm text-muted">Diagnóstico PontoFinal — pontofinal.site<br/>Email: <strong className="text-primary">geral@pontofinal.site</strong><br/>WhatsApp: +351 915 136 439<br/></p>
        </div>
      </div>
    </div>
  );
}
