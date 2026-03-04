-- database/seed_canonical_bestiary.sql
INSERT INTO adversary_templates (gm_id, name, tier, type, difficulty, hp_max, stress_max, threshold_major, threshold_severe, horde_multiplier, description, motivations, attack, experiences, abilities) VALUES
-- 1. LACAIO
(NULL, 'Rato Gigante', 1, 'Lacaio', 10, 1, 1, NULL, NULL, NULL, 'Um roedor do tamanho de um gato, habituado a sobreviver.', 'cavar, coletar, desgastar, fome', 
'{"modifier": "-4", "name": "Garras", "range": "corpo a corpo", "damage": "1 fis"}', 
'[{"name": "Sentidos Aguçados", "modifier": "+3"}]', 
'[{"type": "passive", "name": "Lacaio (3)", "description": "o rato é derrotado quando sofre qualquer dano. Para cada 3 pontos de dano..."}, {"type": "action", "name": "Ataque em Grupo", "description": "gaste 1 Ponto de Medo para escolher um alvo e pôr em foco todos os ratos gigantes..."}]'),

(NULL, 'Diabrete Bajulador', 3, 'Lacaio', 17, 1, 1, NULL, NULL, NULL, 'Um demônio que se curva diante de seu senhor.', 'defender, enganar, idolatrar', 
'{"modifier": "+0", "name": "Garras", "range": "corpo a corpo", "damage": "7 fis"}', 
'[]', 
'[{"type": "passive", "name": "Lacaio (8)", "description": "o diabrete é derrotado quando sofre qualquer dano..."}, {"type": "action", "name": "Ataque em Grupo", "description": "gaste 1 Ponto de Medo..."}]'),

-- 2. HORDA
(NULL, 'Horda de Zumbis', 1, 'Horda', 8, 6, 3, 6, 12, 2, 'Um grupo de cadáveres cambaleantes se movendo juntos por instinto.', 'consumir carne, fome, machucar', 
'{"modifier": "-1", "name": "Mordida", "range": "corpo a corpo", "damage": "1d10+2 fis"}', 
'[]', 
'[{"type": "passive", "name": "Horda (1d4+2)", "description": "quando os zumbis tiverem marcado metade de seus Pontos de Vida ou mais..."}, {"type": "reaction", "name": "Exceder", "description": "quando os zumbis marcarem Pontos de Vida por causa de um ataque corpo a corpo..."}]'),

-- 3. COMUM
(NULL, 'Guarda Armado', 1, 'Comum', 12, 5, 2, 5, 9, NULL, 'Um guarda de armadura portando uma espada e um escudo pintado.', 'chegar ao fim do dia, fechar portões, imobilizar, prender', 
'{"modifier": "+1", "name": "Espada longa", "range": "corpo a corpo", "damage": "1d6+1 fis"}', 
'[{"name": "Conhecimento Local", "modifier": "+3"}]', 
'[{"type": "passive", "name": "Parede de Escudos", "description": "uma criatura que tente se mover para muito próximo do guarda precisa passar..."}]'),

-- 4. ASSISTENTE
(NULL, 'Druida da Floresta', 1, 'Assistente', 11, 4, 5, 6, 10, NULL, 'Um andarilho recluso capaz de se comunicar com plantas e animais.', 'clamar à natureza, não deixar rastros, proteger as florestas', 
'{"modifier": "+0", "name": "Cajado de carvalho", "range": "corpo a corpo", "damage": "1d4+2 mág"}', 
'[{"name": "Conhecimento Animal", "modifier": "+2"}, {"name": "Saber do Terreno", "modifier": "+3"}]', 
'[{"type": "action", "name": "Calmaria do Vale", "description": "marque 1 Ponto de Fadiga para encerrar o efeito de um feitiço..."}]'),

-- 5. ATIRADOR
(NULL, 'Caçador da Vastidão Gélida', 2, 'Atirador', 13, 5, 4, 7, 14, NULL, 'Um sobrevivente que viaja pela vastidão gélida atrás de caças.', 'caçar, perseverar, rastrear, resgatar', 
'{"modifier": "+3", "name": "Arco longo", "range": "distante", "damage": "2d12+6 fis"}', 
'[{"name": "Navegação", "modifier": "+2"}, {"name": "Sobrevivência", "modifier": "+3"}]', 
'[{"type": "passive", "name": "Mira Firme", "description": "marque 1 Ponto de Fadiga para dar vantagem..."}]'),

-- 6. BRUTAMONTE
(NULL, 'Minotauro Arrasador', 2, 'Brutamonte', 16, 7, 5, 14, 27, NULL, 'Um imenso firbolg com cabeça de touro e pavio curto.', 'consumir, estraçalhar, navegar, perseguir', 
'{"modifier": "+2", "name": "Machado de batalha", "range": "muito próximo", "damage": "2d8+5 fis"}', 
'[{"name": "Navegação", "modifier": "+2"}]', 
'[{"type": "passive", "name": "Vocês Vão Se Ver Comigo", "description": "é preciso gastar 1 Ponto de Medo para pôr o minotauro em foco..."}]'),

-- 7. MANIPULADOR
(NULL, 'Comerciante', 1, 'Manipulador', 12, 3, 3, 4, 8, NULL, 'Um mercador bem trajado com olhar aguçado para obter lucro.', 'buscar lucro, comprar barato e vender caro', 
'{"modifier": "-4", "name": "Porrete", "range": "corpo a corpo", "damage": "1d4+1 fis"}', 
'[{"name": "Negociante Astuto", "modifier": "+3"}]', 
'[{"type": "passive", "name": "Enrolação", "description": "quando um personagem rolar 14 ou menos em testes de Presença..."}]'),

-- 8. OPORTUNISTA
(NULL, 'Sombra Punhal Escarpado', 1, 'Oportunista', 12, 3, 3, 4, 8, NULL, 'Um canalha ágil portando uma faca perigosa e usando sombras ágeis.', 'dividir, emboscar, esconder, lucrar', 
'{"modifier": "+1", "name": "Adagas", "range": "corpo a corpo", "damage": "1d4+4 fis"}', 
'[{"name": "Intruso", "modifier": "+3"}]', 
'[{"type": "passive", "name": "Golpe Traiçoeiro", "description": "quando a sombra for bem-sucedida em um ataque padrão..."}]'),

-- 9. LÍDER
(NULL, 'Guarda Chefe', 1, 'Líder', 15, 7, 3, 7, 13, NULL, 'Um guarda experiente com uma maça, um apito e um vozeirão.', 'buscar glória, fechar portões, imobilizar', 
'{"modifier": "+4", "name": "Maça", "range": "corpo a corpo", "damage": "1d10+4 fis"}', 
'[{"name": "Comandante", "modifier": "+2"}, {"name": "Conhecimento Local", "modifier": "+2"}]', 
'[{"type": "action", "name": "Reunir a Guarda", "description": "gaste 2 Pontos de Medo para pôr o guarda chefe em foco..."}]'),

-- 10. SOLO
(NULL, 'Oscilume Jovem', 2, 'Solo', 14, 10, 5, 13, 26, NULL, 'Um inseto grande como um cavalo, com escamas iridescentes e asas.', 'arrebatar, caçar, colecionar', 
'{"modifier": "+3", "name": "Asas afiadas", "range": "muito próximo", "damage": "2d10+4 fis"}', 
'[]', 
'[{"type": "passive", "name": "Inclemente (3)", "description": "o oscilume pode ser posto em foco até 3 vezes por turno do mestre..."}]');
