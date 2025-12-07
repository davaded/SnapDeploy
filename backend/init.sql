-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS sitepilot;
USE sitepilot;

-- Create Settings Table
CREATE TABLE IF NOT EXISTS Settings (
    `key` VARCHAR(255) NOT NULL,
    `value` JSON NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
);

-- Create Sites Table
CREATE TABLE IF NOT EXISTS Sites (
    `host` VARCHAR(255) NOT NULL,
    `type` ENUM('upload', 'code') DEFAULT 'upload',
    `deployedAt` DATETIME,
    `size` INTEGER DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`host`)
);

-- Insert Default Settings (allowedDomains)
-- Change "sitepilot.local" to your preferred base domain
INSERT IGNORE INTO Settings (`key`, `value`, `createdAt`, `updatedAt`) 
VALUES ('allowedDomains', '["sitepilot.local"]', NOW(), NOW());
