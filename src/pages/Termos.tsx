import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export const TERMS_VERSION = "2026-05-28";

const Termos = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-10 px-4">
      <SEO
        title="Termos de Uso · Novare"
        description="Termos de Uso da plataforma Novare Consultoria Financeira."
        canonicalPath="/termos"
      />
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <span className="text-xs text-muted-foreground">
            Versão {TERMS_VERSION}
          </span>
        </div>

        <Card className="shadow-md">
          <CardContent className="p-6 sm:p-10">
            <h1 className="text-2xl font-bold mb-4">Termos de Uso</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Estes Termos de Uso ("Termos") regulam o acesso e a utilização da plataforma
              <strong> Novare Consultoria Financeira</strong> ("Novare", "plataforma", "nós"),
              oferecida sob a forma de software como serviço (SaaS). Ao se cadastrar ou utilizar
              a plataforma, você ("Usuário") declara ter lido, compreendido e concordado
              integralmente com os termos abaixo.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">1. Aceitação dos Termos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              O cadastro e o uso da plataforma implicam aceitação automática destes Termos e da
              Política de Privacidade. Caso você não concorde com qualquer cláusula, deverá
              encerrar imediatamente o uso e solicitar a exclusão da sua conta.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">2. Descrição do Serviço</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Novare disponibiliza uma plataforma digital para gestão financeira pessoal e
              acompanhamento de consultoria, intermediando a relação entre o cliente e o
              <em> consultor parceiro</em> responsável pelo atendimento. A plataforma reúne
              recursos de diagnóstico, plano de ação, lançamentos mensais, relatórios e
              acompanhamento de evolução patrimonial.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">3. Cadastro e Segurança da Conta</h2>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li>O Usuário deve fornecer dados verdadeiros, completos e atualizados.</li>
              <li>A senha é pessoal e intransferível, sendo responsabilidade do Usuário sua guarda.</li>
              <li>O Usuário deve comunicar imediatamente qualquer acesso indevido à sua conta.</li>
              <li>A Novare poderá exigir verificação de identidade quando julgar necessário.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-2">4. Conta de Consultor x Conta de Cliente</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A plataforma comporta dois perfis principais: <strong>Consultor (admin)</strong>,
              responsável por prestar o serviço de consultoria, e <strong>Cliente</strong>, que
              recebe a consultoria. Cada perfil possui permissões e responsabilidades distintas.
              O consultor parceiro é o responsável técnico pelo conteúdo, recomendações e
              acompanhamento do cliente; a Novare atua como provedora da infraestrutura
              tecnológica.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">5. Obrigações do Usuário</h2>
            <ul className="pl-6 list-disc text-sm text-muted-foreground space-y-1 mb-3">
              <li>Utilizar a plataforma de forma lícita e respeitar a legislação vigente.</li>
              <li>Não tentar acessar áreas restritas, burlar mecanismos de segurança ou
                  realizar engenharia reversa.</li>
              <li>Não inserir conteúdo ilegal, ofensivo, difamatório ou que infrinja
                  direitos de terceiros.</li>
              <li>Manter seus dados de cadastro atualizados, especialmente e-mail e telefone
                  de contato.</li>
              <li>Responsabilizar-se pela veracidade das informações financeiras inseridas.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-2">6. Propriedade Intelectual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Todos os elementos da plataforma — marca "Novare", logotipos, identidade visual,
              textos, métodos, fórmulas, layouts, código-fonte e algoritmos — são de titularidade
              exclusiva da Novare ou licenciados a ela. O conteúdo gerado pelo Usuário
              (lançamentos, metas, objetivos, dados financeiros) permanece de propriedade do
              próprio Usuário, que concede à Novare licença não exclusiva para tratá-lo
              estritamente dentro da finalidade da prestação do serviço.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">7. Limitação de Responsabilidade</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Novare presta um serviço de <strong>plataforma tecnológica</strong>. O serviço
              de consultoria financeira propriamente dito é executado pelo
              <em> consultor parceiro </em> designado para o Usuário, que é o responsável técnico
              direto pelas orientações, pareceres e recomendações apresentadas. A Novare não se
              responsabiliza por decisões tomadas pelo Usuário com base em informações da
              plataforma, eventuais perdas financeiras, oscilações de mercado, ou pela conduta
              do consultor parceiro fora do escopo da plataforma.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">8. Natureza Educativa do Conteúdo</h2>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Aviso importante:</strong> as recomendações, simulações e pareceres
                disponibilizados na plataforma têm natureza estritamente <strong>educativa e
                orientadora</strong>. <u>Não constituem oferta de valores mobiliários, análise
                de investimentos, recomendação personalizada de produtos financeiros nem
                aconselhamento de investimento regulado pela Comissão de Valores Mobiliários
                (CVM)</u>. Toda decisão de investimento é de responsabilidade exclusiva do
                Usuário, que deve consultar profissional habilitado conforme aplicável.
              </p>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-2">9. Suspensão e Encerramento</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Novare poderá suspender ou encerrar o acesso de um Usuário, mediante prévia
              comunicação quando possível, nas seguintes hipóteses: violação destes Termos,
              utilização indevida ou fraudulenta da plataforma, inadimplência do contrato de
              consultoria, ordem judicial, ou encerramento da relação com o consultor parceiro.
              O Usuário poderá, a qualquer tempo, solicitar o encerramento da sua conta e a
              exclusão dos seus dados pessoais, observado o disposto na Política de Privacidade.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">10. Alterações dos Termos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              A Novare poderá atualizar estes Termos a qualquer momento, mediante comunicação
              prévia aos Usuários por e-mail ou aviso na plataforma. O uso continuado após a
              vigência da nova versão configura aceite tácito das alterações.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">11. Lei Aplicável e Foro</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Estes Termos são regidos pelas leis da República Federativa do Brasil, em
              especial pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), pelo
              Código de Defesa do Consumidor (Lei nº 8.078/1990) e pelo Marco Civil da Internet
              (Lei nº 12.965/2014). Fica eleito o foro da comarca da sede da empresa para
              dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa
              a qualquer outro, por mais privilegiado que seja.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-2">12. Contato</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Dúvidas sobre estes Termos podem ser encaminhadas para
              {" "}
              <a href="mailto:contato@novareapp.com.br" className="text-primary hover:underline">
                contato@novareapp.com.br
              </a>
              . Para questões relativas a privacidade e proteção de dados, consulte a nossa
              {" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>

            <div className="mt-8 pt-6 border-t border-border/50 text-xs text-muted-foreground">
              <p>Última atualização: 28 de maio de 2026 · Versão {TERMS_VERSION}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Termos;
