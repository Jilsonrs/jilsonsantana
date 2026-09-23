-- Bloco C3 — depoimentos e perguntas frequentes da home viram tabela.
--
-- Escrita à mão a partir de `prisma migrate diff` (o `migrate dev` recusa shell
-- de agente). Três partes, na ordem: as tabelas, o RLS (convenção do repo: toda
-- tabela nova em `public` liga RLS NA MESMA migration) e o conteúdo que já está
-- no ar, para que a home publicada não fique um instante sequer sem as seções
-- (decisão do operador, 23/09/2026: "automático na publicação").
--
-- Os INSERTs foram GERADOS do dicionário (core/src/i18n) antes de as listas
-- saírem dele — o texto no banco é o mesmo que estava no ar. A ordem usa passos
-- de 10 para caber um item novo entre dois sem renumerar os outros.

-- CreateTable
CREATE TABLE "testimonial" (
    "id" SERIAL NOT NULL,
    "language" "Language" NOT NULL,
    "text" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_item" (
    "id" SERIAL NOT NULL,
    "language" "Language" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonial_language_status_displayOrder_idx" ON "testimonial"("language", "status", "displayOrder");

-- CreateIndex
CREATE INDEX "faq_item_language_status_displayOrder_idx" ON "faq_item"("language", "status", "displayOrder");


-- RLS (sem políticas: o Prisma conecta como dono e é o único acesso).
ALTER TABLE "testimonial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "faq_item" ENABLE ROW LEVEL SECURITY;

-- Conteúdo atual, publicado.
INSERT INTO "testimonial" ("language", "text", "name", "displayOrder", "status", "updatedAt") VALUES
  ('PT', 'O professor está muito acima de qualquer expectativa! Um curso 100% prático, com aplicações imediatas. Nos meus 30 anos lecionando, nunca vi uma didática tão apurada.', 'Edson Garcia Fernandes', 10, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'O professor explica muito bem, passo a passo, para até quem nunca mexeu no programa entender tudo. Eu sabia pouco, quase nada, e agora já entendo até um pouquinho de programação!', 'Nicole Silveira Manoel', 20, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Incrível! Acabei de finalizar esse curso e estou sem palavras. Como uma educadora, gosto de aprender com práticas, por isso achei todo o cronograma perfeito. Muito obrigada professor, um forte abraço.', 'Beatriz Veloso', 30, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Realizou grandes avanços no meu dia a dia. Também ajudou a melhorar a performance da minha equipe, pois repliquei toda semana os conhecimentos que aprendi. Assim crescemos juntos.', 'Vinicius Dias de Queiroz', 40, 'PUBLISHED', CURRENT_TIMESTAMP);

INSERT INTO "faq_item" ("language", "question", "answer", "displayOrder", "status", "updatedAt") VALUES
  ('PT', 'É para quem nunca mexeu com dados? Preciso saber programar, matemática ou inglês?', 'Sim. A escola é projetada para profissionais de negócios. Você não precisa de experiência prévia. Ensinamos passo a passo, do zero absoluto aos tópicos avançados.', 10, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Serve para a minha área?', 'Sim. Os dados estão em todo lugar: finanças, marketing, RH, logística. As ferramentas e os métodos ensinados são universais e aplicáveis a qualquer setor do mercado.', 20, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Por onde começo?', 'Nós oferecemos trilhas prontas e sugestões personalizadas pelo JilsonAI para guiar seu primeiro passo.', 30, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Preciso comprar alguma ferramenta?', 'Não. A grande maioria das ferramentas abordadas possui versões gratuitas completas suficientes para você aplicar o conhecimento.', 40, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'As aulas são gravadas? E se eu não conseguir manter o ritmo?', 'Sim, todas as aulas ficam gravadas e você estuda no seu próprio ritmo, podendo rever quantas vezes quiser.', 50, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Como os cursos são escolhidos?', 'Poucos cursos, escolhidos a dedo, focados nas ferramentas e métodos que você aplica no trabalho amanhã de manhã.', 60, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Como funciona o suporte? O que é o JilsonAI?', 'O JilsonAI é um parceiro inteligente treinado na nossa metodologia para ajudar você imediatamente. Se ele não resolver, o Jilson entra em ação.', 70, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Tem certificado? Serve para o LinkedIn?', 'Sim! Ao concluir as trilhas e cursos, você emite seu certificado válido que pode ser compartilhado diretamente no seu perfil do LinkedIn.', 80, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Qual a diferença para os vídeos gratuitos do YouTube?', 'Aqui você tem uma trilha com método estruturado, começo, meio e fim, suporte oficial, exercícios com dados reais e emissão de certificado.', 90, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Posso comprar só um curso?', 'Não. O modelo é de assinatura (mensal ou anual), garantindo acesso a todo o catálogo e novas atualizações constantes.', 100, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Como e quando recebo a cobrança?', 'Você pode optar por pagar R$ 99,90 cobrados todo mês, ou R$ 995 cobrados de uma única vez no plano anual.', 110, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Como cancelo? Posso voltar depois?', 'Cancele com um clique no seu painel de aluno, sem nenhuma taxa. Quando quiser voltar, seu histórico e seus certificados estarão guardados esperando por você.', 120, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'A assinatura vale para os cursos em inglês?', 'Sim, a mesma assinatura libera acesso a todo o conteúdo nos dois idiomas.', 130, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Tem reembolso?', 'Sim, você possui garantia legal de arrependimento.', 140, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('PT', 'Empresas podem assinar? Emitem nota fiscal?', 'Sim, emitimos nota fiscal para todos os pagamentos. Para planos corporativos ou múltiplos acessos, entre em contato.', 150, 'PUBLISHED', CURRENT_TIMESTAMP);

INSERT INTO "testimonial" ("language", "text", "name", "displayOrder", "status", "updatedAt") VALUES
  ('EN', 'This instructor exceeded all expectations! A fully hands-on course, with skills you can apply right away. In my 30 years of teaching, I have never seen such excellent methodology.', 'Edson Garcia Fernandes', 10, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'The instructor explains step by step, so even a complete beginner can understand everything. I knew almost nothing, and now I even understand a bit of programming!', 'Nicole Silveira Manoel', 20, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Incredible! I just finished this course and I am speechless. As an educator, I like to learn by doing, so I found the course structure perfect. Thank you so much!', 'Beatriz Veloso', 30, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'It made a real difference in my daily work. It also helped my team perform better, because every week I shared what I learned. That way we grew together.', 'Vinicius Dias de Queiroz', 40, 'PUBLISHED', CURRENT_TIMESTAMP);

INSERT INTO "faq_item" ("language", "question", "answer", "displayOrder", "status", "updatedAt") VALUES
  ('EN', 'Is this for someone who has never worked with data? Do I need to know how to code or be good at math?', 'Yes, it is. The school is built for business professionals. You don''t need previous experience. We teach step by step, from absolute zero to advanced topics.', 10, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Does it work for my field?', 'Yes. Data is everywhere: finance, marketing, HR, logistics. The tools and methods we teach are universal and apply to any industry.', 20, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Where do I start?', 'We offer ready-made learning paths, plus personalized suggestions from JilsonAI to guide your first step.', 30, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Do I need to buy any tools?', 'No. Most of the tools we cover have complete free versions, enough for you to apply what you learn.', 40, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Are the lessons recorded? What if I can''t keep up?', 'Yes, every lesson is recorded and you learn at your own pace, rewatching as many times as you want.', 50, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'How are the courses chosen?', 'We offer a few hand-picked courses, focused on tools and methods you can apply at work tomorrow morning.', 60, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'How does support work? What is JilsonAI?', 'JilsonAI is a smart partner trained on our method to help you right away. If it cannot solve your problem, Jilson steps in.', 70, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Is there a certificate? Does it work on LinkedIn?', 'Yes. When you finish a path or a course, you get a valid certificate that you can share directly to your LinkedIn profile.', 80, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'How is this different from free videos on YouTube?', 'Here you get a structured path from start to finish, official support, exercises with real data, and a certificate.', 90, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Can I buy a single course?', 'No. We work with a monthly or annual subscription, which gives you full access to the catalog and regular updates.', 100, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'How and when am I charged?', 'You can pay R$ 99,90 every month, or R$ 995 once a year on the annual plan.', 110, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'How do I cancel? Can I come back later?', 'Cancel with one click in your dashboard, with no fees. When you come back, your history and certificates will be waiting for you.', 120, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Does the subscription cover the courses in Portuguese?', 'Yes, the same subscription gives you access to all the content in both languages.', 130, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Is there a refund?', 'Yes, we offer a 7-day money-back guarantee.', 140, 'PUBLISHED', CURRENT_TIMESTAMP),
  ('EN', 'Can companies subscribe? Do you issue invoices?', 'Yes, we issue an invoice for every payment. For corporate plans or multiple seats, get in touch.', 150, 'PUBLISHED', CURRENT_TIMESTAMP);
