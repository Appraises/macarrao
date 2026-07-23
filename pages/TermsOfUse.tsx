import React from 'react';
import { Seo } from '../components/Seo';
import { LegalDocument, LegalSection } from '../components/LegalDocument';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_EFFECTIVE_DATE,
  TERMS_VERSION,
} from '../src/config/legal';

const navigation = [
  { id: 'aceitacao', label: 'Aceitação' },
  { id: 'servico', label: 'O serviço' },
  { id: 'conta', label: 'Conta e segurança' },
  { id: 'comunidade', label: 'Conteúdo da comunidade' },
  { id: 'licenca', label: 'Licença de conteúdo' },
  { id: 'moderacao', label: 'Moderação e IA' },
  { id: 'terceiros', label: 'Conteúdo de terceiros' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'responsabilidade', label: 'Responsabilidades' },
  { id: 'encerramento', label: 'Encerramento' },
  { id: 'alteracoes', label: 'Alterações' },
  { id: 'contato', label: 'Contato' },
];

export const TermsOfUse: React.FC = () => (
  <>
    <Seo
      title="Termos de Uso"
      description="Regras para utilizar o Dicionário Gamer, criar uma conta e contribuir com a comunidade."
      path="/termos"
    />
    <LegalDocument
      title="Termos de Uso"
      description="Estas regras explicam o que você pode esperar do Dicionário Gamer e o que esperamos de quem utiliza ou contribui com a plataforma."
      version={TERMS_VERSION}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      navigation={navigation}
    >
      <LegalSection id="aceitacao" title="1. Aceitação dos termos">
        <p>
          Ao acessar o site, você pode consultar conteúdo público sem criar uma conta. Ao se cadastrar,
          contribuir, votar, comentar ou utilizar recursos restritos, você declara que leu e aceita estes
          Termos de Uso e a Política de Privacidade vigente.
        </p>
        <p>
          Se você não concordar com estas condições, não crie uma conta nem utilize as funcionalidades
          interativas. A navegação pública continua sujeita às regras aplicáveis de propriedade intelectual,
          segurança e uso responsável.
        </p>
      </LegalSection>

      <LegalSection id="servico" title="2. O Dicionário Gamer">
        <p>
          O Dicionário Gamer é uma plataforma de informação e colaboração sobre termos, gírias, mecânicas,
          jogos, mapas, notícias e esports. O conteúdo tem finalidade informativa e cultural e pode ser criado
          pela equipe, por usuários ou com apoio de ferramentas automatizadas.
        </p>
        <p>
          Definições e referências podem variar entre jogos, regiões e comunidades. Não garantimos que todo
          conteúdo esteja completo ou atualizado em todos os momentos, mas oferecemos mecanismos de voto,
          denúncia e revisão para melhorar sua qualidade.
        </p>
      </LegalSection>

      <LegalSection id="conta" title="3. Conta, idade e segurança">
        <ul className="list-disc pl-5 space-y-2 marker:text-brand-500">
          <li>Forneça dados corretos e mantenha seu email atualizado.</li>
          <li>Use uma senha forte e não compartilhe suas credenciais ou token de acesso.</li>
          <li>Você é responsável pelas atividades realizadas em sua conta até comunicar uso indevido.</li>
          <li>Não crie contas para se passar por outra pessoa, contornar bloqueios, manipular votos ou enviar spam.</li>
        </ul>
        <p>
          O serviço não é direcionado a crianças. Menores de idade devem utilizar a plataforma com ciência e
          orientação de seus responsáveis legais, observando a legislação aplicável e o melhor interesse do menor.
        </p>
      </LegalSection>

      <LegalSection id="comunidade" title="4. Regras da comunidade">
        <p>Ao publicar uma definição, exemplo, comentário, denúncia ou outro material, você concorda em não enviar:</p>
        <ul className="list-disc pl-5 space-y-2 marker:text-brand-500">
          <li>conteúdo ilegal, ameaçador, discriminatório, difamatório ou que incentive violência;</li>
          <li>dados pessoais de terceiros sem autorização ou informações privadas e confidenciais;</li>
          <li>material protegido por direitos autorais que você não possa compartilhar;</li>
          <li>spam, publicidade enganosa, malware, automações abusivas ou tentativas de fraude;</li>
          <li>conteúdo deliberadamente falso ou manipulação coordenada de votos e denúncias.</li>
        </ul>
        <p>
          Gírias ofensivas podem ser documentadas quando houver contexto enciclopédico legítimo, com avisos e
          tratamento editorial adequado. Isso não autoriza seu uso para atacar outros usuários.
        </p>
      </LegalSection>

      <LegalSection id="licenca" title="5. Conteúdo enviado e licença">
        <p>
          Você mantém os direitos que possuir sobre suas contribuições. Para que possamos operar o serviço, ao
          enviar conteúdo você concede a {LEGAL_CONTROLLER_NAME} uma licença não exclusiva, gratuita, mundial e
          pelo prazo de proteção aplicável para armazenar, reproduzir, revisar, adaptar, traduzir, publicar e
          distribuir esse conteúdo dentro da plataforma e em materiais de divulgação relacionados ao projeto.
        </p>
        <p>
          A licença permite correções editoriais, padronização, combinação com outras definições e moderação.
          Quando tecnicamente e juridicamente possível, pedidos de remoção serão avaliados sem prejudicar cópias
          necessárias para segurança, cumprimento legal ou preservação de discussões já publicadas.
        </p>
      </LegalSection>

      <LegalSection id="moderacao" title="6. Moderação e uso de inteligência artificial">
        <p>
          Contribuições podem passar por filtros automáticos e análise por inteligência artificial para detectar
          spam, avaliar aderência ao tema e apoiar a revisão. Essas ferramentas podem errar e não substituem a
          decisão editorial humana em situações relevantes.
        </p>
        <p>
          Podemos aprovar, editar, sinalizar, recusar ou remover conteúdo que viole estes termos ou prejudique a
          qualidade e a segurança da comunidade. Denúncias abusivas também podem resultar em restrições.
        </p>
      </LegalSection>

      <LegalSection id="terceiros" title="7. Marcas, jogos e serviços de terceiros">
        <p>
          Nomes de jogos, marcas, imagens, mapas, notícias e dados de competições pertencem a seus respectivos
          titulares. O Dicionário Gamer é um projeto independente e não implica afiliação, patrocínio ou aprovação
          por desenvolvedoras, publicadoras, ligas ou equipes, salvo quando informado expressamente.
        </p>
        <p>
          Links e integrações externas seguem os termos e políticas dos respectivos fornecedores. Não controlamos
          a disponibilidade, precisão ou práticas desses serviços.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidade" title="8. Disponibilidade e mudanças no serviço">
        <p>
          Podemos atualizar, suspender ou descontinuar funcionalidades para manutenção, segurança, evolução do
          produto ou cumprimento legal. Empregaremos esforços razoáveis para preservar o conteúdo e comunicar
          mudanças relevantes, mas não garantimos operação ininterrupta ou ausência total de erros.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidade" title="9. Limites e responsabilidades">
        <p>
          Use o conteúdo como referência, considerando o contexto de cada jogo e comunidade. Na extensão permitida
          pela legislação, não nos responsabilizamos por decisões tomadas exclusivamente com base em definições,
          estatísticas, notícias ou informações de terceiros exibidas na plataforma.
        </p>
        <p>
          Nada nestes termos exclui direitos obrigatórios do consumidor, responsabilidade por conduta dolosa ou
          outras garantias que não possam ser afastadas pela legislação brasileira.
        </p>
      </LegalSection>

      <LegalSection id="encerramento" title="10. Suspensão e encerramento">
        <p>
          Podemos limitar ou suspender contas em caso de violação, risco de segurança, fraude ou exigência legal,
          preferencialmente com informação do motivo quando isso não comprometer investigações ou medidas de proteção.
          Você pode solicitar o encerramento de sua conta pelo canal de privacidade.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="11. Alterações e legislação aplicável">
        <p>
          Estes termos podem ser atualizados para refletir mudanças no produto, na legislação ou em nossas práticas.
          A versão e a data de vigência serão sempre indicadas nesta página. Alterações materiais poderão exigir nova
          aceitação de usuários cadastrados.
        </p>
        <p>
          Aplicam-se as leis da República Federativa do Brasil. Eventuais conflitos serão tratados no foro definido
          pela legislação aplicável, preservados os direitos de consumidores e titulares de dados.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="12. Contato">
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{' '}
          <a className="text-brand-400 hover:text-brand-300" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>.
        </p>
      </LegalSection>
    </LegalDocument>
  </>
);
