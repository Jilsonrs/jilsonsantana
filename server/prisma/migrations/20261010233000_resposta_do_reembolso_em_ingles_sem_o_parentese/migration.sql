-- O operador pediu a resposta só com "14-day money-back guarantee" (10/10/2026), sem o trecho
-- sobre o Brasil que a migration anterior tinha posto. É DADO, não estrutura. Migration NOVA, e
-- não uma edição da anterior: aquela já foi aplicada no banco de desenvolvimento, e o
-- `migrate dev` reprova migration aplicada que mudou depois.
-- A mesma guarda: só troca o texto que a migration anterior gravou — uma edição feita em
-- Admin → FAQ fica como está.
UPDATE "faq_item"
   SET "answer" = 'Yes, we offer a 14-day money-back guarantee.',
       "updatedAt" = CURRENT_TIMESTAMP
 WHERE "language" = 'EN'
   AND "question" = 'Is there a refund?'
   AND "answer" = 'Yes, we offer a 14-day money-back guarantee (7 days for purchases made in Brazil).';
