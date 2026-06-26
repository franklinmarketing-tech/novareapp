import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, Globe, ShieldCheck } from "lucide-react";
import logoBranca from "@/assets/logo-branca.png";
import jeffersonImg from "@/assets/jefferson.png";
import leonardoImg from "@/assets/leonardo.png";

interface Props {
  /** Frase do banner (acima do botão). */
  intro?: string;
}

/**
 * Banner dos sócios-fundadores + rodapé profissional.
 * Reutilizado em todas as ferramentas públicas da Novare (Simulador,
 * Calculadora de Aposentadoria, etc.) para manter consistência visual.
 */
export const NovareToolFooter = ({
  intro = "Simular é só o primeiro passo. Fale diretamente com os sócios-fundadores e receba uma análise personalizada para os seus objetivos de vida.",
}: Props) => {
  return (
    <>
      {/* Banner CTA — sócios-fundadores da Novare */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-novare-blue shadow-sm">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-novare-blue-bright/20 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center p-8 sm:p-10">
            <div>
              <p className="text-novare-blue-bright text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Novare Wealth · Consultoria de Investimentos</p>
              <h2 className="text-2xl sm:text-[2rem] font-display font-bold text-white leading-tight">
                Construindo seu futuro financeiro com clareza e propósito
              </h2>
              <p className="text-white/80 mt-3 text-sm sm:text-base leading-relaxed">{intro}</p>
              <Button asChild className="mt-6 bg-white text-novare-blue hover:bg-white/90 font-bold gap-2 h-12 px-7">
                <a href="https://wa.me/5519983402827?text=Quero%20uma%20an%C3%A1lise%20da%20Novare" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Falar com a Novare
                </a>
              </Button>
            </div>

            <div className="flex items-end justify-center md:justify-end gap-5 sm:gap-6">
              {[
                { img: jeffersonImg, name: "Jefferson Freitas", role: "Sócio-fundador · CEA" },
                { img: leonardoImg, name: "Leonardo Oliveira", role: "Sócio-fundador · CEA" },
              ].map((f) => (
                <figure key={f.name} className="text-center">
                  <img src={f.img} alt={f.name} className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover ring-2 ring-white/25 shadow-lg" loading="lazy" />
                  <figcaption className="mt-2.5">
                    <p className="text-white font-bold text-[13px] leading-tight">{f.name}</p>
                    <p className="text-white/55 text-[10px] uppercase tracking-wide mt-0.5">{f.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer profissional */}
      <footer className="bg-novare-blue text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img src={logoBranca} alt="Novare" className="h-8 w-auto" />
              <p className="text-sm text-white/60 mt-4 leading-relaxed">
                Consultoria de investimentos independente. Planejamento financeiro, alocação e acompanhamento contínuo para os seus objetivos de vida.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Ferramentas</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="/ferramentas/simulador-de-renda-fixa" className="hover:text-white transition-colors">Simulador de Renda Fixa</a></li>
                <li><a href="/ferramentas/calculadora-de-aposentadoria" className="hover:text-white transition-colors">Calculadora de Aposentadoria</a></li>
                <li><a href="/ferramentas/calculadora-de-investimentos" className="hover:text-white transition-colors">Calculadora de Investimentos</a></li>
                <li><a href="/objetivos-de-vida" className="hover:text-white transition-colors">Objetivos de Vida</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Institucional</h4>
              <ul className="space-y-2 text-sm text-white/75">
                <li><a href="/termos" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Fale com a gente</h4>
              <ul className="space-y-2.5 text-sm text-white/75">
                <li><a href="https://wa.me/5519983402827" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="h-4 w-4 shrink-0" /> (19) 98340-2827</a></li>
                <li><a href="mailto:contato@novareapp.com.br" className="flex items-center gap-2 hover:text-white transition-colors"><Mail className="h-4 w-4 shrink-0" /> contato@novareapp.com.br</a></li>
                <li><a href="https://novareapp.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><Globe className="h-4 w-4 shrink-0" /> novareapp.com.br</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-white/50">© {new Date().getFullYear()} Novare Consultoria de Investimentos. Todos os direitos reservados.</p>
            <p className="text-[11px] text-white/45 flex items-start gap-1.5 max-w-md sm:text-right leading-relaxed">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
              Conteúdo educacional. Não constitui recomendação ou oferta de investimento. Rentabilidade passada não garante resultados futuros.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default NovareToolFooter;
