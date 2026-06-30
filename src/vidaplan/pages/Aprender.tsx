// Central de Educação — explica o Método Horizonte e os termos do plano. Gera confiança.
import { useState } from "react";
import { Link } from "react-router-dom";
import { VPCard, VPTitle } from "../components/ui";
import { Target, Sunrise, Sparkles, Gauge, TrendingUp, ChevronDown, MessageCircle } from "lucide-react";

const PASSOS = [
  { icon: Target, cor: "#16314f", t: "1. O Marco Horizonte", d: "É o seu número único: tudo que o seu projeto de vida exige — a independência financeira somada a todos os seus sonhos — a valor de hoje. Em vez de vários números soltos, um só pra você mirar." },
  { icon: Sunrise, cor: "#C8643F", t: "2. Independência", d: "O patrimônio que sustenta a renda que você quer, sem depender do trabalho. Calculamos quanto você precisa ter para sacar essa renda da idade da independência até a expectativa de vida." },
  { icon: Sparkles, cor: "#2F8F6B", t: "3. Sonhos", d: "Viagens, casa, carro, educação, um negócio… tudo que você quer realizar entra na conta, no ano em que acontece (ou todo ano, se for recorrente). Sonho não realizado não é plano." },
  { icon: Gauge, cor: "#8E6BC8", t: "4. Viabilidade e alavancas", d: "Comparamos o que você terá com o que precisa. Se faltar, mostramos 4 caminhos pra fechar: adiar a independência, buscar mais rentabilidade, poupar mais ou ajustar a meta." },
  { icon: TrendingUp, cor: "#3FA0A0", t: "5. Tudo a valor de hoje", d: "Trabalhamos em poder de compra de hoje (já descontando a inflação). Por isso a rentabilidade é \"IPCA + X%\": o ganho real, acima da inflação. Assim os números fazem sentido pra sua vida." },
];

const GLOSSARIO = [
  ["IPCA + X%", "Rentabilidade real: o quanto seu dinheiro rende acima da inflação. É o que de fato aumenta seu poder de compra."],
  ["Renda passiva", "Renda gerada pelo seu patrimônio (juros, dividendos, aluguéis) sem você precisar trabalhar por ela."],
  ["Reserva de emergência", "De 3 a 6 meses do seu custo guardados em liquidez — o colchão pra imprevistos, antes de investir no longo prazo."],
  ["PGBL × VGBL", "Planos de previdência. PGBL abate até 12% da renda tributável (quem faz declaração completa); VGBL é melhor pra quem usa a declaração simplificada."],
  ["ITCMD", "Imposto estadual sobre herança e doação. Entra no planejamento de sucessão para a família não ser pega de surpresa."],
];

const Aprender = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <VPTitle hint="Entenda o Método Horizonte e fale a mesma língua do seu plano.">📚 Como funciona</VPTitle>

      <div className="space-y-3">
        {PASSOS.map((p, i) => (
          <VPCard key={i} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.cor}1a` }}>
                <p.icon className="h-5 w-5" style={{ color: p.cor }} />
              </div>
              <div>
                <p className="font-display text-base font-bold text-[#16314f]">{p.t}</p>
                <p className="text-sm text-[#1b2a3d]/65 mt-0.5">{p.d}</p>
              </div>
            </div>
          </VPCard>
        ))}
      </div>

      {/* Glossário */}
      <div>
        <p className="font-display text-base font-bold text-[#16314f] mb-2">Glossário rápido</p>
        <div className="space-y-2">
          {GLOSSARIO.map(([termo, def], i) => (
            <VPCard key={i} className="overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="font-semibold text-[#16314f] text-sm">{termo}</span>
                <ChevronDown className={`h-4 w-4 text-[#1b2a3d]/40 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-4 pb-3 text-sm text-[#1b2a3d]/65">{def}</p>}
            </VPCard>
          ))}
        </div>
      </div>

      {/* CTA */}
      <VPCard className="p-5 bg-[#16314f] text-white">
        <p className="font-display text-lg font-bold">Pronto pra montar o seu?</p>
        <p className="text-sm text-white/60 mt-1 mb-4">Comece pelos seus sonhos — o resto o plano calcula pra você.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/vidaplan/app/sonhos" className="inline-flex items-center gap-1.5 rounded-xl bg-[#E29578] px-4 py-2.5 text-sm font-semibold text-[#16314f] hover:bg-[#eaa98e]">
            <Sparkles className="h-4 w-4" /> Meus Sonhos
          </Link>
          <Link to="/vidaplan/app/assistente" className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/10">
            <MessageCircle className="h-4 w-4" /> Perguntar à IA Novare
          </Link>
        </div>
      </VPCard>
    </div>
  );
};

export default Aprender;
