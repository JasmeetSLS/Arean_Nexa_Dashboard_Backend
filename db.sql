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

-- Dumping structure for table skill_contest_portal.participant_rounds
CREATE TABLE IF NOT EXISTS `participant_rounds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mspin` varchar(20) NOT NULL,
  `trainer_name` varchar(120) DEFAULT NULL,
  `round_name` varchar(50) NOT NULL,
  `score` tinyint unsigned DEFAULT NULL COMMENT 'Max 30; NULL while running',
  `status` enum('pending','completed') NOT NULL DEFAULT 'pending',
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_round_mspin` (`mspin`),
  CONSTRAINT `chk_score` CHECK (((`score` is null) or (`score` between 0 and 30)))
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.trainer_details
CREATE TABLE IF NOT EXISTS `trainer_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.user_details
CREATE TABLE IF NOT EXISTS `user_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mspin` varchar(20) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role` varchar(50) DEFAULT NULL,
  `agency` varchar(80) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `zone` varchar(30) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `dealer_name` varchar(80) DEFAULT NULL,
  `dealer_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_mspin` (`mspin`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table skill_contest_portal.user_result
CREATE TABLE IF NOT EXISTS `user_result` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mspin` varchar(20) NOT NULL,
  `trainer` varchar(120) DEFAULT NULL COMMENT 'Latest/current trainer',
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'sum(score)/150*100',
  `status` enum('Pass','Fail') NOT NULL DEFAULT 'Fail',
  `rounds_status` enum('In Progress','Completed') NOT NULL DEFAULT 'In Progress',
  `total_time` varchar(10) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_result_mspin` (`mspin`)
) ENGINE=InnoDB AUTO_INCREMENT=661 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_insert` AFTER INSERT ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_total_score     INT DEFAULT 0;
    DECLARE v_percentage      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status          VARCHAR(4);
    DECLARE v_latest_trainer  VARCHAR(120);
    DECLARE v_rounds_status   VARCHAR(15);
    DECLARE v_completed       INT DEFAULT 0;
    DECLARE v_total_rounds    INT DEFAULT 0;
    DECLARE v_total_secs      BIGINT DEFAULT 0;
    DECLARE v_hh              INT DEFAULT 0;
    DECLARE v_mm              INT DEFAULT 0;
    DECLARE v_ss              INT DEFAULT 0;
    DECLARE v_total_time      VARCHAR(10);

    -- Total score
    SELECT COALESCE(SUM(score), 0)
      INTO v_total_score
      FROM participant_rounds
     WHERE mspin = NEW.mspin;

    -- Percentage out of 150
    SET v_percentage = ROUND((v_total_score / 150) * 100, 2);

    -- Pass/Fail
    IF v_percentage > 80 THEN SET v_status = 'Pass';
    ELSE                        SET v_status = 'Fail';
    END IF;

    -- Latest trainer
    SELECT trainer_name
      INTO v_latest_trainer
      FROM participant_rounds
     WHERE mspin = NEW.mspin
     ORDER BY id DESC
     LIMIT 1;

    -- Round completion status
    SELECT COUNT(*),
           SUM(score IS NOT NULL AND end_time IS NOT NULL)
      INTO v_total_rounds, v_completed
      FROM participant_rounds
     WHERE mspin = NEW.mspin;

    IF v_total_rounds >= 5 AND v_completed = 5 THEN
        SET v_rounds_status = 'Completed';
    ELSE
        SET v_rounds_status = 'In Progress';
    END IF;

    -- Total time (sum of each round's end_time - start_time)
    SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)), 0)
      INTO v_total_secs
      FROM participant_rounds
     WHERE mspin = NEW.mspin
       AND start_time IS NOT NULL
       AND end_time   IS NOT NULL;

    SET v_hh = FLOOR(v_total_secs / 3600);
    SET v_mm = FLOOR((v_total_secs % 3600) / 60);
    SET v_ss = v_total_secs % 60;

    SET v_total_time = CONCAT(
        LPAD(v_hh, 2, '0'), ':',
        LPAD(v_mm, 2, '0'), ':',
        LPAD(v_ss, 2, '0')
    );

    -- Upsert into user_result
    INSERT INTO user_result
        (mspin, trainer, percentage, status, rounds_status, total_time)
    VALUES
        (NEW.mspin, v_latest_trainer, v_percentage, v_status,
         v_rounds_status, v_total_time)
    ON DUPLICATE KEY UPDATE
        trainer       = VALUES(trainer),
        percentage    = VALUES(percentage),
        status        = VALUES(status),
        rounds_status = VALUES(rounds_status),
        total_time    = VALUES(total_time),
        updated_at    = CURRENT_TIMESTAMP;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_update` AFTER UPDATE ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_total_score     INT DEFAULT 0;
    DECLARE v_percentage      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status          VARCHAR(4);
    DECLARE v_latest_trainer  VARCHAR(120);
    DECLARE v_rounds_status   VARCHAR(15);
    DECLARE v_completed       INT DEFAULT 0;
    DECLARE v_total_rounds    INT DEFAULT 0;
    DECLARE v_total_secs      BIGINT DEFAULT 0;
    DECLARE v_hh              INT DEFAULT 0;
    DECLARE v_mm              INT DEFAULT 0;
    DECLARE v_ss              INT DEFAULT 0;
    DECLARE v_total_time      VARCHAR(10);

    SELECT COALESCE(SUM(score), 0)
      INTO v_total_score
      FROM participant_rounds
     WHERE mspin = NEW.mspin;

    SET v_percentage = ROUND((v_total_score / 150) * 100, 2);

    IF v_percentage > 80 THEN SET v_status = 'Pass';
    ELSE                        SET v_status = 'Fail';
    END IF;

    SELECT trainer_name
      INTO v_latest_trainer
      FROM participant_rounds
     WHERE mspin = NEW.mspin
     ORDER BY id DESC
     LIMIT 1;

    SELECT COUNT(*),
           SUM(score IS NOT NULL AND end_time IS NOT NULL)
      INTO v_total_rounds, v_completed
      FROM participant_rounds
     WHERE mspin = NEW.mspin;

    IF v_total_rounds >= 5 AND v_completed = 5 THEN
        SET v_rounds_status = 'Completed';
    ELSE
        SET v_rounds_status = 'In Progress';
    END IF;

    SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)), 0)
      INTO v_total_secs
      FROM participant_rounds
     WHERE mspin = NEW.mspin
       AND start_time IS NOT NULL
       AND end_time   IS NOT NULL;

    SET v_hh = FLOOR(v_total_secs / 3600);
    SET v_mm = FLOOR((v_total_secs % 3600) / 60);
    SET v_ss = v_total_secs % 60;

    SET v_total_time = CONCAT(
        LPAD(v_hh, 2, '0'), ':',
        LPAD(v_mm, 2, '0'), ':',
        LPAD(v_ss, 2, '0')
    );

    INSERT INTO user_result
        (mspin, trainer, percentage, status, rounds_status, total_time)
    VALUES
        (NEW.mspin, v_latest_trainer, v_percentage, v_status,
         v_rounds_status, v_total_time)
    ON DUPLICATE KEY UPDATE
        trainer       = VALUES(trainer),
        percentage    = VALUES(percentage),
        status        = VALUES(status),
        rounds_status = VALUES(rounds_status),
        total_time    = VALUES(total_time),
        updated_at    = CURRENT_TIMESTAMP;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
