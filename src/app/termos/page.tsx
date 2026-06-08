import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnóstico PontoFinal – Termos de Utilização",
  description: "As regras de utilização do serviço de diagnóstico de perfis Google Maps da PontoFinal.",
};

export default function Termos() {
  const h2Class = "text-xl font-semibold text-foreground mt-10 mb-4";
  const pClass = "text-sm text-muted leading-relaxed mb-4";
  const liClass = "text-sm text-muted leading-relaxed mb-2";

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termos de Utilização</h1>
        <p className="text-xs text-muted-dim mb-8">Última atualização: 5 de Junho de 2026</p>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <p className={pClass}>Ao utilizar o Diagnóstico PontoFinal, concorda com estes termos. Se não concordar, não utilize o serviço.</p>

          <h2 className={h2Class}>1. O serviço</h2>
          <p className={pClass}>O Diagnóstico PontoFinal é uma ferramenta automática de diagnóstico de perfis no Google Maps, que usa dados públicos e análise por inteligência artificial. A pontuação e as recomendações são orientativas e não constituem consultoria profissional formal.</p>

          <h2 className={h2Class}>2. Uso aceitável</h2>
          <ul className="list-disc pl-5 space-y-1 mb-5">
            <li className={liClass}>Só pode analisar perfis do Google Maps em que tenha interesse legítimo (o seu próprio perfil ou de empresa que representa).</li>
            <li className={liClass}>Não pode usar a ferramenta para matéria competitiva desleal, abuso de limites, scraping automatizado ou outro uso comercial não autorizado.</li>
          </ul>

          <h2 className={h2Class}>3. Gratuidade e limites</h2>
          <p className={pClass}>Cada empresa ou perfil pode ser auditado gratuitamente uma vez. Auditorias adicionais podem ser disponibilizadas mediante contacto comercial. Reservamo-nos o direito de alterar limites futuramente.</p>

          <h2 className={h2Class}>4. Precisão dos dados</h2>
          <p className={pClass}>Os resultados dependem da precisão dos dados públicos do Google Maps e da interpretação automática. Não nos responsabilizamos por imprecisões provenientes de dados públicos incorretos ou desatualizados. A pontuação é uma estimativa calculada automaticamente.</p>

          <h2 className={h2Class}>5. Propriedade intelectual</h2>
          <p className={pClass}>Relatórios gerados podem ser descarregados em PDF e partilhados internamente. Não podem ser revendidos ou comercializados como produto sem prévia autorização.</p>

          <h2 className={h2Class}>6. Alterações e resiliência</h2>
          <p className={pClass}>Podemos alterar estes termos a qualquer momento. Usos significativos serão comunicados por e-mail a utilizadores registados.</p>

          <h2 className={h2Class}>7. Contacto em caso de dúvida</h2>
          <p className={pClass}><strong className="text-foreground">Email:</strong> <strong className="text-primary">geral@pontofinal.site</strong></p>
        </div>
      </div>
    </div>
  );
}
