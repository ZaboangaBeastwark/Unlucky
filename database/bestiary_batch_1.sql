-- database/bestiary_batch_1.sql
-- Inserções das Imagens enviadas da página 211, 213 e 216
INSERT INTO adversary_templates (gm_id, name, tier, type, difficulty, hp_max, stress_max, threshold_major, threshold_severe, horde_multiplier, description, motivations, attack, experiences, abilities) VALUES

-- ======== PÁGINA 211 ========

-- Arbusto Espinhento
(NULL, 'Arbusto Espinhento', 1, 'Lacaio', 11, 1, 1, NULL, NULL, NULL, 'Um aglomerado de vinhas sanguinárias.', 'combinar, drenar, enrolar',
'{"modifier": "-1", "name": "Espinhos", "range": "corpo a corpo", "damage": "2 fis"}',
'[]',
'[{"type": "passive", "name": "Lacaio (4)", "description": "o arbusto-espinhento é derrotado quando sofre qualquer dano. Para cada 4 pontos de dano... um lacaio adicional no alcance... é derrotado."}, {"type": "action", "name": "Ataque em Grupo", "description": "gaste 1 Ponto de Medo para escolher um alvo e pôr em foco todos os arbustos... compartilhado."}, {"type":"reaction", "name":"Drenar e Multiplicar", "description":"quando há três ou mais... e um ataque causar PV, você pode combinar os lacaios em um enxame. PV da horda equivalem ao número de lacaios."}]'),

-- Bando de Ratos
(NULL, 'Bando de Ratos', 1, 'Horda', 10, 6, 2, 6, 10, 10, 'Um amontoado de roedores se movendo como uma onda faminta.', 'consumir, enxamear, obscurecer',
'{"modifier": "-3", "name": "Garras", "range": "corpo a corpo", "damage": "1d8+2 fis"}',
'[]',
'[{"type": "passive", "name": "Horda (1d4+1)", "description": "quando o bando de ratos tiver marcado metade de seus Pontos de Vida ou mais, seu ataque padrão causa 1d4+1 pontos de dano físico."}, {"type": "passive", "name": "Por Toda Parte", "description": "todos os alvos em alcance cac fazem testes de ataque contra alvos que não sejam o bando com desvantagem."}]'),

-- Cobra-de-vidro
(NULL, 'Cobra-de-vidro', 1, 'Comum', 14, 5, 3, 6, 10, NULL, 'Uma serpente translúcida com uma cabeça imensa, que deixa um rastro de vidro por onde passa.', 'assustar, comer, escalar, manter distância',
'{"modifier": "+2", "name": "Presas de vidro", "range": "muito próximo", "damage": "1d8+2 fis"}',
'[]',
'[{"type": "passive", "name": "Cacos Antiarmadura", "description": "após acertar um ataque corpo a corpo contra a cobra-de-vidro, o atacante deve marcar 1 Ponto de Armadura. Se não for possível, marcar 1 PV."}, {"type": "action", "name": "Cuspideira", "description": "gaste 1 Ponto de Medo para transformar 1d6 no Dado de Cuspida..."}, {"type": "action", "name": "Serpente Giratória", "description": "marque 1 Ponto de Fadiga para fazer um ataque contra todos os alvos muito próximos. Alvos atingidos sofrem 1d6+1 físico"}]'),

-- Enxame de Arbustos
(NULL, 'Enxame de Arbustos', 1, 'Horda', 12, 6, 3, 6, 11, 3, 'Um aglomerado de vinhas sanguinárias, cada uma tão grande quanto uma cabeça.', 'digerir, enrolar, imobilizar',
'{"modifier": "+0", "name": "Espinhos", "range": "corpo a corpo", "damage": "1d6+3 fis"}',
'[{"name": "Camuflagem", "modifier": "+2"}]',
'[{"type": "passive", "name": "Horda (1d4+2)", "description": "quando os arbustos tiverem marcado metade de seus PV ou mais, seu ataque causa 1d4+2 de dano físico."}, {"type": "action", "name": "Esmagar", "description": "marque 1 Ponto de Fadiga para causar 2d6+8 de dano físico direto a um alvo com 3 Marcadores..."}, {"type": "reaction", "name": "Atravancar", "description": "quando o arbusto acertar um ataque, o alvo recebe 1 Marcador. 1 = Imobilizado. 3 = Vulnerável..."}]'),

-- ======== PÁGINA 213 (e trechos de Cima) ========

-- Demônio Menor
(NULL, 'Demônio Menor', 1, 'Solo', 14, 8, 4, 8, 15, NULL, 'Uma criatura avermelhada vinda dos Círculos Inferiores, consumida por sua ira contra todos os mortais.', 'encurralar, flagelar, ser errático, sorver dor',
'{"modifier": "+3", "name": "Garras", "range": "corpo a corpo", "damage": "1d8+6 fis"}',
'[]',
'[{"type": "passive", "name": "Inclemente (2)", "description": "o demônio pode ser posto em foco até 2 vezes por turno do mestre..."}, {"type": "passive", "name": "Tudo Deve Ruir", "description": "se um personagem estiver próximo do demônio e falhar com Medo, ele perde 1 Ponto de Esperança."}, {"type": "action", "name": "Fogo Infernal", "description": "gaste 1 Ponto de Medo para fazer chover o fogo do inferno em alcance Próximo. Alvos sofrem 1d20+3 dano mágico, Evasão para metade."}, {"type":"reaction", "name":"Ceifador", "description":"antes de dano mágico, pode marcar fadiga para aumentar."}, {"type":"reaction", "name":"Impulso", "description":"quando acertar ataque, receba 1 Medo"}]'),

-- Construto
(NULL, 'Construto', 1, 'Solo', 13, 9, 4, 7, 15, NULL, 'Quase um humanoide de pedra e aço, feito e animado por magia.', 'atropelar grupos, destruir ambientes, esmagar alvo, servir criador',
'{"modifier": "+4", "name": "Punhos poderosos", "range": "corpo a corpo", "damage": "1d20 fis"}',
'[]',
'[{"type": "passive", "name": "Estrutura frágil", "description": "quando o construto marca Pontos de Vida por dano físico, ele marca 1 PV adicional."}, {"type": "passive", "name": "Inclemente (2)", "description": "foco até 2 vezes por turno mestre."}, {"type":"action", "name":"Atropelar", "description":"marque 1 PF para fazer um ataque contra todos no caminho."}, {"type":"reaction", "name":"Sobrecarga", "description":"marque 1 PF para receber bônus de +10 na rolagem de dano..."}, {"type":"reaction", "name":"Terremoto da Morte", "description":"quando zerar PV... 1d12+2 mágico aos próximos."}]'),

-- Dríade Jovem
(NULL, 'Dríade Jovem', 1, 'Líder', 11, 6, 2, 6, 11, NULL, 'Uma pessoa-árvore autoritária que lidera as defesas da floresta.', 'comandar, eliminar intrusos, nutrir',
'{"modifier": "+0", "name": "Foice", "range": "corpo a corpo", "damage": "1d8+5 fis"}',
'[{"name": "Liderança", "modifier": "+3"}]',
'[{"type": "action", "name": "Prisão de Espinhos", "description": "gaste 1 Medo para formar uma jaula. Imobilizado até Força."}, {"type": "action", "name": "Voz da Floresta", "description": "marque 1 PF para pôr em foco 1d4 aliados."}, {"type":"reaction", "name":"Impulso", "description":"acertou ataque, ganha 1 Medo."}]'),

-- Defensor Enraizado
(NULL, 'Defensor Enraizado', 1, 'Brutamonte', 10, 7, 3, 8, 14, NULL, 'Uma pessoa-vegetal robusta com vinhas capazes de agarrar.', 'agarar, emboscar, proteger, socar',
'{"modifier": "+2", "name": "Vinhas", "range": "próximo", "damage": "1d8+3 fis"}',
'[{"name": "Imenso", "modifier": "+3"}]',
'[{"type": "action", "name": "Arrebatar", "description": "faça um ataque. Se o atingir, gaste 1 Medo para puxá-lo para corpo a corpo, 1d6+2 dano e Imobilizado."}, {"type": "action", "name": "Golpear o chão", "description": "faça ataque contra um ponto próximo..."}]'),

-- Elemental Menor do Caos
(NULL, 'Elemental Menor do Caos', 1, 'Solo', 14, 7, 3, 7, 14, NULL, 'Uma massa reluzente de magia incontrolável.', 'confundir, desestabilizar, metamorfosear',
'{"modifier": "+3", "name": "Golpe distorcido", "range": "próximo", "damage": "1d12+6 mág"}',
'[]',
'[{"type": "passive", "name": "Forma Arcana", "description": "o elemental é resistente a dano mágico."}, {"type": "action", "name": "Fluxo Pestilento", "description": "1 PF para Vulnerável."}, {"type":"action", "name":"Refazer Realidade", "description":"1 Medo para transformar área. 2d6+3 dano mágico direto."}, {"type":"reaction", "name":"Impulso", "description":"1 Medo ao acerto."}, {"type":"reaction", "name":"Reflexo Mágico", "description":"quando sofre dano mágico de perto, causa metade no atacante."}]'),


-- ======== PÁGINA 216 ========

-- Guarda Chefe (Foi feito no Canônico, vou ignorar pra n duplicar)
-- Lobo Atroz
(NULL, 'Lobo Atroz', 1, 'Oportunista', 12, 4, 3, 5, 9, NULL, 'Um grande lobo com dentes ameaçadores, raramente visto sozinho.', 'arrastar, atormentar, cercar, defender território',
'{"modifier": "+2", "name": "Garras", "range": "corpo a corpo", "damage": "1d6+2 fis"}',
'[{"name": "Sentidos Aguçados", "modifier": "+3"}]',
'[{"type": "passive", "name": "Táticas de Bando", "description": "se acertar e houver outro lobo corpo a corpo: 1d6+5 físico e recebe 1 Medo."}, {"type": "action", "name": "Golpe Debilitante", "description": "1 PF para 3d4+10 físico direito e Vulnerável"}]'),

-- Guerreiro Arcano
(NULL, 'Guerreiro Arcano', 1, 'Líder', 14, 6, 3, 8, 14, NULL, 'Um mercenário que combina aço e magia de maneira letal.', 'comandar, golpear, resistir',
'{"modifier": "+3", "name": "Espada longa mágica", "range": "cac", "damage": "1d8+4 fis/mág"}',
'[{"name": "Conhecimento Mágico", "modifier": "+2"}]',
'[{"type": "passive", "name": "Aço Arcano", "description": "dano físico e mágico ao mesmo tempo."}, {"type": "action", "name": "Explosão Opressora", "description": "1 PF para teste de Agilidade 1d8+2 mágico."}, {"type": "action", "name": "Movimento de Unidade", "description": "2 Medo para por em foco até cinco aliados Distantes."}, {"type": "reaction", "name":"Impulso", "description":"1 Medo"}]'),

-- Lodo Verde
(NULL, 'Lodo Verde', 1, 'Oportunista', 8, 5, 2, 5, 10, NULL, 'Um monte vivo feito de gosma verde translúcida.', 'camuflagem, consumir, se multiplicar',
'{"modifier": "+1", "name": "Tentáculo de lodo", "range": "corpo a corpo", "damage": "1d6+1 mág"}',
'[{"name": "Camuflagem", "modifier": "+3"}]',
'[{"type": "passive", "name": "Forma Ácida", "description": "alvo perde proteção de armadura se acertar."}, {"type": "passive", "name": "Lentidão", "description": "precisa arrastar para focar, etc..."}, {"type":"reaction", "name":"Agora São Dois", "description":"gaste 1 Medo para dividir..."}]'),

-- Lodo Verde Pequeno
(NULL, 'Lodo Verde Pequeno', 1, 'Oportunista', 14, 2, 1, 4, NULL, NULL, 'Um montinho vivo feito de gosma verde translúcida.', 'camuflagem, esgueirar',
'{"modifier": "-1", "name": "Tentáculo de lodo", "range": "corpo a corpo", "damage": "1d4+1 mág"}',
'[]',
'[{"type": "passive", "name": "Forma Ácida", "description": "ácido tira PA..."}]'),

-- Lodo Vermelho
(NULL, 'Lodo Vermelho', 1, 'Oportunista', 10, 5, 3, 6, 11, NULL, 'Um monte vivo flamejante.', 'camuflagem, incendiar, inflamar',
'{"modifier": "+1", "name": "Tentáculo de lodo", "range": "corpo a corpo", "damage": "1d8+3 mág"}',
'[{"name": "Camuflagem", "modifier": "+3"}]',
'[{"type":"passive", "name":"Fogo Crepitante", "description":"incendeia objetos"}, {"type":"action", "name":"Incendiar", "description":"Em Chamas..."}]');
