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

-- Dumping structure for procedure skill_contest_portal.sp_refresh_dashboard
DELIMITER //
CREATE PROCEDURE `sp_refresh_dashboard`(IN p_mpin VARCHAR(20))
BEGIN
    DECLARE v_max      DECIMAL(10,2) DEFAULT 100.00;
    DECLARE v_req      INT DEFAULT 5;
    DECLARE v_pass     DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_limit    BIGINT DEFAULT 4800;
    DECLARE v_marks    DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_done     INT DEFAULT 0;
    DECLARE v_pct      DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_secs     BIGINT DEFAULT 0;
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
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)), 0)
      INTO v_marks, v_done, v_secs
      FROM participant_rounds
     WHERE mpin = p_mpin;

    SET v_done = COALESCE(v_done, 0);
    SET v_pct  = ROUND(v_marks / v_max * 100, 2);

    SELECT trainer_id INTO v_trainer
      FROM participant_rounds
     WHERE mpin = p_mpin
     ORDER BY id DESC LIMIT 1;

    SET v_status    = IF(v_pct  >= v_pass, 'Pass', 'Fail');
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

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
