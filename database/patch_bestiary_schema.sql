-- database/patch_bestiary_schema.sql

-- 1. Tabela para salvar as fichas bases do Bestiário
CREATE TABLE IF NOT EXISTS adversary_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gm_id INT NULL, 
    name VARCHAR(255) NOT NULL,
    tier TINYINT NOT NULL DEFAULT 1,
    type VARCHAR(50) NOT NULL, -- Comum, Lacaio, Brutamonte, etc
    difficulty INT NOT NULL DEFAULT 10,
    hp_max INT NOT NULL DEFAULT 1,
    stress_max INT NOT NULL DEFAULT 0,
    threshold_major INT NULL,
    threshold_severe INT NULL,
    horde_multiplier INT NULL, -- Para Hordas (ex: 2 = 2/PV)
    description TEXT,
    motivations TEXT,
    attack JSON, -- {"modifier": "+2", "name": "Espada", "range": "corpo a corpo", "damage": "1d6+1 fis"}
    experiences JSON, -- [{"name": "Ladino", "modifier": "+2"}]
    abilities JSON, -- [{"type": "action|passive|reaction|fear", "name": "Sopro", "description": "Gaste 1 medo..."}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gm_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Tabela para Grupos de Encontro
CREATE TABLE IF NOT EXISTS encounter_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- 3. Modificar tabela atual de adversários vivos na cena
ALTER TABLE adversaries 
ADD COLUMN encounter_id INT NULL AFTER session_id,
ADD COLUMN template_id INT NULL AFTER encounter_id,
ADD COLUMN current_hp INT NULL AFTER template_id,
ADD COLUMN current_stress INT NULL AFTER current_hp,
ADD FOREIGN KEY (encounter_id) REFERENCES encounter_groups(id) ON DELETE SET NULL,
ADD FOREIGN KEY (template_id) REFERENCES adversary_templates(id) ON DELETE SET NULL;
