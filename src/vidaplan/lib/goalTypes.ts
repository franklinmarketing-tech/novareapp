// Catálogo de tipos de objetivo (emoji, rótulo, cor, recorrência) — fonte única
// usada por Meus Sonhos, Linha da Vida e demais telas.
import type { GoalType } from "@/lib/lifeplan";

export type TipoMeta = { tipo: GoalType; label: string; emoji: string; cor: string; recorrentePadrao?: boolean; desc: string };

export const TIPOS: TipoMeta[] = [
  { tipo: "viagens", label: "Viagens e lazer", emoji: "✈️", cor: "#5B8DB8", recorrentePadrao: true, desc: "Gasto que se repete todo ano até a independência." },
  { tipo: "festas", label: "Festas e presentes", emoji: "🎁", cor: "#C84F6B", recorrentePadrao: true, desc: "Datas comemorativas e presentes, ano após ano." },
  { tipo: "imovel", label: "Imóvel", emoji: "🏠", cor: "#2F8F6B", desc: "Compra à vista ou financiada, num ano específico." },
  { tipo: "carro", label: "Veículo", emoji: "🚗", cor: "#16314f", desc: "Compra com troca periódica (a cada X anos)." },
  { tipo: "educacao", label: "Educação", emoji: "🎓", cor: "#8E6BC8", desc: "Faculdade, pós ou cursos — num ano ou todo ano." },
  { tipo: "saude", label: "Saúde e bem-estar", emoji: "🏥", cor: "#0E7C86", desc: "Procedimentos, tratamentos e cuidados." },
  { tipo: "casamento", label: "Casamento", emoji: "💍", cor: "#C8643F", desc: "A festa e tudo que envolve o grande dia." },
  { tipo: "reforma", label: "Reforma da casa", emoji: "🛠️", cor: "#B08537", desc: "Obras e melhorias no seu imóvel." },
  { tipo: "filhos", label: "Filhos", emoji: "👶", cor: "#D98695", desc: "A chegada e a criação dos filhos." },
  { tipo: "intercambio", label: "Intercâmbio", emoji: "🌍", cor: "#3E7CB1", desc: "Estudar ou morar fora por um período." },
  { tipo: "negocio", label: "Abrir um negócio", emoji: "💼", cor: "#1F6F54", desc: "Capital para tirar a empresa do papel." },
  { tipo: "doacao", label: "Doação / causa", emoji: "🤝", cor: "#8A6FB0", recorrentePadrao: true, desc: "Apoiar uma causa de forma recorrente ou pontual." },
  { tipo: "outro", label: "Outro objetivo", emoji: "⭐", cor: "#E2A03F", desc: "Crie o seu — dê o nome e o valor que quiser." },
];

export const FALLBACK = TIPOS[TIPOS.length - 1];
export const metaTipo = (t: GoalType) => TIPOS.find((x) => x.tipo === t) || FALLBACK;
