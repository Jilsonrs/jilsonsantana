-- A resposta de "Is there a refund?" passa de 7 para 14 dias (decisão do operador, 10/10/2026:
-- o reembolso é de 7 dias no Brasil e 14 fora — docs/billing.md → Reembolso).
-- É DADO, não estrutura: nenhuma tabela muda. E só troca o texto DE FÁBRICA — se a resposta já
-- foi editada em Admin → FAQ, a edição do operador fica como está.
UPDATE "faq_item"
   SET "answer" = 'Yes, we offer a 14-day money-back guarantee (7 days for purchases made in Brazil).',
       "updatedAt" = CURRENT_TIMESTAMP
 WHERE "language" = 'EN'
   AND "question" = 'Is there a refund?'
   AND "answer" = 'Yes, we offer a 7-day money-back guarantee.';
