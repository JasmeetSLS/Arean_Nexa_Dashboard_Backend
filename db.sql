-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               8.0.43 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.21.0.7344
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
CREATE DATABASE IF NOT EXISTS `skill_contest_portal` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
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

-- Dumping structure for table skill_contest_portal.admin_permission
CREATE TABLE IF NOT EXISTS `admin_permission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `allowed_roles` json NOT NULL,
  `allowed_zones` json NOT NULL,
  `allowed_regions` json NOT NULL,
  `allowed_projects` json NOT NULL,
  `permissions` json NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin` (`admin_id`),
  CONSTRAINT `fk_ap_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

-- Dumping structure for table skill_contest_portal.dashboard
CREATE TABLE IF NOT EXISTS `dashboard` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `trainer_id` varchar(60) DEFAULT NULL,
  `project_name` varchar(150) DEFAULT NULL,
  `marks` int NOT NULL DEFAULT '0',
  `max_marks` int NOT NULL DEFAULT '100',
  `completed` int NOT NULL DEFAULT '0',
  `required` int NOT NULL DEFAULT '5',
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `status` enum('Pass','Fail') NOT NULL DEFAULT 'Fail',
  `round_status` enum('In Progress','Completed') NOT NULL DEFAULT 'In Progress',
  `delay_status` enum('On Time','Delay') NOT NULL DEFAULT 'On Time',
  `total_time` varchar(10) DEFAULT '00:00:00',
  `total_secs` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dashboard_mpin` (`mpin`),
  KEY `idx_dashboard_trainer` (`trainer_id`),
  KEY `idx_dashboard_project` (`project_name`)
) ENGINE=InnoDB AUTO_INCREMENT=361 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
  `trainer_time` varchar(10) DEFAULT '01:20:00',
  `trainer_time_secs` int unsigned NOT NULL DEFAULT '4800',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project` (`project_name`),
  CONSTRAINT `chk_pass_pct` CHECK ((`passing_percentage` between 0 and 100)),
  CONSTRAINT `chk_rounds` CHECK ((`total_rounds` between 1 and 20))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for procedure skill_contest_portal.sp_refresh_dashboard
DELIMITER //
CREATE PROCEDURE `sp_refresh_dashboard`(IN p_mpin VARCHAR(20))
BEGIN
    DECLARE v_max      INT DEFAULT 100;
    DECLARE v_req      INT DEFAULT 5;
    DECLARE v_pass     DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_limit    BIGINT DEFAULT 4800;
    DECLARE v_marks    INT DEFAULT 0;
    DECLARE v_done     INT DEFAULT 0;
    DECLARE v_pct      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_secs     BIGINT DEFAULT 0;
    DECLARE v_start    DATETIME;
    DECLARE v_end      DATETIME;
    DECLARE v_trainer  VARCHAR(60);
    DECLARE v_project  VARCHAR(150);
    DECLARE v_status   VARCHAR(4)  DEFAULT 'Fail';
    DECLARE v_roundst  VARCHAR(15) DEFAULT 'In Progress';
    DECLARE v_delayst  VARCHAR(10) DEFAULT 'On Time';
    DECLARE v_totaltime VARCHAR(10) DEFAULT '00:00:00';
    DECLARE v_exists   INT DEFAULT 0;

    SELECT p.project_name,
           c.total_score, c.total_rounds, c.passing_percentage, c.trainer_time_secs
      INTO v_project, v_max, v_req, v_pass, v_limit
      FROM participants p
      JOIN project_round_config c
        ON c.project_name = p.project_name AND c.status = 'active'
     WHERE p.mpin = p_mpin
     LIMIT 1;

    SELECT COALESCE(SUM(score), 0),
           SUM(score IS NOT NULL AND end_time IS NOT NULL),
           MIN(start_time),
           MAX(CASE WHEN score IS NOT NULL AND end_time IS NOT NULL THEN end_time END)
      INTO v_marks, v_done, v_start, v_end
      FROM participant_rounds
     WHERE mpin = p_mpin;

    SET v_done = COALESCE(v_done, 0);
    SET v_pct  = ROUND(v_marks / v_max * 100, 2);

    IF v_done > 0 AND v_start IS NOT NULL AND v_end IS NOT NULL THEN
        SET v_secs = GREATEST(0, TIMESTAMPDIFF(SECOND, v_start, v_end));
    END IF;

    SELECT trainer_id INTO v_trainer
      FROM participant_rounds
     WHERE mpin = p_mpin
     ORDER BY id DESC LIMIT 1;

    SET v_status    = IF(v_pct  > v_pass, 'Pass', 'Fail');
    SET v_roundst   = IF(v_done >= v_req, 'Completed', 'In Progress');
    SET v_delayst   = IF(v_secs > v_limit, 'Delay', 'On Time');
    SET v_totaltime = CONCAT(
        LPAD(FLOOR(v_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_secs % 60, 2, '0'));

    SELECT COUNT(*) INTO v_exists FROM dashboard WHERE mpin = p_mpin;

    IF v_exists > 0 THEN
        UPDATE dashboard SET
            trainer_id   = v_trainer,
            project_name = v_project,
            marks        = v_marks,
            max_marks    = v_max,
            completed    = v_done,
            required     = v_req,
            percentage   = v_pct,
            status       = v_status,
            round_status = v_roundst,
            delay_status = v_delayst,
            total_time   = v_totaltime,
            total_secs   = v_secs
        WHERE mpin = p_mpin;
    ELSE
        INSERT INTO dashboard
            (mpin, trainer_id, project_name,
             marks, max_marks, completed, required, percentage,
             status, round_status, delay_status, total_time, total_secs)
        VALUES
            (p_mpin, v_trainer, v_project,
             v_marks, v_max, v_done, v_req, v_pct,
             v_status, v_roundst, v_delayst, v_totaltime, v_secs);
    END IF;
END//
DELIMITER ;

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

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_delete
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_delete` AFTER DELETE ON `participant_rounds` FOR EACH ROW BEGIN
    CALL sp_refresh_dashboard(OLD.mpin);
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_insert` AFTER INSERT ON `participant_rounds` FOR EACH ROW BEGIN
    CALL sp_refresh_dashboard(NEW.mpin);
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_update
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_update` AFTER UPDATE ON `participant_rounds` FOR EACH ROW BEGIN
    CALL sp_refresh_dashboard(NEW.mpin);
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
