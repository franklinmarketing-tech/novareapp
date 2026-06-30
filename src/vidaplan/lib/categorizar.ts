// Classificador heurístico de transações do Open Finance em categorias de orçamento.
// Mapeia a descrição da transação numa categoria canônica e a categoria do usuário
// (pelo nome) na mesma canônica, para somar o "realizado" automaticamente.

export type Canon =
  | "supermercado" | "habitacao" | "contas" | "veiculo" | "saude"
  | "educacao" | "restaurantes" | "lazer" | "cuidados" | "vestuario" | "outros";

export const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[0-9*#.\-/]/g, " ").replace(/\s+/g, " ").trim();

// Regras por descrição da transação (ordem importa: mais específico primeiro).
const REGRAS: [Canon, RegExp][] = [
  ["saude", /farmac|drogaria|drogasil|pacheco|\braia\b|hospital|clinic|laborator|\bmedic|dentista|odonto|unimed|\bamil\b|hapvida|psicolog|\bexame/],
  ["educacao", /escola|faculdade|universidade|colegio|\bcurso\b|mensalidade|kumon|wizard|udemy|alura|\bfisk\b|livraria|papelaria/],
  ["supermercado", /mercado|supermerc|hipermerc|atacad|assai|carrefour|pao de acucar|\bextra\b|\bsams\b|hortifruti|sacolao|acougue|quitanda/],
  ["restaurantes", /restaurante|lanchon|ifood|rappi|mcdonald|burger|\bbk\b|pizza|\bbar\b|\bcafe|starbucks|outback|subway|habib|spoleto|padaria/],
  ["veiculo", /\bposto\b|gasolina|combustiv|\bshell\b|ipiranga|petrobr|\buber\b|\b99\b|\btaxi\b|estacionament|pedagio|sem parar|conectcar|\bveloe\b|\bipva\b|oficina|mecanic|autopecas|seguro auto|detran|\bmetro\b|\bbrt\b|\bonibus\b/],
  ["lazer", /cinema|netflix|spotify|\bprime\b|disney|\bhbo\b|\bmax\b|globoplay|deezer|viagem|\bhotel\b|airbnb|decolar|booking|\blatam\b|\bgol\b|\bazul\b|ingresso|\bshow\b|\bparque\b|academia|smartfit|bio ritmo|playstation|\bsteam\b|\bxbox\b|nintendo/],
  ["cuidados", /\bsalao\b|cabelo|barbear|manicure|estetica|cosmetic|sephora|boticario|\bnatura\b|\bavon\b|\bspa\b|perfumaria/],
  ["vestuario", /\broupa|calcado|\brenner\b|riachuelo|\bc&a\b|\bcea\b|\bzara\b|\bnike\b|adidas|marisa|pernambucanas|hering|centauro/],
  ["habitacao", /aluguel|condominio|imobiliar|prestacao.*(casa|imovel)|financiamento.*imov|\biptu\b/],
  ["contas", /energia|\bluz\b|\benel\b|\bcpfl\b|\blight\b|cemig|copel|equatorial|\bagua\b|sabesp|sanepar|caesb|\bgas\b|comgas|internet|\bvivo\b|\bclaro\b|\btim\b|\bnet\b|telefon|conta de/],
];

export function classificar(descricao: string): Canon {
  const d = norm(descricao);
  for (const [canon, rx] of REGRAS) if (rx.test(d)) return canon;
  return "outros";
}

// Liga o NOME da categoria do usuário a uma canônica.
const SINONIMOS: [Canon, RegExp][] = [
  ["supermercado", /mercado|supermerc|aliment|feira|compras de casa/],
  ["habitacao", /habit|moradia|aluguel|\bcasa\b|imovel|condominio/],
  ["contas", /\bconta|\bluz\b|\bagua\b|energia|internet|telefone|utilidad/],
  ["veiculo", /veicul|\bcarro\b|\bauto\b|transporte|combustiv|gasolina|mobilidad/],
  ["saude", /saude|\bmedic|farmac|plano de saude/],
  ["educacao", /educa|escola|faculdade|\bcurso|estudo/],
  ["restaurantes", /restaurante|delivery|ifood|lanche|comer fora|alimentacao fora/],
  ["lazer", /lazer|entreteni|viagem|streaming|diversao|hobbie/],
  ["cuidados", /cuidado|pessoal|beleza|estetica|\bsalao/],
  ["vestuario", /vestu|roupa|\bmoda\b/],
];

export function canonDaCategoria(nome: string): Canon | null {
  const d = norm(nome);
  for (const [canon, rx] of SINONIMOS) if (rx.test(d)) return canon;
  return null;
}
