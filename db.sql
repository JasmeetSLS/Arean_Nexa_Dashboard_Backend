-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               8.0.43 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.15.0.7171
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for skill_contest_portal
CREATE DATABASE IF NOT EXISTS `skill_contest_portal` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `skill_contest_portal`;

-- Dumping structure for table skill_contest_portal.admin
CREATE TABLE IF NOT EXISTS `admin` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(60) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_name` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sender_type` enum('admin','trainer') NOT NULL,
  `sender_id` int NOT NULL,
  `receiver_type` enum('admin','trainer') NOT NULL,
  `receiver_id` int NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sender` (`sender_type`,`sender_id`,`id`),
  KEY `idx_receiver` (`receiver_type`,`receiver_id`,`id`),
  KEY `idx_unread` (`receiver_type`,`receiver_id`,`is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.participant_rounds
CREATE TABLE IF NOT EXISTS `participant_rounds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `trainer_id` varchar(120) DEFAULT NULL,
  `round_name` varchar(50) NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `score` tinyint unsigned DEFAULT NULL COMMENT 'Max 30; NULL while running',
  `end_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_round_mspin` (`mpin`),
  CONSTRAINT `chk_score` CHECK (((`score` is null) or (`score` between 0 and 30)))
) ENGINE=InnoDB AUTO_INCREMENT=1041 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.participants
CREATE TABLE IF NOT EXISTS `participants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `project_name` varchar(150) DEFAULT NULL,
  `mpin` varchar(20) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `zone` varchar(30) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `dealer_name` varchar(80) DEFAULT NULL,
  `dealer_code` varchar(20) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_mspin` (`mpin`)
) ENGINE=InnoDB AUTO_INCREMENT=361 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.project_round_config
CREATE TABLE IF NOT EXISTS `project_round_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `project_name` varchar(150) NOT NULL,
  `total_rounds` tinyint unsigned NOT NULL DEFAULT '5',
  `total_score` int unsigned NOT NULL DEFAULT '100',
  `passing_percentage` decimal(5,2) NOT NULL DEFAULT '80.00',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project` (`project_name`),
  CONSTRAINT `chk_pass_pct` CHECK ((`passing_percentage` between 0 and 100)),
  CONSTRAINT `chk_rounds` CHECK ((`total_rounds` between 1 and 20))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.setup_config
CREATE TABLE IF NOT EXISTS `setup_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `project_name` varchar(150) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.setup_field_master
CREATE TABLE IF NOT EXISTS `setup_field_master` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `setup_config_id` int unsigned NOT NULL,
  `field_key` varchar(60) NOT NULL,
  `field_group` varchar(40) NOT NULL,
  `field_order` smallint unsigned NOT NULL DEFAULT '0',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `is_selected` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config` (`setup_config_id`),
  KEY `idx_order` (`field_order`,`sort_order`),
  CONSTRAINT `fk_field_master_config` FOREIGN KEY (`setup_config_id`) REFERENCES `setup_config` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.trainers
CREATE TABLE IF NOT EXISTS `trainers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `username` varchar(60) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_trainer_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.user_permission
CREATE TABLE IF NOT EXISTS `user_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `setup_config_id` int unsigned NOT NULL,
  `allowed_roles` json NOT NULL,
  `allowed_zones` json NOT NULL,
  `allowed_regions` json NOT NULL,
  `permissions` json NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_setup` (`user_id`,`setup_config_id`),
  KEY `fk_up_config` (`setup_config_id`),
  CONSTRAINT `fk_up_admin` FOREIGN KEY (`user_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_up_config` FOREIGN KEY (`setup_config_id`) REFERENCES `setup_config` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.user_result
CREATE TABLE IF NOT EXISTS `user_result` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `trainer_id` varchar(60) DEFAULT NULL,
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'sum(score)/150*100',
  `status` enum('Pass','Fail') NOT NULL DEFAULT 'Fail',
  `rounds_status` enum('In Progress','Completed') NOT NULL DEFAULT 'In Progress',
  `total_time` varchar(10) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_result_mspin` (`mpin`)
) ENGINE=InnoDB AUTO_INCREMENT=361 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_delete` AFTER DELETE ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_exists          INT DEFAULT 0;
    DECLARE v_total_score     INT DEFAULT 0;
    DECLARE v_max_score       INT DEFAULT 100;
    DECLARE v_passing_pct     DECIMAL(5,2) DEFAULT 70.00;
    DECLARE v_required_rounds INT DEFAULT 5;
    DECLARE v_percentage      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status          VARCHAR(4) DEFAULT 'Fail';
    DECLARE v_rounds_status   VARCHAR(15) DEFAULT 'In Progress';
    DECLARE v_latest_trainer  VARCHAR(60);
    DECLARE v_finished        INT DEFAULT 0;
    DECLARE v_round_start     DATETIME;
    DECLARE v_last_end        DATETIME;
    DECLARE v_total_secs      BIGINT DEFAULT 0;
    DECLARE v_total_time      VARCHAR(10) DEFAULT '00:00:00';

    SELECT c.total_score, c.passing_percentage, c.total_rounds
      INTO v_max_score, v_passing_pct, v_required_rounds
      FROM participants p
      JOIN project_round_config c
        ON c.project_name = p.project_name
       AND c.status = 'active'
     WHERE p.mpin = OLD.mpin
     LIMIT 1;

    IF v_max_score IS NULL OR v_max_score = 0 THEN SET v_max_score = 100; END IF;
    IF v_passing_pct IS NULL THEN SET v_passing_pct = 70.00; END IF;
    IF v_required_rounds IS NULL OR v_required_rounds < 1 THEN SET v_required_rounds = 5; END IF;

    SELECT COALESCE(SUM(score), 0) INTO v_total_score
      FROM participant_rounds
     WHERE mpin = OLD.mpin AND score IS NOT NULL;

    SET v_percentage = ROUND((v_total_score / v_max_score) * 100, 2);

    IF v_percentage > v_passing_pct THEN SET v_status = 'Pass';
    ELSE                                SET v_status = 'Fail';
    END IF;

    SELECT trainer_id INTO v_latest_trainer
      FROM participant_rounds
     WHERE mpin = OLD.mpin
     ORDER BY id DESC
     LIMIT 1;

    SELECT SUM(score IS NOT NULL AND end_time IS NOT NULL) INTO v_finished
      FROM participant_rounds
     WHERE mpin = OLD.mpin;

    IF v_finished >= v_required_rounds THEN SET v_rounds_status = 'Completed';
    ELSE                                    SET v_rounds_status = 'In Progress';
    END IF;

    SELECT MIN(start_time) INTO v_round_start
      FROM participant_rounds WHERE mpin = OLD.mpin;

    SELECT MAX(end_time) INTO v_last_end
      FROM participant_rounds
     WHERE mpin = OLD.mpin AND score IS NOT NULL AND end_time IS NOT NULL;

    IF v_finished > 0 AND v_round_start IS NOT NULL AND v_last_end IS NOT NULL THEN
        SET v_total_secs = TIMESTAMPDIFF(SECOND, v_round_start, v_last_end);
        IF v_total_secs < 0 THEN SET v_total_secs = 0; END IF;
    END IF;

    SET v_total_time = CONCAT(
        LPAD(FLOOR(v_total_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_total_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_total_secs % 60, 2, '0'));

    SELECT COUNT(*) INTO v_exists
      FROM user_result
     WHERE mpin = OLD.mpin;

    IF v_exists > 0 THEN
        UPDATE user_result
           SET trainer_id    = v_latest_trainer,
               percentage    = v_percentage,
               status        = v_status,
               rounds_status = v_rounds_status,
               total_time    = v_total_time,
               updated_at    = CURRENT_TIMESTAMP
         WHERE mpin = OLD.mpin;
    ELSE
        INSERT INTO user_result
            (mpin, trainer_id, percentage, status, rounds_status, total_time)
        VALUES
            (OLD.mpin, v_latest_trainer, v_percentage, v_status,
             v_rounds_status, v_total_time);
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_insert` AFTER INSERT ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_exists          INT DEFAULT 0;
    DECLARE v_total_score     INT DEFAULT 0;
    DECLARE v_max_score       INT DEFAULT 100;
    DECLARE v_passing_pct     DECIMAL(5,2) DEFAULT 70.00;
    DECLARE v_required_rounds INT DEFAULT 5;
    DECLARE v_percentage      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status          VARCHAR(4) DEFAULT 'Fail';
    DECLARE v_rounds_status   VARCHAR(15) DEFAULT 'In Progress';
    DECLARE v_latest_trainer  VARCHAR(60);
    DECLARE v_finished        INT DEFAULT 0;
    DECLARE v_round_start     DATETIME;
    DECLARE v_last_end        DATETIME;
    DECLARE v_total_secs      BIGINT DEFAULT 0;
    DECLARE v_total_time      VARCHAR(10) DEFAULT '00:00:00';

    -- Config for this participant's project
    SELECT c.total_score, c.passing_percentage, c.total_rounds
      INTO v_max_score, v_passing_pct, v_required_rounds
      FROM participants p
      JOIN project_round_config c
        ON c.project_name = p.project_name
       AND c.status = 'active'
     WHERE p.mpin = NEW.mpin
     LIMIT 1;

    IF v_max_score IS NULL OR v_max_score = 0 THEN SET v_max_score = 100; END IF;
    IF v_passing_pct IS NULL THEN SET v_passing_pct = 70.00; END IF;
    IF v_required_rounds IS NULL OR v_required_rounds < 1 THEN SET v_required_rounds = 5; END IF;

    -- Sum of scores
    SELECT COALESCE(SUM(score), 0) INTO v_total_score
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL;

    SET v_percentage = ROUND((v_total_score / v_max_score) * 100, 2);

    IF v_percentage > v_passing_pct THEN SET v_status = 'Pass';
    ELSE                                SET v_status = 'Fail';
    END IF;

    -- Latest trainer_id (username)
    SELECT trainer_id INTO v_latest_trainer
      FROM participant_rounds
     WHERE mpin = NEW.mpin
     ORDER BY id DESC
     LIMIT 1;

    -- Finished rounds
    SELECT SUM(score IS NOT NULL AND end_time IS NOT NULL) INTO v_finished
      FROM participant_rounds
     WHERE mpin = NEW.mpin;

    IF v_finished >= v_required_rounds THEN SET v_rounds_status = 'Completed';
    ELSE                                    SET v_rounds_status = 'In Progress';
    END IF;

    -- Time span
    SELECT MIN(start_time) INTO v_round_start
      FROM participant_rounds WHERE mpin = NEW.mpin;

    SELECT MAX(end_time) INTO v_last_end
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL AND end_time IS NOT NULL;

    IF v_finished > 0 AND v_round_start IS NOT NULL AND v_last_end IS NOT NULL THEN
        SET v_total_secs = TIMESTAMPDIFF(SECOND, v_round_start, v_last_end);
        IF v_total_secs < 0 THEN SET v_total_secs = 0; END IF;
    END IF;

    SET v_total_time = CONCAT(
        LPAD(FLOOR(v_total_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_total_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_total_secs % 60, 2, '0'));

    -- Upsert user_result
    SELECT COUNT(*) INTO v_exists
      FROM user_result
     WHERE mpin = NEW.mpin;

    IF v_exists > 0 THEN
        UPDATE user_result
           SET trainer_id    = v_latest_trainer,
               percentage    = v_percentage,
               status        = v_status,
               rounds_status = v_rounds_status,
               total_time    = v_total_time,
               updated_at    = CURRENT_TIMESTAMP
         WHERE mpin = NEW.mpin;
    ELSE
        INSERT INTO user_result
            (mpin, trainer_id, percentage, status, rounds_status, total_time)
        VALUES
            (NEW.mpin, v_latest_trainer, v_percentage, v_status,
             v_rounds_status, v_total_time);
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_update` AFTER UPDATE ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_exists          INT DEFAULT 0;
    DECLARE v_total_score     INT DEFAULT 0;
    DECLARE v_max_score       INT DEFAULT 100;
    DECLARE v_passing_pct     DECIMAL(5,2) DEFAULT 70.00;
    DECLARE v_required_rounds INT DEFAULT 5;
    DECLARE v_percentage      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status          VARCHAR(4) DEFAULT 'Fail';
    DECLARE v_rounds_status   VARCHAR(15) DEFAULT 'In Progress';
    DECLARE v_latest_trainer  VARCHAR(60);
    DECLARE v_finished        INT DEFAULT 0;
    DECLARE v_round_start     DATETIME;
    DECLARE v_last_end        DATETIME;
    DECLARE v_total_secs      BIGINT DEFAULT 0;
    DECLARE v_total_time      VARCHAR(10) DEFAULT '00:00:00';

    SELECT c.total_score, c.passing_percentage, c.total_rounds
      INTO v_max_score, v_passing_pct, v_required_rounds
      FROM participants p
      JOIN project_round_config c
        ON c.project_name = p.project_name
       AND c.status = 'active'
     WHERE p.mpin = NEW.mpin
     LIMIT 1;

    IF v_max_score IS NULL OR v_max_score = 0 THEN SET v_max_score = 100; END IF;
    IF v_passing_pct IS NULL THEN SET v_passing_pct = 70.00; END IF;
    IF v_required_rounds IS NULL OR v_required_rounds < 1 THEN SET v_required_rounds = 5; END IF;

    SELECT COALESCE(SUM(score), 0) INTO v_total_score
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL;

    SET v_percentage = ROUND((v_total_score / v_max_score) * 100, 2);

    IF v_percentage > v_passing_pct THEN SET v_status = 'Pass';
    ELSE                                SET v_status = 'Fail';
    END IF;

    SELECT trainer_id INTO v_latest_trainer
      FROM participant_rounds
     WHERE mpin = NEW.mpin
     ORDER BY id DESC
     LIMIT 1;

    SELECT SUM(score IS NOT NULL AND end_time IS NOT NULL) INTO v_finished
      FROM participant_rounds
     WHERE mpin = NEW.mpin;

    IF v_finished >= v_required_rounds THEN SET v_rounds_status = 'Completed';
    ELSE                                    SET v_rounds_status = 'In Progress';
    END IF;

    SELECT MIN(start_time) INTO v_round_start
      FROM participant_rounds WHERE mpin = NEW.mpin;

    SELECT MAX(end_time) INTO v_last_end
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL AND end_time IS NOT NULL;

    IF v_finished > 0 AND v_round_start IS NOT NULL AND v_last_end IS NOT NULL THEN
        SET v_total_secs = TIMESTAMPDIFF(SECOND, v_round_start, v_last_end);
        IF v_total_secs < 0 THEN SET v_total_secs = 0; END IF;
    END IF;

    SET v_total_time = CONCAT(
        LPAD(FLOOR(v_total_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_total_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_total_secs % 60, 2, '0'));

    SELECT COUNT(*) INTO v_exists
      FROM user_result
     WHERE mpin = NEW.mpin;

    IF v_exists > 0 THEN
        UPDATE user_result
           SET trainer_id    = v_latest_trainer,
               percentage    = v_percentage,
               status        = v_status,
               rounds_status = v_rounds_status,
               total_time    = v_total_time,
               updated_at    = CURRENT_TIMESTAMP
         WHERE mpin = NEW.mpin;
    ELSE
        INSERT INTO user_result
            (mpin, trainer_id, percentage, status, rounds_status, total_time)
        VALUES
            (NEW.mpin, v_latest_trainer, v_percentage, v_status,
             v_rounds_status, v_total_time);
    END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
