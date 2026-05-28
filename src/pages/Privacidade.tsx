import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export const PRIVACY_VERSION = "2026-05-28";

const Privacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-10 px-4">
      <SEO
        title="Política de Privacidade · Novare"
        description="Política de Privacidade da plataforma Novare Consultoria Financeira em conformidade com a LGPD."
        canonicalPath="/privacidade"
      />
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <span className="text-xs text-muted-foreground">
            Versão {PRIVACY_VERSION}
          </span>
        </div>

        <Card className="shadow-md">
          <CardContent className="p-6 sm:p-10">
            <h1 className="text-2xl font-bold mb-4">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A presente Política de Privacidade descreve como a <strong>Novare Consultoria
              Financeira</strong> ("Novare", "nós") coleta, utiliza, armazena, compartilha e
              protege os dados pessoais dos seus Usuários, em conformidade com a
              <strong> Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">1. Controlador dos Dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Novare é a <strong>controladora</strong> dos dados pessoais coletados por meio
              da plataforma. O Usuário poderá entrar em contato com o nosso Encarregado pelo
              Tratamento de Dados (DPO) através do e-mail
              {" "}
              <a href="mailto:encarregado@novareapp.com.br" className="text-primary hover:underline">
                encarregado@novareapp.com.br
              </a>
              .
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">2. Dados Pessoais Coletados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Coletamos as seguintes categorias de dados:
            </p>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li><strong>Identificação:</strong> nome completo, CPF, data de nascimento, estado civil.</li>
              <li><strong>Contato:</strong> e-mail, telefone, endereço.</li>
              <li><strong>Financeiros:</strong> renda, despesas, dívidas, investimentos, patrimônio,
                  metas e objetivos financeiros.</li>
              <li><strong>Profissionais:</strong> profissão, empresa, vínculo empregatício.</li>
              <li><strong>Familiares:</strong> dados de dependentes (somente quando informados pelo Usuário).</li>
              <li><strong>Comportamentais:</strong> registros de uso da plataforma, lançamentos
                  mensais, evolução patrimonial.</li>
              <li><strong>Técnicos:</strong> endereço IP, dispositivo, sistema operacional,
                  navegador e cookies essenciais.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-2">3. Finalidades do Tratamento</h2>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li>Prestar o serviço de consultoria financeira por meio do consultor parceiro designado.</li>
              <li>Permitir a autenticação e o acesso seguro à plataforma.</li>
              <li>Gerar diagnósticos, pareceres, planos de ação e relatórios personalizados.</li>
              <li>Comunicar atualizações de serviço, suporte e comunicações relacionadas à conta.</li>
              <li>Cumprir obrigações legais, regulatórias, contratuais e ordens de autoridades competentes.</li>
              <li>Garantir a segurança da plataforma, prevenir fraudes e auditoria.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-2">4. Bases Legais</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              O tratamento dos dados pessoais está fundamentado nas seguintes bases legais da LGPD:
            </p>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li><strong>Consentimento</strong> (art. 7º, I) — para comunicações de marketing e cookies não essenciais.</li>
              <li><strong>Execução de contrato</strong> (art. 7º, V) — para prestar o serviço de consultoria.</li>
              <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II).</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX) — para segurança e prevenção de fraudes.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-2">5. Compartilhamento de Dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Compartilhamos dados pessoais apenas com:
            </p>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li><strong>Consultor parceiro designado</strong> ao Usuário, exclusivamente para
                  prestar a consultoria contratada.</li>
              <li><strong>Operadores de tecnologia</strong> contratados pela Novare:
                <ul className="pl-6 list-[circle] mt-1">
                  <li><strong>Supabase</strong> (hospedagem de banco de dados, autenticação e armazenamento).</li>
                  <li><strong>OpenAI e Anthropic</strong> (provedores de inteligência artificial,
                      quando utilizada para gerar pareceres ou análises — sempre com dados
                      mínimos necessários).</li>
                  <li><strong>Provedor de e-mail transacional</strong> (envio de comunicações da plataforma).</li>
                </ul>
              </li>
              <li>Autoridades públicas, mediante requisição legal devidamente fundamentada.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              <strong>Não vendemos, alugamos ou cedemos seus dados pessoais a terceiros para
              fins comerciais.</strong>
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">6. Transferência Internacional</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Alguns dos nossos operadores de tecnologia (notadamente Supabase, OpenAI e
              Anthropic) possuem infraestrutura nos Estados Unidos. A transferência
              internacional ocorre observando salvaguardas contratuais e técnicas adequadas,
              conforme o art. 33 da LGPD.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">7. Tempo de Retenção</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Os dados pessoais são mantidos pelo tempo necessário ao cumprimento das
              finalidades descritas, observados os prazos legais aplicáveis (por exemplo, prazo
              prescricional cível e obrigações fiscais). Após o encerramento da relação, os
              dados poderão ser anonimizados para fins estatísticos.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">8. Direitos do Titular</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Nos termos do art. 18 da LGPD, o Usuário tem direito a:
            </p>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li>Confirmação da existência de tratamento.</li>
              <li>Acesso aos seus dados pessoais.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
              <li>Portabilidade dos dados a outro fornecedor.</li>
              <li>Eliminação dos dados tratados com base em consentimento.</li>
              <li>Informação sobre as entidades com as quais os dados são compartilhados.</li>
              <li>Revogação do consentimento, a qualquer momento.</li>
              <li>Oposição a tratamento realizado com fundamento em hipótese de dispensa de consentimento.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Para exercer qualquer um destes direitos, envie um e-mail para
              {" "}
              <a href="mailto:encarregado@novareapp.com.br" className="text-primary hover:underline">
                encarregado@novareapp.com.br
              </a>
              {" "}
              com o assunto "Direitos do Titular — LGPD". Responderemos em prazo razoável,
              observados os limites legais.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">9. Cookies e Tecnologias Similares</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Utilizamos cookies estritamente necessários para autenticação, manutenção da
              sessão, segurança e preferências do Usuário (idioma, tema, consentimento). Não
              utilizamos cookies de marketing ou de rastreamento publicitário. O Usuário pode
              configurar o navegador para recusar cookies, ciente de que algumas funcionalidades
              da plataforma podem ficar indisponíveis.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">10. Segurança da Informação</h2>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li>Criptografia em trânsito (TLS/HTTPS) e em repouso.</li>
              <li>Controles de acesso baseados em papéis (RBAC) e Row-Level Security (RLS).</li>
              <li>Backups regulares automatizados.</li>
              <li>Registro de auditoria de eventos sensíveis.</li>
              <li>Princípio do menor privilégio aplicado a colaboradores e parceiros.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Apesar de adotarmos boas práticas de segurança, nenhum sistema é absolutamente
              imune. Em caso de incidente de segurança relevante, comunicaremos os titulares
              afetados e a Autoridade Nacional de Proteção de Dados (ANPD) na forma da lei.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">11. Crianças e Adolescentes</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A plataforma é destinada a maiores de 18 anos. Eventuais dados de dependentes
              menores são tratados em interesse exclusivo do Usuário titular e devem ser por
              ele autorizados, na qualidade de responsável legal.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">12. Alterações desta Política</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Esta Política poderá ser atualizada para refletir alterações legais, técnicas ou
              operacionais. A versão mais recente estará sempre disponível em
              {" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                /privacidade
              </Link>
              {" "}
              e a data da última atualização é indicada ao final.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">13. Contato e DPO</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Encarregado pelo Tratamento de Dados (DPO):
              {" "}
              <a href="mailto:encarregado@novareapp.com.br" className="text-primary hover:underline">
                encarregado@novareapp.com.br
              </a>
              <br />
              Dúvidas gerais:
              {" "}
              <a href="mailto:contato@novareapp.com.br" className="text-primary hover:underline">
                contato@novareapp.com.br
              </a>
            </p>

            <div className="mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground">
              <p>Última atualização: 28 de maio de 2026 · Versão {PRIVACY_VERSION}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacidade;
