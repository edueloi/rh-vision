ALTER TABLE `units`
ADD COLUMN `country` VARCHAR(255) NULL AFTER `state`;

UPDATE `units`
SET `country` = 'Brasil'
WHERE `country` IS NULL OR TRIM(`country`) = '';
