import React from 'react';
import { AnalyticsPreferenceControl } from '../components/PrivacyPreferences';
import { LegalDocument, LegalSection } from '../components/LegalDocument';
import { Seo } from '../components/Seo';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from '../src/config/legal';

const navigation = [
  { id: 'responsavel', label: 'Responsável' },
  { id: 'dados', label: 'Dados tratados' },
  { id: 'finalidades', label: 'Finalidades e bases' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'compartilhamento', label: 'Fornecedores' },
  { id: 'retencao', label: 'Retenção' },
  { id: 'direitos', label: 'Seus direitos' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'criancas', label: 'Crianças e adolescentes' },
  { id: 'alteracoes', label: 'Alterações' },
  { id: 'contato', label: 'Contato' },
];

export const PrivacyPolicy: React.FC = () => (
  <>
    <Seo
      title="Política de Privacidade"
      description="Como o Dicionário Gamer trata dados pessoais, mede o uso da plataforma e atende aos direitos previstos na LGPD."
      path="/privacidade"
    />
    <LegalDocument
      title="Política de Privacidade"
      description="Aqui explicamos quais dados são tratados, por que são necessários, com quem podem ser compartilhados e como exercer seus direitos."
      version={PRIVACY_VERSION}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      navigation={navigation}
    >
      <LegalSection id="responsavel" title="1. Quem é responsável pelos dados">
        <p>
          {LEGAL_CONTROLLER_NAME} atua como controlador dos dados pessoais tratados para operar o site, as contas
          e a comunidade. Solicitações relacionadas à Lei Geral de Proteção de Dados Pessoais (LGPD) podem ser
          enviadas para{' '}
          <a className="text-brand-400 hover:text-brand-300" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="2. Quais dados tratamos">
        <div className="overflow-x-auto border border-dark-800 rounded-md">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-dark-900 text-gray-300">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold">Exemplos</th>
                <th className="text-left px-4 py-3 font-semibold">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 text-gray-400">
              <tr><td className="px-4 py-3 text-gray-200">Conta</td><td className="px-4 py-3">nome ou nick, email, avatar, descrição e jogo favorito</td><td className="px-4 py-3">fornecidos por você</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Autenticação</td><td className="px-4 py-3">senha com hash, tokens de sessão, verificação e recuperação</td><td className="px-4 py-3">gerados pelo serviço</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Comunidade</td><td className="px-4 py-3">termos, definições, exemplos, comentários, votos e denúncias</td><td className="px-4 py-3">suas interações</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Brick Breaker</td><td className="px-4 py-3">melhor pontuação, tijolos destruídos, nível, duração e sessões recentes de partida</td><td className="px-4 py-3">suas partidas autenticadas</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Preferências</td><td className="px-4 py-3">configurações de perfil, notificações e privacidade</td><td className="px-4 py-3">suas escolhas</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Newsletter</td><td className="px-4 py-3">email, consentimento, confirmação, descadastro, estado das entregas e cliques estimados</td><td className="px-4 py-3">sua inscrição e eventos técnicos do provedor</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Uso agregado</td><td className="px-4 py-3">página, origem, campanha, navegador, dispositivo e região aproximada</td><td className="px-4 py-3">Plausible Analytics</td></tr>
              <tr><td className="px-4 py-3 text-gray-200">Segurança</td><td className="px-4 py-3">IP em formato protegido por HMAC, horário, limites de uso, resultado anti-bot e falhas de acesso</td><td className="px-4 py-3">servidor, hospedagem e Cloudflare Turnstile</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Não solicitamos dados pessoais sensíveis. Não publique informações privadas suas ou de terceiros em
          definições, comentários, exemplos ou denúncias.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="3. Para que usamos os dados e bases legais">
        <ul className="list-disc pl-5 space-y-3 marker:text-brand-500">
          <li><strong className="text-white">Executar o serviço:</strong> criar e autenticar contas, manter perfis e entregar recursos solicitados.</li>
          <li><strong className="text-white">Operar a comunidade:</strong> publicar contribuições, registrar votos, moderar conteúdo e responder denúncias.</li>
          <li><strong className="text-white">Segurança e prevenção a fraude:</strong> proteger contas, aplicar limites de acesso e investigar abuso.</li>
          <li><strong className="text-white">Melhoria e analytics:</strong> medir audiência, desempenho de conteúdo, origem do tráfego e conversões.</li>
          <li><strong className="text-white">Termo do Dia:</strong> enviar a newsletter somente após confirmação do endereço, com base no consentimento que pode ser revogado a qualquer momento.</li>
          <li><strong className="text-white">Cumprimento legal:</strong> atender obrigações, ordens válidas e exercer direitos em processos.</li>
        </ul>
        <p>
          Conforme o contexto, utilizamos execução de contrato ou procedimentos preliminares, legítimo interesse
          com avaliação de necessidade e impacto, cumprimento de obrigação legal e exercício regular de direitos.
          Quando uma atividade exigir consentimento, ele será solicitado de forma específica e poderá ser revogado.
        </p>
      </LegalSection>

      <LegalSection id="analytics" title="4. Analytics, cookies e armazenamento local">
        <p>
          Utilizamos Plausible Analytics para entender se a estratégia de conteúdo e SEO está funcionando. A
          ferramenta mede visualizações, fontes de tráfego, campanhas, país ou região aproximada, dispositivo e
          eventos de conversão. O endereço IP é processado para gerar um identificador diário agregado, mas não é
          armazenado pelo Plausible; não são usados cookies analíticos nem identificadores persistentes entre dias.
        </p>
        <p>
          Eventos do produto não incluem nome, email, texto livre de comentários, definição enviada ou ID da conta.
          A página acessada pode revelar o slug público de um termo, jogo ou notícia. Parâmetros comuns de campanha,
          como UTM, podem ser usados para atribuição de origem.
        </p>
        <p>
          Para impedir que recarregamentos artificiais manipulem os termos em alta, usamos um cookie HTTP-only
          assinado que identifica aproximadamente um navegador. O banco recebe somente um código irreversível,
          sem IP ou vínculo com a conta, e deduplica visualizações e compartilhamentos em intervalos de 30 minutos.
          O cookie pode permanecer por até um ano e pode ser renovado quando o navegador volta ao site.
        </p>
        <p>
          Quando analytics está ativo, buscas no dicionário são normalizadas e sanitizadas para remover emails,
          telefones, URLs, identificadores e tokens. O texto é mantido por até 90 dias, não é ligado à conta, IP ou
          sessão e só aparece em relatórios quando há pelo menos três ocorrências no período.
        </p>
        <div className="border border-dark-700 bg-dark-900/60 rounded-md p-5 my-6">
          <AnalyticsPreferenceControl />
        </div>
        <p>
          O site também usa cookies e armazenamento local estritamente necessários para segurança, integridade das
          métricas, sessão, usuário autenticado e preferências. Desativar ou limpar esses dados pode encerrar sua
          sessão ou reiniciar a identificação anônima usada contra manipulação.
        </p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="5. Compartilhamento e fornecedores">
        <p>Dados são compartilhados apenas quando necessários para operar o serviço ou cumprir a lei, incluindo:</p>
        <ul className="list-disc pl-5 space-y-3 marker:text-brand-500">
          <li><strong className="text-white">hospedagem e banco de dados:</strong> infraestrutura que mantém a aplicação, backups e logs;</li>
          <li><strong className="text-white">Resend:</strong> envio de mensagens transacionais, confirmação da newsletter e entrega do Termo do Dia, incluindo eventos técnicos de entrega, falha, bounce, reclamação e supressão;</li>
          <li><strong className="text-white">Plausible:</strong> métricas agregadas de audiência, com infraestrutura na União Europeia;</li>
          <li><strong className="text-white">Google Search Console, CrUX e PageSpeed:</strong> desempenho orgânico, indexação e qualidade técnica de páginas públicas;</li>
          <li><strong className="text-white">Sentry:</strong> diagnóstico de erros, desempenho e disponibilidade, configurado sem envio intencional de dados pessoais ou conteúdo de formulários;</li>
          <li><strong className="text-white">Cloudflare Turnstile:</strong> verificação anti-bot no cadastro e, conforme o risco, em contribuições; o token temporário e o endereço IP são enviados à Cloudflare para validação;</li>
          <li><strong className="text-white">Liquipedia:</strong> fornecimento de dados públicos de partidas e competições de esports;</li>
          <li><strong className="text-white">serviços de avatar, fontes e mídia:</strong> carregamento de avatar gerado, tipografia e imagens externas.</li>
        </ul>
        <p>
          Alguns fornecedores podem processar dados fora do Brasil. Nesses casos, adotamos contratos, configurações
          e fornecedores compatíveis com os requisitos aplicáveis de segurança e transferência internacional.
          Não vendemos dados pessoais nem os utilizamos para publicidade comportamental.
        </p>
      </LegalSection>

      <LegalSection id="retencao" title="6. Por quanto tempo mantemos os dados">
        <ul className="list-disc pl-5 space-y-3 marker:text-brand-500">
          <li>Dados de conta permanecem enquanto a conta estiver ativa e pelo período necessário para obrigações legais e prevenção a fraude.</li>
          <li>A inscrição no Termo do Dia permanece até o descadastro, bounce permanente, reclamação, supressão ou solicitação de eliminação. Tokens de confirmação expiram em 24 horas e são armazenados somente como hash.</li>
          <li>O histórico técnico da newsletter registra entregas, falhas e cliques estimados sem pixel de abertura. Após a eliminação do assinante, estatísticas de campanha podem permanecer de forma desvinculada e agregada.</li>
          <li>Tokens de recuperação expiram em uma hora; tokens de sessão expiram segundo a configuração de segurança do serviço.</li>
          <li>Contribuições e comentários podem permanecer publicados para preservar a integridade do dicionário, inclusive de forma anonimizada após o encerramento da conta.</li>
          <li>Solicitações de direitos, protocolos e registros administrativos mínimos podem ser conservados para comprovar o atendimento e o exercício regular de direitos; dados de contato e textos livres são minimizados após a anonimização.</li>
          <li>Logs técnicos são mantidos pelo período necessário para segurança, diagnóstico e cumprimento legal.</li>
          <li>Contadores antiabuso protegidos por HMAC expiram ao final de sua janela e são eliminados periodicamente; o horário da última verificação anti-bot permanece enquanto a conta estiver ativa.</li>
          <li>Métricas agregadas permanecem no Plausible enquanto a conta analítica estiver ativa ou até sua exclusão pelo operador.</li>
          <li>O texto sanitizado de consultas internas é eliminado após 90 dias; hashes e totais agregados podem permanecer para análise histórica sem identificação do visitante.</li>
          <li>Registros diários de atividade autenticada são incluídos na exportação e removidos quando a conta é anonimizada.</li>
          <li>O melhor resultado do Brick Breaker permanece enquanto a conta estiver ativa; sessões expiradas são eliminadas após sete dias e todos os dados do jogo são removidos na anonimização.</li>
        </ul>
        <p>Dados serão eliminados ou anonimizados quando deixarem de ser necessários, ressalvadas hipóteses legais de conservação.</p>
      </LegalSection>

      <LegalSection id="direitos" title="7. Seus direitos pela LGPD">
        <p>Você pode solicitar, conforme aplicável:</p>
        <ul className="list-disc pl-5 space-y-2 marker:text-brand-500">
          <li>confirmação da existência de tratamento e acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
          <li>portabilidade, quando regulamentada e tecnicamente aplicável;</li>
          <li>informações sobre compartilhamentos e consequências de não fornecer dados;</li>
          <li>revogação do consentimento e eliminação dos dados tratados com essa base, observadas exceções legais;</li>
          <li>oposição a tratamento irregular e revisão de decisões tomadas unicamente por processos automatizados.</li>
        </ul>
        <p>
          Na área <strong className="text-white">Configurações da conta</strong>, você pode baixar uma cópia estruturada
          dos seus dados e abrir solicitações de correção, anonimização ou exclusão. Pedidos sensíveis exigem a senha
          atual e confirmação pelo email cadastrado. Cada pedido recebe um protocolo, prazo e histórico de andamento;
          enquanto ainda estiver aberto, ele também pode ser cancelado pelo titular.
        </p>
        <p>
          A equipe analisa o pedido em fila administrativa com acesso restrito e registra responsável, mudanças de
          estado e resolução. Na exclusão ou anonimização concluída, as sessões são invalidadas, credenciais e dados
          do perfil são removidos, votos identificáveis são eliminados e contribuições públicas remanescentes passam
          a ser atribuídas a “Usuário removido”. Informaremos eventual impossibilidade ou necessidade legal de conservação.
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="8. Segurança">
        <p>
          Adotamos controles como hash de senhas, autenticação por token, limitação de requisições, cabeçalhos de
          segurança, validação de entradas, verificação anti-bot adaptativa e restrição de acesso administrativo. Nenhum sistema é infalível; por isso,
          também monitoramos incidentes e revisamos medidas conforme o risco e a evolução do produto.
        </p>
        <p>Se você suspeitar de acesso indevido, altere sua senha e comunique o canal de privacidade.</p>
      </LegalSection>

      <LegalSection id="criancas" title="9. Crianças e adolescentes">
        <p>
          A plataforma não é projetada para coletar intencionalmente dados de crianças. O uso por menores deve ocorrer
          com orientação de seus responsáveis e sempre em seu melhor interesse. Se identificarmos tratamento inadequado,
          poderemos restringir a conta e eliminar os dados, observadas as obrigações legais.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="10. Alterações desta política">
        <p>
          Podemos atualizar esta política para refletir mudanças no produto, em fornecedores ou na legislação. A data
          e a versão vigentes aparecem no início da página. Mudanças materiais serão comunicadas de forma adequada e,
          quando necessário, uma nova ciência ou autorização será solicitada.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="11. Como falar sobre privacidade">
        <p>
          Envie dúvidas, solicitações de direitos ou comunicações de segurança para{' '}
          <a className="text-brand-400 hover:text-brand-300" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>. Inclua apenas as informações necessárias para localizarmos sua conta e entendermos o pedido.
        </p>
      </LegalSection>
    </LegalDocument>
  </>
);
