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
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_round_mspin` (`mspin`),
  CONSTRAINT `chk_score` CHECK (((`score` is null) or (`score` between 0 and 30)))
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.participant_rounds: ~330 rows (approximately)
INSERT INTO `participant_rounds` (`id`, `mspin`, `trainer_name`, `round_name`, `score`, `start_time`, `end_time`) VALUES
	(1, 'MS100', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:12:00'),
	(2, 'MS101', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:14:00'),
	(3, 'MS102', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:16:00'),
	(4, 'MS103', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:18:00'),
	(5, 'MS104', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:20:00'),
	(6, 'MS105', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:22:00'),
	(7, 'MS106', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:24:00'),
	(8, 'MS107', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:26:00'),
	(9, 'MS108', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:28:00'),
	(10, 'MS109', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:10:00'),
	(11, 'MS110', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:11:00'),
	(12, 'MS111', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:13:00'),
	(13, 'MS112', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:15:00'),
	(14, 'MS113', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:17:00'),
	(15, 'MS114', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:19:00'),
	(16, 'MS115', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:21:00'),
	(17, 'MS116', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:23:00'),
	(18, 'MS117', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:25:00'),
	(19, 'MS118', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:27:00'),
	(20, 'MS119', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:29:00'),
	(21, 'MS120', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:12:00'),
	(22, 'MS121', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:14:00'),
	(23, 'MS122', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:16:00'),
	(24, 'MS123', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:18:00'),
	(25, 'MS124', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:20:00'),
	(26, 'MS125', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:22:00'),
	(27, 'MS126', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:24:00'),
	(28, 'MS127', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:26:00'),
	(29, 'MS128', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:28:00'),
	(30, 'MS129', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:10:00'),
	(31, 'MS130', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:11:00'),
	(32, 'MS131', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:13:00'),
	(33, 'MS132', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:15:00'),
	(34, 'MS133', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:17:00'),
	(35, 'MS134', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:19:00'),
	(36, 'MS135', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:21:00'),
	(37, 'MS136', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:23:00'),
	(38, 'MS137', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:25:00'),
	(39, 'MS138', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:27:00'),
	(40, 'MS139', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:29:00'),
	(41, 'MS140', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:12:00'),
	(42, 'MS141', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:14:00'),
	(43, 'MS142', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:16:00'),
	(44, 'MS143', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:18:00'),
	(45, 'MS144', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:20:00'),
	(46, 'MS145', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:22:00'),
	(47, 'MS146', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:24:00'),
	(48, 'MS147', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:26:00'),
	(49, 'MS148', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:28:00'),
	(50, 'MS149', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:10:00'),
	(51, 'MS150', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:11:00'),
	(52, 'MS151', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:13:00'),
	(53, 'MS152', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:15:00'),
	(54, 'MS153', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:17:00'),
	(55, 'MS154', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:19:00'),
	(56, 'MS155', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:21:00'),
	(57, 'MS156', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:23:00'),
	(58, 'MS157', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:25:00'),
	(59, 'MS158', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:27:00'),
	(60, 'MS159', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:29:00'),
	(61, 'MS160', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:12:00'),
	(62, 'MS161', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:14:00'),
	(63, 'MS162', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:16:00'),
	(64, 'MS163', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:18:00'),
	(65, 'MS164', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:20:00'),
	(66, 'MS165', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:22:00'),
	(67, 'MS166', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:24:00'),
	(68, 'MS167', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:26:00'),
	(69, 'MS168', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:28:00'),
	(70, 'MS169', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:10:00'),
	(71, 'MS170', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:11:00'),
	(72, 'MS171', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:13:00'),
	(73, 'MS172', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:15:00'),
	(74, 'MS173', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:17:00'),
	(75, 'MS174', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:19:00'),
	(76, 'MS175', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:21:00'),
	(77, 'MS176', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:23:00'),
	(78, 'MS177', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:25:00'),
	(79, 'MS178', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:27:00'),
	(80, 'MS179', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:29:00'),
	(81, 'MS180', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:12:00'),
	(82, 'MS181', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:14:00'),
	(83, 'MS182', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:16:00'),
	(84, 'MS183', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:18:00'),
	(85, 'MS184', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:20:00'),
	(86, 'MS185', 'Arun jose', 'Round 1', 27, '2026-09-04 09:00:00', '2026-09-04 09:22:00'),
	(87, 'MS186', 'Manjira', 'Round 1', 24, '2026-09-04 09:00:00', '2026-09-04 09:24:00'),
	(88, 'MS187', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:00:00', '2026-09-04 09:26:00'),
	(89, 'MS188', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:00:00', '2026-09-04 09:28:00'),
	(90, 'MS189', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:00:00', '2026-09-04 09:10:00'),
	(91, 'MS100', 'Imtiyaz syed', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(92, 'MS101', 'Mihir Zaveri', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(93, 'MS102', 'Virendar hada', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(94, 'MS103', 'Arun jose', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(95, 'MS104', 'Manjira', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(96, 'MS105', 'Sudhevan kj', 'Round 2', 26, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(97, 'MS106', 'Sagar mokase', 'Round 2', 23, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(98, 'MS107', 'Tikendra sumara', 'Round 2', 20, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(99, 'MS108', 'Pooja Bora', 'Round 2', 30, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(100, 'MS109', 'Meharban singh Bhatia', 'Round 2', 27, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(101, 'MS110', 'Imtiyaz syed', 'Round 2', 24, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(102, 'MS111', 'Mihir Zaveri', 'Round 2', 21, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(103, 'MS112', 'Virendar hada', 'Round 2', 18, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(104, 'MS113', 'Arun jose', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(105, 'MS114', 'Manjira', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(106, 'MS115', 'Sudhevan kj', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(107, 'MS116', 'Sagar mokase', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(108, 'MS117', 'Tikendra sumara', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(109, 'MS118', 'Pooja Bora', 'Round 2', 26, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(110, 'MS119', 'Meharban singh Bhatia', 'Round 2', 23, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(111, 'MS120', 'Imtiyaz syed', 'Round 2', 20, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(112, 'MS121', 'Mihir Zaveri', 'Round 2', 30, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(113, 'MS122', 'Virendar hada', 'Round 2', 27, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(114, 'MS123', 'Arun jose', 'Round 2', 24, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(115, 'MS124', 'Manjira', 'Round 2', 21, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(116, 'MS125', 'Sudhevan kj', 'Round 2', 18, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(117, 'MS126', 'Sagar mokase', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(118, 'MS127', 'Tikendra sumara', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(119, 'MS128', 'Pooja Bora', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(120, 'MS129', 'Meharban singh Bhatia', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(121, 'MS130', 'Imtiyaz syed', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(122, 'MS131', 'Mihir Zaveri', 'Round 2', 26, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(123, 'MS132', 'Virendar hada', 'Round 2', 23, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(124, 'MS133', 'Arun jose', 'Round 2', 20, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(125, 'MS134', 'Manjira', 'Round 2', 30, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(126, 'MS135', 'Sudhevan kj', 'Round 2', 27, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(127, 'MS136', 'Sagar mokase', 'Round 2', 24, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(128, 'MS137', 'Tikendra sumara', 'Round 2', 21, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(129, 'MS138', 'Pooja Bora', 'Round 2', 18, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(130, 'MS139', 'Meharban singh Bhatia', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(131, 'MS140', 'Imtiyaz syed', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(132, 'MS141', 'Mihir Zaveri', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(133, 'MS142', 'Virendar hada', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(134, 'MS143', 'Arun jose', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(135, 'MS144', 'Manjira', 'Round 2', 26, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(136, 'MS145', 'Sudhevan kj', 'Round 2', 23, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(137, 'MS146', 'Sagar mokase', 'Round 2', 20, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(138, 'MS147', 'Tikendra sumara', 'Round 2', 30, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(139, 'MS148', 'Pooja Bora', 'Round 2', 27, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(140, 'MS149', 'Meharban singh Bhatia', 'Round 2', 24, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(141, 'MS150', 'Imtiyaz syed', 'Round 2', 21, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(142, 'MS151', 'Mihir Zaveri', 'Round 2', 18, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(143, 'MS152', 'Virendar hada', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(144, 'MS153', 'Arun jose', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(145, 'MS154', 'Manjira', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(146, 'MS155', 'Sudhevan kj', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(147, 'MS156', 'Sagar mokase', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(148, 'MS157', 'Tikendra sumara', 'Round 2', 26, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(149, 'MS158', 'Pooja Bora', 'Round 2', 23, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(150, 'MS159', 'Meharban singh Bhatia', 'Round 2', 20, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(151, 'MS160', 'Imtiyaz syed', 'Round 2', 30, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(152, 'MS161', 'Mihir Zaveri', 'Round 2', 27, '2026-09-04 10:00:00', '2026-09-04 10:28:00'),
	(153, 'MS162', 'Virendar hada', 'Round 2', 24, '2026-09-04 10:00:00', '2026-09-04 10:12:00'),
	(154, 'MS163', 'Arun jose', 'Round 2', 21, '2026-09-04 10:00:00', '2026-09-04 10:14:00'),
	(155, 'MS164', 'Manjira', 'Round 2', 18, '2026-09-04 10:00:00', '2026-09-04 10:16:00'),
	(156, 'MS165', 'Sudhevan kj', 'Round 2', 28, '2026-09-04 10:00:00', '2026-09-04 10:18:00'),
	(157, 'MS166', 'Sagar mokase', 'Round 2', 25, '2026-09-04 10:00:00', '2026-09-04 10:20:00'),
	(158, 'MS167', 'Tikendra sumara', 'Round 2', 22, '2026-09-04 10:00:00', '2026-09-04 10:22:00'),
	(159, 'MS168', 'Pooja Bora', 'Round 2', 19, '2026-09-04 10:00:00', '2026-09-04 10:24:00'),
	(160, 'MS169', 'Meharban singh Bhatia', 'Round 2', 29, '2026-09-04 10:00:00', '2026-09-04 10:26:00'),
	(161, 'MS170', 'Imtiyaz syed', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(162, 'MS171', 'Mihir Zaveri', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(163, 'MS172', 'Virendar hada', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(164, 'MS173', 'Arun jose', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(165, 'MS174', 'Manjira', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(166, 'MS175', 'Sudhevan kj', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(167, 'MS176', 'Sagar mokase', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(168, 'MS177', 'Tikendra sumara', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(169, 'MS178', 'Pooja Bora', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(170, 'MS179', 'Meharban singh Bhatia', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(171, 'MS180', 'Imtiyaz syed', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(172, 'MS181', 'Mihir Zaveri', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(173, 'MS182', 'Virendar hada', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(174, 'MS183', 'Arun jose', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(175, 'MS184', 'Manjira', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(176, 'MS185', 'Sudhevan kj', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(177, 'MS186', 'Sagar mokase', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(178, 'MS187', 'Tikendra sumara', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(179, 'MS188', 'Pooja Bora', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(180, 'MS189', 'Meharban singh Bhatia', 'Round 2', NULL, '2026-09-04 10:00:00', NULL),
	(181, 'MS100', 'Virendar hada', 'Round 3', 29, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(182, 'MS101', 'Arun jose', 'Round 3', 26, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(183, 'MS102', 'Manjira', 'Round 3', 23, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(184, 'MS103', 'Sudhevan kj', 'Round 3', 20, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(185, 'MS104', 'Sagar mokase', 'Round 3', 30, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(186, 'MS105', 'Tikendra sumara', 'Round 3', 27, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(187, 'MS106', 'Pooja Bora', 'Round 3', 24, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(188, 'MS107', 'Meharban singh Bhatia', 'Round 3', 21, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(189, 'MS108', 'Imtiyaz syed', 'Round 3', 18, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(190, 'MS109', 'Mihir Zaveri', 'Round 3', 28, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(191, 'MS110', 'Virendar hada', 'Round 3', 25, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(192, 'MS111', 'Arun jose', 'Round 3', 22, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(193, 'MS112', 'Manjira', 'Round 3', 19, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(194, 'MS113', 'Sudhevan kj', 'Round 3', 29, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(195, 'MS114', 'Sagar mokase', 'Round 3', 26, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(196, 'MS115', 'Tikendra sumara', 'Round 3', 23, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(197, 'MS116', 'Pooja Bora', 'Round 3', 20, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(198, 'MS117', 'Meharban singh Bhatia', 'Round 3', 30, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(199, 'MS118', 'Imtiyaz syed', 'Round 3', 27, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(200, 'MS119', 'Mihir Zaveri', 'Round 3', 24, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(201, 'MS120', 'Virendar hada', 'Round 3', 21, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(202, 'MS121', 'Arun jose', 'Round 3', 18, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(203, 'MS122', 'Manjira', 'Round 3', 28, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(204, 'MS123', 'Sudhevan kj', 'Round 3', 25, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(205, 'MS124', 'Sagar mokase', 'Round 3', 22, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(206, 'MS125', 'Tikendra sumara', 'Round 3', 19, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(207, 'MS126', 'Pooja Bora', 'Round 3', 29, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(208, 'MS127', 'Meharban singh Bhatia', 'Round 3', 26, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(209, 'MS128', 'Imtiyaz syed', 'Round 3', 23, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(210, 'MS129', 'Mihir Zaveri', 'Round 3', 20, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(211, 'MS130', 'Virendar hada', 'Round 3', 30, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(212, 'MS131', 'Arun jose', 'Round 3', 27, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(213, 'MS132', 'Manjira', 'Round 3', 24, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(214, 'MS133', 'Sudhevan kj', 'Round 3', 21, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(215, 'MS134', 'Sagar mokase', 'Round 3', 18, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(216, 'MS135', 'Tikendra sumara', 'Round 3', 28, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(217, 'MS136', 'Pooja Bora', 'Round 3', 25, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(218, 'MS137', 'Meharban singh Bhatia', 'Round 3', 22, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(219, 'MS138', 'Imtiyaz syed', 'Round 3', 19, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(220, 'MS139', 'Mihir Zaveri', 'Round 3', 29, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(221, 'MS140', 'Virendar hada', 'Round 3', 26, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(222, 'MS141', 'Arun jose', 'Round 3', 23, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(223, 'MS142', 'Manjira', 'Round 3', 20, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(224, 'MS143', 'Sudhevan kj', 'Round 3', 30, '2026-09-04 11:00:00', '2026-09-04 11:18:00'),
	(225, 'MS144', 'Sagar mokase', 'Round 3', 27, '2026-09-04 11:00:00', '2026-09-04 11:20:00'),
	(226, 'MS145', 'Tikendra sumara', 'Round 3', 24, '2026-09-04 11:00:00', '2026-09-04 11:22:00'),
	(227, 'MS146', 'Pooja Bora', 'Round 3', 21, '2026-09-04 11:00:00', '2026-09-04 11:24:00'),
	(228, 'MS147', 'Meharban singh Bhatia', 'Round 3', 18, '2026-09-04 11:00:00', '2026-09-04 11:26:00'),
	(229, 'MS148', 'Imtiyaz syed', 'Round 3', 28, '2026-09-04 11:00:00', '2026-09-04 11:14:00'),
	(230, 'MS149', 'Mihir Zaveri', 'Round 3', 25, '2026-09-04 11:00:00', '2026-09-04 11:16:00'),
	(231, 'MS150', 'Virendar hada', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(232, 'MS151', 'Arun jose', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(233, 'MS152', 'Manjira', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(234, 'MS153', 'Sudhevan kj', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(235, 'MS154', 'Sagar mokase', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(236, 'MS155', 'Tikendra sumara', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(237, 'MS156', 'Pooja Bora', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(238, 'MS157', 'Meharban singh Bhatia', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(239, 'MS158', 'Imtiyaz syed', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(240, 'MS159', 'Mihir Zaveri', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(241, 'MS160', 'Virendar hada', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(242, 'MS161', 'Arun jose', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(243, 'MS162', 'Manjira', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(244, 'MS163', 'Sudhevan kj', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(245, 'MS164', 'Sagar mokase', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(246, 'MS165', 'Tikendra sumara', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(247, 'MS166', 'Pooja Bora', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(248, 'MS167', 'Meharban singh Bhatia', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(249, 'MS168', 'Imtiyaz syed', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(250, 'MS169', 'Mihir Zaveri', 'Round 3', NULL, '2026-09-04 11:00:00', NULL),
	(251, 'MS100', 'Arun jose', 'Round 4', 30, '2026-09-04 12:00:00', '2026-09-04 12:18:00'),
	(252, 'MS101', 'Manjira', 'Round 4', 27, '2026-09-04 12:00:00', '2026-09-04 12:20:00'),
	(253, 'MS102', 'Sudhevan kj', 'Round 4', 24, '2026-09-04 12:00:00', '2026-09-04 12:22:00'),
	(254, 'MS103', 'Sagar mokase', 'Round 4', 21, '2026-09-04 12:00:00', '2026-09-04 12:24:00'),
	(255, 'MS104', 'Tikendra sumara', 'Round 4', 18, '2026-09-04 12:00:00', '2026-09-04 12:26:00'),
	(256, 'MS105', 'Pooja Bora', 'Round 4', 28, '2026-09-04 12:00:00', '2026-09-04 12:16:00'),
	(257, 'MS106', 'Meharban singh Bhatia', 'Round 4', 25, '2026-09-04 12:00:00', '2026-09-04 12:18:00'),
	(258, 'MS107', 'Imtiyaz syed', 'Round 4', 22, '2026-09-04 12:00:00', '2026-09-04 12:20:00'),
	(259, 'MS108', 'Mihir Zaveri', 'Round 4', 19, '2026-09-04 12:00:00', '2026-09-04 12:22:00'),
	(260, 'MS109', 'Virendar hada', 'Round 4', 29, '2026-09-04 12:00:00', '2026-09-04 12:24:00'),
	(261, 'MS110', 'Arun jose', 'Round 4', 26, '2026-09-04 12:00:00', '2026-09-04 12:26:00'),
	(262, 'MS111', 'Manjira', 'Round 4', 23, '2026-09-04 12:00:00', '2026-09-04 12:16:00'),
	(263, 'MS112', 'Sudhevan kj', 'Round 4', 20, '2026-09-04 12:00:00', '2026-09-04 12:18:00'),
	(264, 'MS113', 'Sagar mokase', 'Round 4', 30, '2026-09-04 12:00:00', '2026-09-04 12:20:00'),
	(265, 'MS114', 'Tikendra sumara', 'Round 4', 27, '2026-09-04 12:00:00', '2026-09-04 12:22:00'),
	(266, 'MS115', 'Pooja Bora', 'Round 4', 24, '2026-09-04 12:00:00', '2026-09-04 12:24:00'),
	(267, 'MS116', 'Meharban singh Bhatia', 'Round 4', 21, '2026-09-04 12:00:00', '2026-09-04 12:26:00'),
	(268, 'MS117', 'Imtiyaz syed', 'Round 4', 18, '2026-09-04 12:00:00', '2026-09-04 12:16:00'),
	(269, 'MS118', 'Mihir Zaveri', 'Round 4', 28, '2026-09-04 12:00:00', '2026-09-04 12:18:00'),
	(270, 'MS119', 'Virendar hada', 'Round 4', 25, '2026-09-04 12:00:00', '2026-09-04 12:20:00'),
	(271, 'MS120', 'Arun jose', 'Round 4', 22, '2026-09-04 12:00:00', '2026-09-04 12:22:00'),
	(272, 'MS121', 'Manjira', 'Round 4', 19, '2026-09-04 12:00:00', '2026-09-04 12:24:00'),
	(273, 'MS122', 'Sudhevan kj', 'Round 4', 29, '2026-09-04 12:00:00', '2026-09-04 12:26:00'),
	(274, 'MS123', 'Sagar mokase', 'Round 4', 26, '2026-09-04 12:00:00', '2026-09-04 12:16:00'),
	(275, 'MS124', 'Tikendra sumara', 'Round 4', 23, '2026-09-04 12:00:00', '2026-09-04 12:18:00'),
	(276, 'MS125', 'Pooja Bora', 'Round 4', 20, '2026-09-04 12:00:00', '2026-09-04 12:20:00'),
	(277, 'MS126', 'Meharban singh Bhatia', 'Round 4', 30, '2026-09-04 12:00:00', '2026-09-04 12:22:00'),
	(278, 'MS127', 'Imtiyaz syed', 'Round 4', 27, '2026-09-04 12:00:00', '2026-09-04 12:24:00'),
	(279, 'MS128', 'Mihir Zaveri', 'Round 4', 24, '2026-09-04 12:00:00', '2026-09-04 12:26:00'),
	(280, 'MS129', 'Virendar hada', 'Round 4', 21, '2026-09-04 12:00:00', '2026-09-04 12:16:00'),
	(281, 'MS130', 'Arun jose', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(282, 'MS131', 'Manjira', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(283, 'MS132', 'Sudhevan kj', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(284, 'MS133', 'Sagar mokase', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(285, 'MS134', 'Tikendra sumara', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(286, 'MS135', 'Pooja Bora', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(287, 'MS136', 'Meharban singh Bhatia', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(288, 'MS137', 'Imtiyaz syed', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(289, 'MS138', 'Mihir Zaveri', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(290, 'MS139', 'Virendar hada', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(291, 'MS140', 'Arun jose', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(292, 'MS141', 'Manjira', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(293, 'MS142', 'Sudhevan kj', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(294, 'MS143', 'Sagar mokase', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(295, 'MS144', 'Tikendra sumara', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(296, 'MS145', 'Pooja Bora', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(297, 'MS146', 'Meharban singh Bhatia', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(298, 'MS147', 'Imtiyaz syed', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(299, 'MS148', 'Mihir Zaveri', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(300, 'MS149', 'Virendar hada', 'Round 4', NULL, '2026-09-04 12:00:00', NULL),
	(301, 'MS100', 'Manjira', 'Round 5', 28, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(302, 'MS101', 'Sudhevan kj', 'Round 5', 25, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(303, 'MS102', 'Sagar mokase', 'Round 5', 22, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(304, 'MS103', 'Tikendra sumara', 'Round 5', 19, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(305, 'MS104', 'Pooja Bora', 'Round 5', 29, '2026-09-04 13:00:00', '2026-09-04 13:18:00'),
	(306, 'MS105', 'Meharban singh Bhatia', 'Round 5', 26, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(307, 'MS106', 'Imtiyaz syed', 'Round 5', 23, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(308, 'MS107', 'Mihir Zaveri', 'Round 5', 20, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(309, 'MS108', 'Virendar hada', 'Round 5', 30, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(310, 'MS109', 'Arun jose', 'Round 5', 27, '2026-09-04 13:00:00', '2026-09-04 13:18:00'),
	(311, 'MS110', 'Manjira', 'Round 5', 24, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(312, 'MS111', 'Sudhevan kj', 'Round 5', 21, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(313, 'MS112', 'Sagar mokase', 'Round 5', 18, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(314, 'MS113', 'Tikendra sumara', 'Round 5', 28, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(315, 'MS114', 'Pooja Bora', 'Round 5', 25, '2026-09-04 13:00:00', '2026-09-04 13:18:00'),
	(316, 'MS115', 'Meharban singh Bhatia', 'Round 5', 22, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(317, 'MS116', 'Imtiyaz syed', 'Round 5', 19, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(318, 'MS117', 'Mihir Zaveri', 'Round 5', 29, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(319, 'MS118', 'Virendar hada', 'Round 5', 26, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(320, 'MS119', 'Arun jose', 'Round 5', 23, '2026-09-04 13:00:00', '2026-09-04 13:18:00'),
	(321, 'MS120', 'Manjira', 'Round 5', 20, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(322, 'MS121', 'Sudhevan kj', 'Round 5', 30, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(323, 'MS122', 'Sagar mokase', 'Round 5', 27, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(324, 'MS123', 'Tikendra sumara', 'Round 5', 24, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(325, 'MS124', 'Pooja Bora', 'Round 5', 21, '2026-09-04 13:00:00', '2026-09-04 13:18:00'),
	(326, 'MS125', 'Meharban singh Bhatia', 'Round 5', 18, '2026-09-04 13:00:00', '2026-09-04 13:20:00'),
	(327, 'MS126', 'Imtiyaz syed', 'Round 5', 28, '2026-09-04 13:00:00', '2026-09-04 13:22:00'),
	(328, 'MS127', 'Mihir Zaveri', 'Round 5', 25, '2026-09-04 13:00:00', '2026-09-04 13:24:00'),
	(329, 'MS128', 'Virendar hada', 'Round 5', 22, '2026-09-04 13:00:00', '2026-09-04 13:26:00'),
	(330, 'MS129', 'Arun jose', 'Round 5', 19, '2026-09-04 13:00:00', '2026-09-04 13:18:00');

-- Dumping structure for table skill_contest_portal.trainer_details
CREATE TABLE IF NOT EXISTS `trainer_details` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.trainer_details: ~10 rows (approximately)
INSERT INTO `trainer_details` (`id`, `name`, `photo_url`) VALUES
	(1, 'Pooja Bora', '/trainers/1.jpeg'),
	(2, 'Meharban singh Bhatia', '/trainers/2.jpeg'),
	(3, 'Imtiyaz syed', '/trainers/3.jpeg'),
	(4, 'Mihir Zaveri', '/trainers/4.jpeg'),
	(5, 'Virendar hada', '/trainers/5.jpeg'),
	(6, 'Arun jose', '/trainers/6.jpeg'),
	(7, 'Manjira', '/trainers/7.jpeg'),
	(8, 'Sudhevan kj', '/trainers/8.jpeg'),
	(9, 'Sagar mokase', '/trainers/9.jpeg'),
	(10, 'Tikendra sumara', '/trainers/10.jpeg');

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

-- Dumping data for table skill_contest_portal.user_details: ~90 rows (approximately)
INSERT INTO `user_details` (`id`, `mspin`, `name`, `role`, `agency`, `region`, `zone`, `city`, `dealer_name`, `dealer_code`) VALUES
	(1, 'MS100', 'AYUSH RAJ', 'RM', 'Agency A', 'C1', 'CENTRAL 1', 'VERAVAL', 'PERFECT AUTO SERVICES', 'AH01-AH'),
	(2, 'MS101', 'AYUSH YADAV', 'RM', 'Agency B', 'C1', 'CENTRAL 1', 'VALSAD', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E'),
	(3, 'MS102', 'AYYUB KHAN', 'RM', 'Agency C', 'C1', 'CENTRAL 1', 'VALSAD', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E'),
	(4, 'MS103', 'AZHAR KALIM KHAN', 'RM', 'Agency A', 'C1', 'CENTRAL 1', 'VALSAD', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E'),
	(5, 'MS104', 'B CHANDRA SEKHAR', 'RM', 'Agency B', 'C1', 'CENTRAL 1', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(6, 'MS105', 'BABITHESH P K', 'SRM', 'Agency C', 'C2', 'CENTRAL 2', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(7, 'MS106', 'BABLU NAGAR', 'SRM', 'Agency A', 'C2', 'CENTRAL 2', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(8, 'MS107', 'BADRISH PANDEY', 'SRM', 'Agency B', 'C2', 'CENTRAL 2', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(9, 'MS108', 'BAKHTAR ALLI KILEDAR', 'SRM', 'Agency C', 'C2', 'CENTRAL 2', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(10, 'MS109', 'BALASUNDARAM MUTYALA', 'SRM', 'Agency A', 'C2', 'CENTRAL 2', 'DELHI', 'FAIR DEAL WHEELS PVT. LTD.', '08E3-08'),
	(11, 'MS110', 'CHUDAMANI SAHU', 'RM', 'Agency B', 'C3', 'CENTRAL 3', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(12, 'MS111', 'CIZEER RAJENDRA KADAM', 'RM', 'Agency C', 'C3', 'CENTRAL 3', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(13, 'MS112', 'DABHI LEENKUMAR NARESHKUMAR', 'RM', 'Agency A', 'C3', 'CENTRAL 3', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(14, 'MS113', 'DALEEP SINGH', 'RM', 'Agency B', 'C3', 'CENTRAL 3', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(15, 'MS114', 'DALVIR SINGH', 'RM', 'Agency C', 'C3', 'CENTRAL 3', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(16, 'MS115', 'DAMANPREET SINGH', 'RM', 'Agency A', 'C4', 'CENTRAL 4', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(17, 'MS116', 'DANISH AHAMAD', 'RM', 'Agency B', 'C4', 'CENTRAL 4', 'C1', 'RANA MOTORS PVT LTD', '08A1-08'),
	(18, 'MS117', 'DANISH GULZAR ZARGER', 'RM', 'Agency C', 'C4', 'CENTRAL 4', 'C1', 'RANA MOTORS PVT LTD', '08A4-08'),
	(19, 'MS118', 'DANISH MAJEED BHAT', 'RM', 'Agency A', 'C4', 'CENTRAL 4', 'C1', 'RANA MOTORS PVT LTD', '08A4-08'),
	(20, 'MS119', 'DARPAN ACHARYA', 'RM', 'Agency B', 'C4', 'CENTRAL 4', 'C1', 'RANA MOTORS PVT LTD', '08A4-08'),
	(21, 'MS120', 'DARSHAN GOWDA L', 'RM', 'Agency C', 'E1', 'EAST 1', 'C1', 'RANA MOTORS PVT LTD', '08A4-08'),
	(22, 'MS121', 'DARSHAN SINGH', 'RM', 'Agency A', 'E1', 'EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(23, 'MS122', 'DARSHAN VILAS GARVAD', 'RM', 'Agency B', 'E1', 'EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(24, 'MS123', 'DATTATRAY BABASO ROMAN', 'RM', 'Agency C', 'E1', 'EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(25, 'MS124', 'EDWIN M J', 'RM', 'Agency A', 'E1', 'EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(26, 'MS125', 'EZAZ HIDAYATULLAH KHANUSIYA', 'RM', 'Agency B', 'E2', 'EAST 2', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(27, 'MS126', 'FAHAD BIN AYYUB', 'RM', 'Agency C', 'E2', 'EAST 2', 'C1', 'MAGIC AUTO PVT LTD', '08B1-08'),
	(28, 'MS127', 'FAHEK ALI BANGALI', 'RM', 'Agency A', 'E2', 'EAST 2', 'C1', 'AAA VEHICLEADES PVT LTD', '08B4-08'),
	(29, 'MS128', 'FAIZAN ASHRAF DAR', 'SRM', 'Agency B', 'E2', 'EAST 2', 'C1', 'AAA VEHICLEADES PVT LTD', '08B4-08'),
	(30, 'MS129', 'FAIZAN PASHA KK', 'RM', 'Agency C', 'E2', 'EAST 2', 'C1', 'MAGIC AUTO PVT LTD', '08B7-08'),
	(31, 'MS130', 'FAKRE ALAM', 'RM', 'Agency A', 'E3', 'EAST 3', 'C1', 'MAGIC AUTO PVT LTD', '08B7-08'),
	(32, 'MS131', 'FAROOQ KHAN', 'RM', 'Agency B', 'E3', 'EAST 3', 'C1', 'MAGIC AUTO PVT LTD', '08B7-08'),
	(33, 'MS132', 'FEROZ SALIM SHAIKH', 'RM', 'Agency C', 'E3', 'EAST 3', 'C1', 'MAGIC AUTO PVT LTD', '08B7-08'),
	(34, 'MS133', 'FIDUL KHADER', 'RM', 'Agency A', 'E3', 'EAST 3', 'C1', 'MAGIC AUTO PVT LTD', '08B8-08'),
	(35, 'MS134', 'FINAZ K P', 'SRM', 'Agency B', 'E3', 'EAST 3', 'C1', 'MAGIC AUTO PVT LTD', '08B8-08'),
	(36, 'MS135', 'FIRDOUS ALAM', 'RM', 'Agency C', 'N1', 'NORTH 1', 'C1', 'MAGIC AUTO PVT LTD', '08B8-08'),
	(37, 'MS136', 'GOVIND RANA', 'RM', 'Agency A', 'N1', 'NORTH 1', 'C1', 'MAGIC AUTO PVT LTD', '08B8-08'),
	(38, 'MS137', 'GOVIND SINGH PARIHAR', 'RM', 'Agency B', 'N1', 'NORTH 1', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(39, 'MS138', 'GRISHANT GHANSHAM GAIKWAD', 'SRM', 'Agency C', 'N1', 'NORTH 1', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(40, 'MS139', 'GULSHAN KUMAR', 'RM', 'Agency A', 'N1', 'NORTH 1', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(41, 'MS140', 'GULSHAN KUMAR NARCHAL', 'RM', 'Agency B', 'N2', 'NORTH 2', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(42, 'MS141', 'GULZAR AHMAD JOO', 'RM', 'Agency C', 'N2', 'NORTH 2', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(43, 'MS142', 'GUNDUMOGULA VENKATA PHANEENDRA', 'RM', 'Agency A', 'N2', 'NORTH 2', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(44, 'MS143', 'HANTSULA K', 'SRM', 'Agency B', 'N2', 'NORTH 2', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(45, 'MS144', 'HARDIBEN PANKAJBHAI PATEL', 'RM', 'Agency C', 'N2', 'NORTH 2', 'C1', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08'),
	(46, 'MS145', 'HARDIK KULKARNI', 'RM', 'Agency A', 'N3', 'NORTH 3', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08'),
	(47, 'MS146', 'HARDIK RAJESHBHAI SANCHALA', 'RM', 'Agency B', 'N3', 'NORTH 3', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08D1-08'),
	(48, 'MS147', 'HARDIPSINH ZALA', 'SRM', 'Agency C', 'N3', 'NORTH 3', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08'),
	(49, 'MS148', 'HARENDER', 'RM', 'Agency A', 'N3', 'NORTH 3', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08'),
	(50, 'MS149', 'HARIHARAN S', 'RM', 'Agency B', 'N3', 'NORTH 3', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08'),
	(51, 'MS150', 'HARIKRISHNA SRIKOLANU', 'RM', 'Agency C', 'N4', 'NORTH 4', 'C1', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08'),
	(52, 'MS151', 'INBARASAN P', 'RM', 'Agency A', 'N4', 'NORTH 4', 'C1', 'RANA MOTORS PVT LTD', '08D3-08'),
	(53, 'MS152', 'INSHAD C S', 'RM', 'Agency B', 'N4', 'NORTH 4', 'C1', 'RANA MOTORS PVT LTD', '08D3-08'),
	(54, 'MS153', 'INZAMAM A SHAIKH', 'RM', 'Agency C', 'N4', 'NORTH 4', 'C1', 'RANA MOTORS PVT LTD', '08D3-08'),
	(55, 'MS154', 'IRAPU RAVI', 'SRM', 'Agency A', 'N4', 'NORTH 4', 'C1', 'PREM MOTORS PVT. LTD.', '08D4-08'),
	(56, 'MS155', 'IRFAN PATEL', 'RM', 'Agency B', 'S1', 'SOUTH 1', 'C1', 'PREM MOTORS PVT. LTD.', '08D4-08'),
	(57, 'MS156', 'ISHFAQ AHMAD FARASH', 'SRM', 'Agency C', 'S1', 'SOUTH 1', 'C1', 'PREM MOTORS PVT. LTD.', '08D4-08'),
	(58, 'MS157', 'IZHAR ANWAAR SIDDIQUI', 'RM', 'Agency A', 'S1', 'SOUTH 1', 'C1', 'PREM MOTORS PVT. LTD.', '08D4-08'),
	(59, 'MS158', 'JADHAV ULHAS VIJAY', 'RM', 'Agency B', 'S1', 'SOUTH 1', 'C1', 'PREM MOTORS PVT. LTD.', '08D4-08'),
	(60, 'MS159', 'JAGAN M', 'RM', 'Agency C', 'S1', 'SOUTH 1', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(61, 'MS160', 'JAGAN THOMAS MATHEW', 'RM', 'Agency A', 'S2', 'SOUTH 2', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(62, 'MS161', 'JAGDEEP SINGH', 'RM', 'Agency B', 'S2', 'SOUTH 2', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(63, 'MS162', 'JAGDISH', 'RM', 'Agency C', 'S2', 'SOUTH 2', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(64, 'MS163', 'JAGDISH KUMAR', 'RM', 'Agency A', 'S2', 'SOUTH 2', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(65, 'MS164', 'KAMAL KANT', 'RM', 'Agency B', 'S2', 'SOUTH 2', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(66, 'MS165', 'KAMAL KISHOR', 'RM', 'Agency C', 'S3', 'SOUTH 3', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(67, 'MS166', 'KAMAL KUMAR VISHVAKARMA', 'SRM', 'Agency A', 'S3', 'SOUTH 3', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(68, 'MS167', 'KAMAL TANEJA', 'RM', 'Agency B', 'S3', 'SOUTH 3', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(69, 'MS168', 'KAMINI DEWANGAN', 'RM', 'Agency C', 'S3', 'SOUTH 3', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(70, 'MS169', 'KAMINI KUMARI', 'RM', 'Agency A', 'S3', 'SOUTH 3', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(71, 'MS170', 'KAMLESH BANGWAL', 'RM', 'Agency B', 'T1', 'SOUTH EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(72, 'MS171', 'KAMLESH TIWARI', 'SRM', 'Agency C', 'T1', 'SOUTH EAST 1', 'C1', 'MAGIC AUTO PVT LTD', '08D5-08'),
	(73, 'MS172', 'LOVEPRIT SINGH', 'RM', 'Agency A', 'T1', 'SOUTH EAST 1', 'C1', 'RANA MOTORS PVT LTD', '08D6-08'),
	(74, 'MS173', 'LUCKY ALI', 'RM', 'Agency B', 'T1', 'SOUTH EAST 1', 'C1', 'RANA MOTORS PVT LTD', '08D6-08'),
	(75, 'MS174', 'LUCKY RAJ SINGH', 'RM', 'Agency C', 'T1', 'SOUTH EAST 1', 'C1', 'RANA MOTORS PVT LTD', '08D6-08'),
	(76, 'MS175', 'M LALRINSANGI', 'RM', 'Agency A', 'T2', 'SOUTH EAST 2', 'C1', 'RANA MOTORS PVT LTD', '08D6-08'),
	(77, 'MS176', 'M ZUBAIR', 'RM', 'Agency B', 'T2', 'SOUTH EAST 2', 'C2', 'PLATINUM MOTOCORP LLP', '2L04-2L'),
	(78, 'MS177', 'MADASAMY R', 'RM', 'Agency C', 'T2', 'SOUTH EAST 2', 'C2', 'ROHAN MOTORS LTD.', '6G02-6G'),
	(79, 'MS178', 'MADHU SUDHANA', 'SRM', 'Agency A', 'T2', 'SOUTH EAST 2', 'C2', 'ROHAN MOTORS LTD.', '6G02-6G'),
	(80, 'MS179', 'MADHU TERESA', 'SRM', 'Agency B', 'T2', 'SOUTH EAST 2', 'C2', 'ROHAN MOTORS LTD.', '6G02-6G'),
	(81, 'MS180', 'MADHUMANTHI TRIMURTHULU', 'RM', 'Agency C', 'W1', 'WEST 1', 'C2', 'ROHAN MOTORS LTD.', '6G02-6G'),
	(82, 'MS181', 'MAHABIR PRASAD SAHOO', 'RM', 'Agency A', 'W1', 'WEST 1', 'C2', 'PASCO AUTOMOBILES', '7L02-7L'),
	(83, 'MS182', 'MAHADEVI POOJARI', 'SRM', 'Agency B', 'W1', 'WEST 1', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(84, 'MS183', 'MAHAK RAWAT', 'RM', 'Agency C', 'W1', 'WEST 1', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(85, 'MS184', 'MAHAMADFARID CHHATBAR', 'SRM', 'Agency A', 'W1', 'WEST 1', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(86, 'MS185', 'OSMAN E GHANI', 'RM', 'Agency B', 'W2', 'WEST 2', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(87, 'MS186', 'OVAIS REYAZ KHAN', 'RM', 'Agency C', 'W2', 'WEST 2', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(88, 'MS187', 'PABITRA KUMAR BEHERA', 'RM', 'Agency A', 'W2', 'WEST 2', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(89, 'MS188', 'PALANIKUMAR M', 'RM', 'Agency B', 'W3', 'WEST 3', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q'),
	(90, 'MS189', 'PALASH SINGHA', 'RM', 'Agency C', 'W3', 'WEST 3', 'C2', 'PLATINUM MOTOCORP LLP', '9Q02-9Q');

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
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.user_result: ~90 rows (approximately)
INSERT INTO `user_result` (`id`, `mspin`, `trainer`, `percentage`, `status`, `rounds_status`, `total_time`, `updated_at`) VALUES
	(1, 'MS100', 'Manjira', 94.67, 'Pass', 'Completed', '01:20:00', '2026-09-16 09:21:33'),
	(2, 'MS101', 'Sudhevan kj', 84.67, 'Pass', 'Completed', '01:30:00', '2026-09-16 09:21:33'),
	(3, 'MS102', 'Sagar mokase', 74.67, 'Fail', 'Completed', '01:40:00', '2026-09-16 09:21:33'),
	(4, 'MS103', 'Tikendra sumara', 64.67, 'Fail', 'Completed', '01:50:00', '2026-09-16 09:21:33'),
	(5, 'MS104', 'Pooja Bora', 90.67, 'Pass', 'Completed', '01:50:00', '2026-09-16 09:21:33'),
	(6, 'MS105', 'Meharban singh Bhatia', 89.33, 'Pass', 'Completed', '01:48:00', '2026-09-16 09:21:33'),
	(7, 'MS106', 'Imtiyaz syed', 79.33, 'Fail', 'Completed', '01:44:00', '2026-09-16 09:21:33'),
	(8, 'MS107', 'Mihir Zaveri', 69.33, 'Fail', 'Completed', '01:54:00', '2026-09-16 09:21:33'),
	(9, 'MS108', 'Virendar hada', 76.67, 'Fail', 'Completed', '01:46:00', '2026-09-16 09:21:33'),
	(10, 'MS109', 'Arun jose', 94.00, 'Pass', 'Completed', '01:26:00', '2026-09-16 09:21:33'),
	(11, 'MS110', 'Manjira', 84.00, 'Pass', 'Completed', '01:35:00', '2026-09-16 09:21:33'),
	(12, 'MS111', 'Sudhevan kj', 74.00, 'Fail', 'Completed', '01:33:00', '2026-09-16 09:21:33'),
	(13, 'MS112', 'Sagar mokase', 64.00, 'Fail', 'Completed', '01:43:00', '2026-09-16 09:21:33'),
	(14, 'MS113', 'Tikendra sumara', 88.67, 'Pass', 'Completed', '01:39:00', '2026-09-16 09:21:33'),
	(15, 'MS114', 'Pooja Bora', 88.67, 'Pass', 'Completed', '01:39:00', '2026-09-16 09:21:33'),
	(16, 'MS115', 'Meharban singh Bhatia', 78.67, 'Fail', 'Completed', '01:49:00', '2026-09-16 09:21:33'),
	(17, 'MS116', 'Imtiyaz syed', 68.67, 'Fail', 'Completed', '01:59:00', '2026-09-16 09:21:33'),
	(18, 'MS117', 'Mihir Zaveri', 84.67, 'Pass', 'Completed', '01:39:00', '2026-09-16 09:21:33'),
	(19, 'MS118', 'Virendar hada', 83.33, 'Pass', 'Completed', '01:49:00', '2026-09-16 09:21:33'),
	(20, 'MS119', 'Arun jose', 83.33, 'Pass', 'Completed', '01:49:00', '2026-09-16 09:21:33'),
	(21, 'MS120', 'Manjira', 73.33, 'Fail', 'Completed', '01:26:00', '2026-09-16 09:21:33'),
	(22, 'MS121', 'Sudhevan kj', 80.67, 'Pass', 'Completed', '01:36:00', '2026-09-16 09:21:33'),
	(23, 'MS122', 'Sagar mokase', 88.00, 'Pass', 'Completed', '01:46:00', '2026-09-16 09:21:33'),
	(24, 'MS123', 'Tikendra sumara', 78.00, 'Fail', 'Completed', '01:44:00', '2026-09-16 09:21:33'),
	(25, 'MS124', 'Pooja Bora', 78.00, 'Fail', 'Completed', '01:44:00', '2026-09-16 09:21:33'),
	(26, 'MS125', 'Meharban singh Bhatia', 68.00, 'Fail', 'Completed', '01:54:00', '2026-09-16 09:21:33'),
	(27, 'MS126', 'Imtiyaz syed', 92.67, 'Pass', 'Completed', '01:46:00', '2026-09-16 09:21:33'),
	(28, 'MS127', 'Mihir Zaveri', 82.67, 'Pass', 'Completed', '01:42:00', '2026-09-16 09:21:33'),
	(29, 'MS128', 'Virendar hada', 72.67, 'Fail', 'Completed', '01:52:00', '2026-09-16 09:21:33'),
	(30, 'MS129', 'Arun jose', 72.67, 'Fail', 'Completed', '01:20:00', '2026-09-16 09:21:33'),
	(31, 'MS130', 'Arun jose', 57.33, 'Fail', 'In Progress', '00:51:00', '2026-09-16 09:21:26'),
	(32, 'MS131', 'Manjira', 51.33, 'Fail', 'In Progress', '00:57:00', '2026-09-16 09:21:26'),
	(33, 'MS132', 'Sudhevan kj', 45.33, 'Fail', 'In Progress', '01:03:00', '2026-09-16 09:21:26'),
	(34, 'MS133', 'Sagar mokase', 39.33, 'Fail', 'In Progress', '01:09:00', '2026-09-16 09:21:26'),
	(35, 'MS134', 'Tikendra sumara', 52.00, 'Fail', 'In Progress', '01:01:00', '2026-09-16 09:21:26'),
	(36, 'MS135', 'Pooja Bora', 54.67, 'Fail', 'In Progress', '00:49:00', '2026-09-16 09:21:26'),
	(37, 'MS136', 'Meharban singh Bhatia', 48.67, 'Fail', 'In Progress', '00:55:00', '2026-09-16 09:21:26'),
	(38, 'MS137', 'Imtiyaz syed', 42.67, 'Fail', 'In Progress', '01:01:00', '2026-09-16 09:21:26'),
	(39, 'MS138', 'Mihir Zaveri', 36.67, 'Fail', 'In Progress', '01:07:00', '2026-09-16 09:21:26'),
	(40, 'MS139', 'Virendar hada', 58.00, 'Fail', 'In Progress', '01:13:00', '2026-09-16 09:21:26'),
	(41, 'MS140', 'Arun jose', 52.00, 'Fail', 'In Progress', '01:00:00', '2026-09-16 09:21:26'),
	(42, 'MS141', 'Manjira', 46.00, 'Fail', 'In Progress', '00:52:00', '2026-09-16 09:21:26'),
	(43, 'MS142', 'Sudhevan kj', 40.00, 'Fail', 'In Progress', '00:58:00', '2026-09-16 09:21:26'),
	(44, 'MS143', 'Sagar mokase', 51.33, 'Fail', 'In Progress', '01:04:00', '2026-09-16 09:21:26'),
	(45, 'MS144', 'Tikendra sumara', 55.33, 'Fail', 'In Progress', '00:52:00', '2026-09-16 09:21:26'),
	(46, 'MS145', 'Pooja Bora', 49.33, 'Fail', 'In Progress', '00:58:00', '2026-09-16 09:21:26'),
	(47, 'MS146', 'Meharban singh Bhatia', 43.33, 'Fail', 'In Progress', '01:04:00', '2026-09-16 09:21:26'),
	(48, 'MS147', 'Imtiyaz syed', 46.00, 'Fail', 'In Progress', '01:10:00', '2026-09-16 09:21:26'),
	(49, 'MS148', 'Mihir Zaveri', 48.67, 'Fail', 'In Progress', '01:02:00', '2026-09-16 09:21:26'),
	(50, 'MS149', 'Virendar hada', 52.67, 'Fail', 'In Progress', '00:48:00', '2026-09-16 09:21:26'),
	(51, 'MS150', 'Virendar hada', 32.00, 'Fail', 'In Progress', '00:35:00', '2026-09-16 09:21:18'),
	(52, 'MS151', 'Arun jose', 28.00, 'Fail', 'In Progress', '00:39:00', '2026-09-16 09:21:18'),
	(53, 'MS152', 'Manjira', 32.67, 'Fail', 'In Progress', '00:43:00', '2026-09-16 09:21:18'),
	(54, 'MS153', 'Sudhevan kj', 28.67, 'Fail', 'In Progress', '00:29:00', '2026-09-16 09:21:18'),
	(55, 'MS154', 'Sagar mokase', 34.67, 'Fail', 'In Progress', '00:33:00', '2026-09-16 09:21:18'),
	(56, 'MS155', 'Tikendra sumara', 30.67, 'Fail', 'In Progress', '00:37:00', '2026-09-16 09:21:18'),
	(57, 'MS156', 'Pooja Bora', 35.33, 'Fail', 'In Progress', '00:41:00', '2026-09-16 09:21:18'),
	(58, 'MS157', 'Meharban singh Bhatia', 31.33, 'Fail', 'In Progress', '00:45:00', '2026-09-16 09:21:18'),
	(59, 'MS158', 'Imtiyaz syed', 27.33, 'Fail', 'In Progress', '00:49:00', '2026-09-16 09:21:18'),
	(60, 'MS159', 'Mihir Zaveri', 33.33, 'Fail', 'In Progress', '00:53:00', '2026-09-16 09:21:18'),
	(61, 'MS160', 'Virendar hada', 38.00, 'Fail', 'In Progress', '00:38:00', '2026-09-16 09:21:18'),
	(62, 'MS161', 'Arun jose', 34.00, 'Fail', 'In Progress', '00:42:00', '2026-09-16 09:21:18'),
	(63, 'MS162', 'Manjira', 30.00, 'Fail', 'In Progress', '00:28:00', '2026-09-16 09:21:18'),
	(64, 'MS163', 'Sudhevan kj', 26.00, 'Fail', 'In Progress', '00:32:00', '2026-09-16 09:21:18'),
	(65, 'MS164', 'Sagar mokase', 32.00, 'Fail', 'In Progress', '00:36:00', '2026-09-16 09:21:18'),
	(66, 'MS165', 'Tikendra sumara', 36.67, 'Fail', 'In Progress', '00:40:00', '2026-09-16 09:21:18'),
	(67, 'MS166', 'Pooja Bora', 32.67, 'Fail', 'In Progress', '00:44:00', '2026-09-16 09:21:18'),
	(68, 'MS167', 'Meharban singh Bhatia', 28.67, 'Fail', 'In Progress', '00:48:00', '2026-09-16 09:21:18'),
	(69, 'MS168', 'Imtiyaz syed', 24.67, 'Fail', 'In Progress', '00:52:00', '2026-09-16 09:21:18'),
	(70, 'MS169', 'Mihir Zaveri', 39.33, 'Fail', 'In Progress', '00:36:00', '2026-09-16 09:21:18'),
	(71, 'MS170', 'Imtiyaz syed', 18.00, 'Fail', 'In Progress', '00:11:00', '2026-09-16 09:21:11'),
	(72, 'MS171', 'Mihir Zaveri', 16.00, 'Fail', 'In Progress', '00:13:00', '2026-09-16 09:21:11'),
	(73, 'MS172', 'Virendar hada', 14.00, 'Fail', 'In Progress', '00:15:00', '2026-09-16 09:21:11'),
	(74, 'MS173', 'Arun jose', 12.00, 'Fail', 'In Progress', '00:17:00', '2026-09-16 09:21:11'),
	(75, 'MS174', 'Manjira', 20.00, 'Fail', 'In Progress', '00:19:00', '2026-09-16 09:21:11'),
	(76, 'MS175', 'Sudhevan kj', 18.00, 'Fail', 'In Progress', '00:21:00', '2026-09-16 09:21:11'),
	(77, 'MS176', 'Sagar mokase', 16.00, 'Fail', 'In Progress', '00:23:00', '2026-09-16 09:21:11'),
	(78, 'MS177', 'Tikendra sumara', 14.00, 'Fail', 'In Progress', '00:25:00', '2026-09-16 09:21:11'),
	(79, 'MS178', 'Pooja Bora', 12.00, 'Fail', 'In Progress', '00:27:00', '2026-09-16 09:21:11'),
	(80, 'MS179', 'Meharban singh Bhatia', 20.00, 'Fail', 'In Progress', '00:29:00', '2026-09-16 09:21:11'),
	(81, 'MS180', 'Imtiyaz syed', 18.00, 'Fail', 'In Progress', '00:12:00', '2026-09-16 09:21:11'),
	(82, 'MS181', 'Mihir Zaveri', 16.00, 'Fail', 'In Progress', '00:14:00', '2026-09-16 09:21:11'),
	(83, 'MS182', 'Virendar hada', 14.00, 'Fail', 'In Progress', '00:16:00', '2026-09-16 09:21:11'),
	(84, 'MS183', 'Arun jose', 12.00, 'Fail', 'In Progress', '00:18:00', '2026-09-16 09:21:11'),
	(85, 'MS184', 'Manjira', 20.00, 'Fail', 'In Progress', '00:20:00', '2026-09-16 09:21:11'),
	(86, 'MS185', 'Sudhevan kj', 18.00, 'Fail', 'In Progress', '00:22:00', '2026-09-16 09:21:11'),
	(87, 'MS186', 'Sagar mokase', 16.00, 'Fail', 'In Progress', '00:24:00', '2026-09-16 09:21:11'),
	(88, 'MS187', 'Tikendra sumara', 14.00, 'Fail', 'In Progress', '00:26:00', '2026-09-16 09:21:11'),
	(89, 'MS188', 'Pooja Bora', 12.00, 'Fail', 'In Progress', '00:28:00', '2026-09-16 09:21:11'),
	(90, 'MS189', 'Meharban singh Bhatia', 20.00, 'Fail', 'In Progress', '00:10:00', '2026-09-16 09:21:11');

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
