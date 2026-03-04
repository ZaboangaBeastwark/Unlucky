-- database/bestiary_batch_1_part2.sql
INSERT INTO adversary_templates (gm_id, name, tier, type, difficulty, hp_max, stress_max, threshold_major, threshold_severe, horde_multiplier, description, motivations, attack, experiences, abilities) VALUES

-- ======== PÁGINA 213 ========

-- Escorpião Gigante
(NULL, 'Escorpião Gigante', 1, 'Brutamonte', 13, 6, 3, 7, 13, NULL, 'Um aracnídeo grande como um homem com garras terríveis e um ferrão na cauda.', 'alimentar-se, agarrar, emboscar',
'{"modifier": "+1", "name": "Pinças", "range": "corpo a corpo", "damage": "1d12+2 fis"}',
'[{"name": "Camuflagem", "modifier": "+2"}]',
'[{"type": "action", "name": "Ataque Duplo", "description": "marque 1 PF para fazer um ataque padrão contra 2 alvos."}, {"type": "action", "name": "Ferrão Peçonhento", "description": "1 PF para ataque em alvo muito próximo... em sucesso: gaste 1 Medo para o alvo sofrer 1d4+4 fis e Envenenado."}, {"type": "reaction", "name": "Impulso", "description": "ganha 1 Medo após acerto"}]'),

-- Esqueleto Arqueiro
(NULL, 'Esqueleto Arqueiro', 1, 'Atirador', 9, 3, 2, 4, 7, NULL, 'Um esqueleto frágil com um arco curto e flechas.', 'fingir de morto, perfurar alvos',
'{"modifier": "+2", "name": "Arco curto", "range": "distante", "damage": "1d8+1 fis"}',
'[]',
'[{"type": "passive", "name": "Oportunista", "description": "quando dois ou mais adversários estiverem muito próximos de uma criatura, todo dano causam o dobro."}, {"type": "action", "name": "Tiro Mortal", "description": "ataque contra um alvo vulnerável. Em acerto: marque 1 PF e cause 3d4+8 físico."}]'),

-- Esqueleto Arruinado
(NULL, 'Esqueleto Arruinado', 1, 'Lacaio', 8, 1, 1, NULL, NULL, NULL, 'Uma pilha barulhenta de ossos.', 'desmoronar, fingir de morto, roubar pele',
'{"modifier": "-1", "name": "Garras ósseas", "range": "corpo a corpo", "damage": "1 fis"}',
'[]',
'[{"type": "passive", "name": "Lacaio (4)", "description": "mesma passiva de lacaio."}, {"type": "action", "name": "Ataque em Grupo", "description": "1 Medo para atacar em grupo com mesma mecânica..."}]'),

-- Esqueleto Guerreiro
(NULL, 'Esqueleto Guerreiro', 1, 'Comum', 10, 5, 2, 5, 10, NULL, 'Um esqueleto empoeirado, armado com uma lâmina enferrujada.', 'agrupar, fingir de morto',
'{"modifier": "+0", "name": "Espada", "range": "corpo a corpo", "damage": "1d6+2 fis"}',
'[]',
'[{"type": "passive", "name": "Puro Osso", "description": "o guerreiro é resistente a dano físico."}, {"type": "reaction", "name": "Nunca Morre", "description": "quando derrotado, 1d6. Com 6... recupere os PV e levanta."}]'),

-- Esqueleto Cavaleiro
(NULL, 'Esqueleto Cavaleiro', 1, 'Brutamonte', 13, 5, 2, 7, 13, NULL, 'Um grande esqueleto blindado com uma espada imensa.', 'destruir, matar, poupar pele',
'{"modifier": "+2", "name": "Espada grande enferrujada", "range": "corpo a corpo", "damage": "1d10+2 fis"}',
'[]',
'[{"type": "passive", "name": "Aterrorizante", "description": "quando acerta 1 ataque, todos perdem 1 Esperança. E receba 1 Medo."}, {"type": "action", "name": "Cortar Até o Osso", "description": "1 PF para atacar todos os muito próximos... 1d8+2 fis e 1 fadiga."}, {"type": "reaction", "name": "Cova Dupla", "description": "Quando derrotado ataca alvo muito próximo (prioriza com quem derrotou), 1d4+8 fis e diminui dor..."}]'),

-- Guarda Arqueiro (Companheiro do Guarda Armado e Guarda Chefe)
(NULL, 'Guarda Arqueiro', 1, 'Atirador', 10, 3, 2, 4, 8, NULL, 'Um guarda alto portando um arco longo e uma aljava com flechas.', 'chegar ao fim do dia, fechar portões',
'{"modifier": "+1", "name": "Arco longo", "range": "distante", "damage": "1d8+3 fis"}',
'[{"name": "Conhecimento Local", "modifier": "+3"}]',
'[{"type": "action", "name": "Tiro Debilitante", "description": "faça um ataque distante. Em sucesso, marque 1 PF para 1d12+3 físico E alvo perde Pontos de Vida, passa a... causar desvantagem em testes de Agilidade."}]');
