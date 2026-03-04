-- Arquivo patch.sql consolidado
-- Reúne todas as alterações e inserções estruturais feitas via PHP

-- 1. Cria a coluna shop_open, caso não exista (de patch_shop_open.php)
-- Nota: Caso você use uma versão antiga do MySQL que não suporta 'IF NOT EXISTS',
-- utilize: ALTER TABLE sessions ADD COLUMN shop_open TINYINT(1) DEFAULT 0;
-- Se ocorrer o erro "Duplicate column name", você pode ignorá-lo.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shop_open TINYINT(1) DEFAULT 0;

-- 2. Cria as colunas em characters, caso não existam (de patch_db.php e patch_secret.php)
-- Elas já estão no schema.sql atualizado, mas estão aqui como garantia.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS armor_base_override INT DEFAULT NULL AFTER armor_base;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secret_note TEXT;

-- 3. Inserção do Catálogo de Equipamentos (de patch_equipment.php)
-- A tabela equipment também já está no schema.sql, e a instrução INSERT IGNORE
-- previne inserções duplicadas caso o script seja rodado mais de uma vez.
INSERT IGNORE INTO equipment (name, category, tier, cost_base, description, data) VALUES
('Adaga', 'primary_weapon', 1, '1 Punhado', 'Rápida: Gaste 1 Fadiga para atingir um alvo extra em alcance.', '{"damage":"d8","attr":"Destreza","slots":1,"traits":"Rápida, C. a C."}'),
('Arco Curto', 'primary_weapon', 1, '2 Punhados', 'Ágil: +2 em rolagens de ataque contra alvos em alcance Curto.', '{"damage":"d8","attr":"Destreza","slots":2,"traits":"Ágil, Curto"}'),
('Arco Longo', 'primary_weapon', 1, '3 Punhados', 'Longo Alcance: Pode atingir alvos em alcance Muito Distante com desvantagem.', '{"damage":"d10","attr":"Destreza","slots":2,"traits":"Longo Alcance, Longo"}'),
('Cajado de Batalha', 'primary_weapon', 1, '2 Punhados', 'Defensivo: +1 de Esquiva enquanto empunhado.', '{"damage":"d8","attr":"Instinto","slots":2,"traits":"Defensivo, Mágico, C. a C."}'),
('Espada Curta', 'primary_weapon', 1, '2 Punhados', 'Precisa: Você pode repetir um dado de dano se o resultado for 1.', '{"damage":"d8","attr":"Agilidade","slots":1,"traits":"Precisa, C. a C."}'),
('Espada Larga', 'primary_weapon', 1, '4 Punhados', 'Pesada: Se o resultado do dado de Medo for par, +2 de dano.', '{"damage":"d12","attr":"Força","slots":2,"traits":"Pesada, C. a C."}'),
('Foice de Guerra', 'primary_weapon', 1, '3 Punhados', 'Ceifadora: Se matar um alvo, limpe 1 Ponto de Fadiga.', '{"damage":"d10","attr":"Instinto","slots":2,"traits":"Ceifadora, Mágico, C. a C."}'),
('Grimório', 'primary_weapon', 1, '4 Punhados', 'Arcano: Gaste 1 Esperança para adicionar +3 ao dano.', '{"damage":"d10","attr":"Conhecimento","slots":2,"traits":"Arcano, Mágico, Distante"}'),
('Lança', 'primary_weapon', 1, '2 Punhados', 'Versátil: Pode ser arremessada (alcance Curto).', '{"damage":"d8","attr":"Agilidade","slots":1,"traits":"Versátil, C. a C., Curto"}'),
('Machado de Batalha', 'primary_weapon', 1, '3 Punhados', 'Brutal: +2 de dano em sucessos críticos.', '{"damage":"d10","attr":"Força","slots":1,"traits":"Brutal, C. a C."}'),
('Manoplas', 'primary_weapon', 1, '2 Punhados', 'Impacto: Empurra o alvo para longe em um sucesso.', '{"damage":"d6","attr":"Força","slots":2,"traits":"Impacto, C. a C."}'),
('Martelo de Guerra', 'primary_weapon', 1, '4 Punhados', 'Esmagador: Reduz a Armadura do alvo em 1 até o fim do turno.', '{"damage":"d12","attr":"Força","slots":2,"traits":"Esmagador, C. a C."}'),
('Varinha', 'primary_weapon', 1, '3 Punhados', 'Focada: +1 nas rolagens de ataque.', '{"damage":"d8","attr":"Presença","slots":1,"traits":"Focada, Mágico, Distante"}'),
('Adaga de Mão', 'secondary_weapon', 1, '1 Punhado', 'Parceira: +2 de dano na arma primária contra alvos C. a C.', '{"damage":"d6","attr":"Destreza","slots":1}'),
('Escudo de Broquel', 'secondary_weapon', 1, '1 Punhado', 'Reação: Gaste 1 Armadura para reduzir o dano em 1d4 adicional.', '{"armor_bonus":1,"slots":1}'),
('Escudo Pesado', 'secondary_weapon', 1, '3 Punhados', 'Pesado: -1 de Esquiva.', '{"armor_bonus":3,"evasion_mod":-1,"slots":1}'),
('Orbe Mágica', 'secondary_weapon', 1, '2 Punhados', 'Canalizadora: Reduz o custo de Esperança de uma magia em 1 (mín. 1).', '{"damage":"d6","attr":"Conhecimento","slots":1}'),
('Tocha (Arma)', 'secondary_weapon', 1, '1 Punhado', 'Iluminação: Ilumina alcance Curto.', '{"damage":"d4","attr":"Fogo","slots":1}'),
('Roupas de Viagem', 'armor', 1, '1 Punhado', 'Leve e confortável.', '{"armor_base":1,"armor_slots":2,"evasion_mod":0}'),
('Armadura de Couro', 'armor', 1, '3 Punhados', 'Equilíbrio médio.', '{"armor_base":3,"armor_slots":4,"evasion_mod":0}'),
('Cota de Malha', 'armor', 1, '1 Bolsa', 'Requisito: Força 1+. -1 de Esquiva.', '{"armor_base":5,"armor_slots":6,"evasion_mod":-1}'),
('Armadura de Placas', 'armor', 1, '2 Bolsas', 'Requisito: Força 3+. -2 de Esquiva.', '{"armor_base":7,"armor_slots":8,"evasion_mod":-2}'),
('Nenhuma / Roupas', 'armor', 1, '0', 'Sem armadura militar.', '{"armor_base":0,"armor_slots":0,"evasion_mod":0}'),
('Algemas', 'adventure_item', 1, '1 Punhado', 'De ferro. CD 15 para abrir ou quebrar.', '[]'),
('Arpéu', 'adventure_item', 1, '1 Punhado', 'Gancho para escalada. Vantagem em testes de Agilidade.', '[]'),
('Barraca (2 pessoas)', 'adventure_item', 1, '1 Punhado', 'Equipamento de acampamento básico.', '[]'),
('Bússola', 'adventure_item', 1, '1 Punhado', 'Equipamento de navegação.', '[]'),
('Caixa de Fogo', 'adventure_item', 1, '1 Punhado', 'Pederneira e isca.', '[]'),
('Catalejo', 'adventure_item', 1, '2 Punhados', 'Amplia visão à distância. Vantagem em Percepção.', '[]'),
('Corda (15m)', 'adventure_item', 1, '1 Punhado', 'Corda de cânhamo resistente.', '[]'),
('Espelho de Mão', 'adventure_item', 1, '1 Punhado', 'Pequeno espelho de metal polido.', '[]'),
('Ferramentas de Ladrão', 'adventure_item', 1, '3 Punhados', 'Para fechaduras e armadilhas.', '[]'),
('Giz (6 unidades)', 'adventure_item', 1, '1 Punhado', 'Para marcações rápidas.', '[]'),
('Instrumento Musical', 'adventure_item', 1, '2 Punhados', 'Flauta, alaúde, tambor, etc.', '[]'),
('Lanterna de Óleo', 'adventure_item', 1, '1 Punhado', 'Luz em alcance Médio.', '[]'),
('Mapa Regional', 'adventure_item', 1, '1 Punhado', 'Detalhes de uma área específica.', '[]'),
('Odre', 'adventure_item', 1, '1 Punhado', 'Suporta água para um dia de viagem.', '[]'),
('Pá', 'adventure_item', 1, '1 Punhado', 'Ferramenta de escavação.', '[]'),
('Pé de Cabra', 'adventure_item', 1, '1 Punhado', 'Para forçar entradas. Vantagem em Força.', '[]'),
('Saco de Dormir', 'adventure_item', 1, '1 Punhado', 'Essencial para descansar ao relento.', '[]'),
('Símbolo Sagrado', 'adventure_item', 1, '1 Punhado', 'Medalhão ou ícone religioso.', '[]'),
('Antídoto Geral', 'consumable', 1, '1 Punhado', 'Cura envenenamentos comuns.', '[]'),
('Bálsamo de Ervas', 'consumable', 1, '1 Punhado', 'Recupera +1 Fadiga em Descanso Curto.', '[]'),
('Óleo de Lanterna', 'consumable', 1, '1 Punhado', 'Combustível para uma cena/hora.', '[]'),
('Poção de Cura Menor', 'consumable', 1, '1 Punhado', 'Recupera 1d4 PV.', '[]'),
('Poção de Cura Maior', 'consumable', 1, '4 Punhados', 'Recupera 3d4 PV.', '[]'),
('Poção de Cura Épica', 'consumable', 1, '2 Bolsas', 'Recupera todos os PVs.', '[]'),
('Poção de Vigor Menor', 'consumable', 1, '1 Punhado', 'Recupera 1d4 Fadiga.', '[]'),
('Poção de Vigor Maior', 'consumable', 1, '3 Punhados', 'Recupera toda a Fadiga.', '[]'),
('Sais de Cheiro', 'consumable', 1, '1 Punhado', 'Desperta criaturas inconscientes.', '[]'),
('Suprimentos Básicos', 'consumable', 1, '1 Punhado', 'Rações e água (kit de 3 dias).', '[]'),
('Veneno de Contato', 'consumable', 1, '1 Punhado', '+2 Dano no próximo ataque.', '[]'),
('Veneno Letal', 'consumable', 1, '1 Bolsa', 'Causa d10 de dano por turno até ser curado.', '[]'),
('Veneno Paralisante', 'consumable', 1, '3 Punhados', 'Alvo fica Imobilizado se falhar em Resistência.', '[]'),
('Kit de Alquimia', 'professional_kit', 1, '3 Punhados', 'Permite criar poções simples.', '[]'),
('Kit de Artesão', 'professional_kit', 1, '3 Punhados', 'Reparação de armas e armaduras.', '[]'),
('Kit de Cozinha', 'professional_kit', 1, '1 Punhado', 'Melhora rações; pode curar +1 Stress no grupo.', '[]'),
('Kit de Disfarce', 'professional_kit', 1, '3 Punhados', 'Vantagem em testes para passar por outra pessoa.', '[]'),
('Kit de Escrita', 'professional_kit', 1, '1 Punhado', 'Papel, tinta, penas e cera de selar.', '[]'),
('Kit de Primeiros Socorros', 'professional_kit', 1, '2 Punhados', 'Necessário para estabilizar moribundos.', '[]'),
('Kit de Cartografia', 'professional_kit', 1, '2 Punhados', 'Para desenhar mapas durante a exploração.', '[]');
A L T E R   T A B L E   c h a r a c t e r s   M O D I F Y   C O L U M N   s e s s i o n _ s t a t u s   E N U M ( ' p e n d i n g ' ,   ' a p p r o v e d ' ,   ' d e c e a s e d ' ,   ' s u s p e n d e d ' )   D E F A U L T   N U L L ;  
 