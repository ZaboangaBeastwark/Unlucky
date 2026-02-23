CREATE DATABASE IF NOT EXISTS daggerheart_proto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE daggerheart_proto;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('player', 'gm') NOT NULL DEFAULT 'player',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gm_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    fear_tokens INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gm_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT,
    session_status ENUM('pending', 'approved') DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    class VARCHAR(50),
    subclass VARCHAR(50),
    heritage VARCHAR(100), -- Ancestry and Community
    level INT DEFAULT 1,
    
    -- Resources
    hp_base INT DEFAULT 0,
    hp_current INT DEFAULT 0,
    stress_base INT DEFAULT 6, -- Fatigue/Stress
    stress_current INT DEFAULT 0,
    evasion_base INT DEFAULT 0,
    evasion_current_override INT DEFAULT NULL,
    hope_current INT DEFAULT 0, -- Max 6
    
    -- Armor and Thresholds
    armor_base INT DEFAULT 0,
    armor_slots INT DEFAULT 0,
    threshold_minor INT DEFAULT 0,
    threshold_major INT DEFAULT 0,
    threshold_severe INT DEFAULT 0,
    
    -- JSON Data
    attributes JSON, -- {"agility": 0, "strength": 0, "finesse": 0, "instinct": 0, "presence": 0, "knowledge": 0}
    inventory JSON, -- {"equipped": [], "bag": [], "gold": 0}
    experiences JSON, -- [{"name": "Sneaky", "value": 2}]
    cards JSON, -- Active domain cards
    roleplay_answers JSON, -- Answers to class-specific roleplay questions
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS adversaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('minion', 'average', 'elite', 'solo', 'horde') NOT NULL,
    hp INT DEFAULT 0,
    stress INT DEFAULT 0,
    tier INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS action_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    actor_id INT, -- user_id or character_id depending on context, can be NULL if system
    actor_name VARCHAR(100),
    action_type VARCHAR(50), -- 'roll', 'status_change', 'combat'
    hope_die INT,
    fear_die INT,
    critical BOOLEAN DEFAULT FALSE,
    total INT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
