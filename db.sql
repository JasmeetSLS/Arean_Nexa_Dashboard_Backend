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

-- Dumping data for table skill_contest_portal.admin: ~2 rows (approximately)
INSERT INTO `admin` (`id`, `username`, `password`, `status`) VALUES
	(1, 'Admin', '$2b$12$24vr9WK4g3VJRlDslopOBuIU5tsgIVNcfEx4jhgaYrcMszO5wqyzS', 'active'),
	(2, 'Admin2', '$2b$12$24vr9WK4g3VJRlDslopOBuIU5tsgIVNcfEx4jhgaYrcMszO5wqyzS', 'active');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.chat_messages: ~0 rows (approximately)

-- Dumping structure for table skill_contest_portal.participant_rounds
CREATE TABLE IF NOT EXISTS `participant_rounds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `trainer_name` varchar(120) DEFAULT NULL,
  `round_name` varchar(50) NOT NULL,
  `score` tinyint unsigned DEFAULT NULL COMMENT 'Max 30; NULL while running',
  `end_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_round_mspin` (`mpin`),
  CONSTRAINT `chk_score` CHECK (((`score` is null) or (`score` between 0 and 30)))
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.participant_rounds: ~250 rows (approximately)
INSERT INTO `participant_rounds` (`id`, `mpin`, `trainer_name`, `round_name`, `score`, `end_time`) VALUES
	(1, 'MS100', 'Pooja Bora', 'Round 1', 26, '2026-09-04 09:18:17'),
	(2, 'MS100', 'Imtiyaz syed', 'Round 2', 28, '2026-09-04 09:36:17'),
	(3, 'MS100', 'Virendar hada', 'Round 3', 29, '2026-09-04 09:54:17'),
	(4, 'MS100', 'Arun jose', 'Round 4', 30, '2026-09-04 10:12:17'),
	(5, 'MS100', 'Manjira', 'Round 5', 28, '2026-09-04 11:30:57'),
	(6, 'MS101', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:25:42'),
	(7, 'MS101', 'Mihir Zaveri', 'Round 2', 25, '2026-09-04 09:49:42'),
	(8, 'MS101', 'Arun jose', 'Round 3', 26, '2026-09-04 10:13:42'),
	(9, 'MS101', 'Manjira', 'Round 4', 27, '2026-09-04 10:37:42'),
	(10, 'MS101', 'Sudhevan kj', 'Round 5', 25, '2026-09-04 13:14:00'),
	(11, 'MS102', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:15:09'),
	(12, 'MS102', 'Virendar hada', 'Round 2', 22, '2026-09-04 09:27:09'),
	(13, 'MS102', 'Manjira', 'Round 3', 23, '2026-09-04 09:39:09'),
	(14, 'MS102', 'Sudhevan kj', 'Round 4', 24, '2026-09-04 09:51:09'),
	(15, 'MS102', 'Sagar mokase', 'Round 5', 22, '2026-09-04 10:48:54'),
	(16, 'MS103', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:34:53'),
	(17, 'MS103', 'Arun jose', 'Round 2', 19, '2026-09-04 10:04:53'),
	(18, 'MS103', 'Sudhevan kj', 'Round 3', 20, '2026-09-04 10:34:53'),
	(19, 'MS103', 'Sagar mokase', 'Round 4', 21, '2026-09-04 11:04:53'),
	(20, 'MS103', 'Tikendra sumara', 'Round 5', 19, '2026-09-04 14:25:58'),
	(21, 'MS104', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:27:31'),
	(22, 'MS104', 'Manjira', 'Round 2', 29, '2026-09-04 09:48:31'),
	(23, 'MS104', 'Sagar mokase', 'Round 3', 30, '2026-09-04 10:09:31'),
	(24, 'MS104', 'Tikendra sumara', 'Round 4', 18, '2026-09-04 10:30:31'),
	(25, 'MS104', 'Pooja Bora', 'Round 5', 29, '2026-09-04 12:14:53'),
	(26, 'MS105', 'Arun jose', 'Round 1', 27, '2026-09-04 09:20:22'),
	(27, 'MS105', 'Sudhevan kj', 'Round 2', 26, '2026-09-04 09:30:22'),
	(28, 'MS105', 'Tikendra sumara', 'Round 3', 27, '2026-09-04 09:40:22'),
	(29, 'MS105', 'Pooja Bora', 'Round 4', 28, '2026-09-04 09:50:22'),
	(30, 'MS105', 'Meharban singh Bhatia', 'Round 5', 26, '2026-09-04 09:57:40'),
	(31, 'MS106', 'Manjira', 'Round 1', 24, '2026-09-04 09:39:08'),
	(32, 'MS106', 'Sagar mokase', 'Round 2', 23, '2026-09-04 10:06:08'),
	(33, 'MS106', 'Pooja Bora', 'Round 3', 24, '2026-09-04 10:33:08'),
	(34, 'MS106', 'Meharban singh Bhatia', 'Round 4', 25, '2026-09-04 11:00:08'),
	(35, 'MS106', 'Imtiyaz syed', 'Round 5', 23, '2026-09-04 14:07:49'),
	(36, 'MS107', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:29:47'),
	(37, 'MS107', 'Tikendra sumara', 'Round 2', 20, '2026-09-04 09:44:47'),
	(38, 'MS107', 'Meharban singh Bhatia', 'Round 3', 21, '2026-09-04 09:59:47'),
	(39, 'MS107', 'Imtiyaz syed', 'Round 4', 22, '2026-09-04 10:14:47'),
	(40, 'MS107', 'Mihir Zaveri', 'Round 5', 20, '2026-09-04 11:26:56'),
	(41, 'MS108', 'Sagar mokase', 'Round 1', 18, '2026-09-04 09:41:35'),
	(42, 'MS108', 'Pooja Bora', 'Round 2', 30, '2026-09-04 10:06:35'),
	(43, 'MS108', 'Imtiyaz syed', 'Round 3', 18, '2026-09-04 10:31:35'),
	(44, 'MS108', 'Mihir Zaveri', 'Round 4', 19, '2026-09-04 10:56:35'),
	(45, 'MS108', 'Virendar hada', 'Round 5', 30, '2026-09-04 12:59:11'),
	(46, 'MS109', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:32:11'),
	(47, 'MS109', 'Meharban singh Bhatia', 'Round 2', 27, '2026-09-04 09:46:11'),
	(48, 'MS109', 'Mihir Zaveri', 'Round 3', 28, '2026-09-04 10:00:11'),
	(49, 'MS109', 'Virendar hada', 'Round 4', 29, '2026-09-04 10:14:11'),
	(50, 'MS109', 'Arun jose', 'Round 5', 27, '2026-09-04 10:47:05'),
	(51, 'MS110', 'Pooja Bora', 'Round 1', 27, '2026-09-04 09:49:29'),
	(52, 'MS110', 'Imtiyaz syed', 'Round 2', 24, '2026-09-04 10:18:29'),
	(53, 'MS110', 'Virendar hada', 'Round 3', 25, '2026-09-04 10:47:29'),
	(54, 'MS110', 'Arun jose', 'Round 4', 26, '2026-09-04 11:16:29'),
	(55, 'MS110', 'Manjira', 'Round 5', 24, '2026-09-04 14:53:56'),
	(56, 'MS111', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 09:44:04'),
	(57, 'MS111', 'Mihir Zaveri', 'Round 2', 21, '2026-09-04 10:06:04'),
	(58, 'MS111', 'Arun jose', 'Round 3', 22, '2026-09-04 10:28:04'),
	(59, 'MS111', 'Manjira', 'Round 4', 23, '2026-09-04 10:50:04'),
	(60, 'MS111', 'Sudhevan kj', 'Round 5', 21, '2026-09-04 12:20:07'),
	(61, 'MS112', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 09:50:38'),
	(62, 'MS112', 'Virendar hada', 'Round 2', 18, '2026-09-04 10:16:38'),
	(63, 'MS112', 'Manjira', 'Round 3', 19, '2026-09-04 10:42:38'),
	(64, 'MS112', 'Sudhevan kj', 'Round 4', 20, '2026-09-04 11:08:38'),
	(65, 'MS112', 'Sagar mokase', 'Round 5', 18, '2026-09-04 13:32:30'),
	(66, 'MS113', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:39:52'),
	(67, 'MS113', 'Arun jose', 'Round 2', 28, '2026-09-04 09:52:52'),
	(68, 'MS113', 'Sudhevan kj', 'Round 3', 29, '2026-09-04 10:05:52'),
	(69, 'MS113', 'Sagar mokase', 'Round 4', 30, '2026-09-04 10:18:52'),
	(70, 'MS113', 'Tikendra sumara', 'Round 5', 28, '2026-09-04 11:19:03'),
	(71, 'MS114', 'Virendar hada', 'Round 1', 30, '2026-09-04 09:51:16'),
	(72, 'MS114', 'Manjira', 'Round 2', 25, '2026-09-04 10:14:16'),
	(73, 'MS114', 'Sagar mokase', 'Round 3', 26, '2026-09-04 10:37:16'),
	(74, 'MS114', 'Tikendra sumara', 'Round 4', 27, '2026-09-04 11:00:16'),
	(75, 'MS114', 'Pooja Bora', 'Round 5', 25, '2026-09-04 12:52:00'),
	(76, 'MS115', 'Arun jose', 'Round 1', 27, '2026-09-04 09:41:27'),
	(77, 'MS115', 'Sudhevan kj', 'Round 2', 22, '2026-09-04 09:52:27'),
	(78, 'MS115', 'Pooja Bora', 'Round 3', 23, '2026-09-04 10:03:27'),
	(79, 'MS115', 'Meharban singh Bhatia', 'Round 4', 24, '2026-09-04 10:14:27'),
	(80, 'MS115', 'Imtiyaz syed', 'Round 5', 22, '2026-09-04 10:23:00'),
	(81, 'MS116', 'Manjira', 'Round 1', 24, '2026-09-04 10:00:44'),
	(82, 'MS116', 'Sagar mokase', 'Round 2', 19, '2026-09-04 10:28:44'),
	(83, 'MS116', 'Meharban singh Bhatia', 'Round 3', 20, '2026-09-04 10:56:44'),
	(84, 'MS116', 'Imtiyaz syed', 'Round 4', 21, '2026-09-04 11:24:44'),
	(85, 'MS116', 'Mihir Zaveri', 'Round 5', 19, '2026-09-04 14:48:03'),
	(86, 'MS117', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 09:53:09'),
	(87, 'MS117', 'Tikendra sumara', 'Round 2', 29, '2026-09-04 10:12:09'),
	(88, 'MS117', 'Imtiyaz syed', 'Round 3', 30, '2026-09-04 10:31:09'),
	(89, 'MS117', 'Mihir Zaveri', 'Round 4', 18, '2026-09-04 10:50:09'),
	(90, 'MS117', 'Virendar hada', 'Round 5', 29, '2026-09-04 12:16:57'),
	(91, 'MS118', 'Sagar mokase', 'Round 1', 18, '2026-09-04 10:01:33'),
	(92, 'MS118', 'Pooja Bora', 'Round 2', 26, '2026-09-04 10:26:33'),
	(93, 'MS118', 'Mihir Zaveri', 'Round 3', 27, '2026-09-04 10:51:33'),
	(94, 'MS118', 'Virendar hada', 'Round 4', 28, '2026-09-04 11:16:33'),
	(95, 'MS118', 'Arun jose', 'Round 5', 26, '2026-09-04 13:32:40'),
	(96, 'MS119', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 09:55:51'),
	(97, 'MS119', 'Meharban singh Bhatia', 'Round 2', 23, '2026-09-04 10:12:51'),
	(98, 'MS119', 'Virendar hada', 'Round 3', 24, '2026-09-04 10:29:51'),
	(99, 'MS119', 'Arun jose', 'Round 4', 25, '2026-09-04 10:46:51'),
	(100, 'MS119', 'Manjira', 'Round 5', 23, '2026-09-04 11:17:18'),
	(101, 'MS120', 'Pooja Bora', 'Round 1', 27, '2026-09-04 10:07:12'),
	(102, 'MS120', 'Imtiyaz syed', 'Round 2', 20, '2026-09-04 10:34:12'),
	(103, 'MS120', 'Arun jose', 'Round 3', 21, '2026-09-04 11:01:12'),
	(104, 'MS120', 'Manjira', 'Round 4', 22, '2026-09-04 11:28:12'),
	(105, 'MS120', 'Sudhevan kj', 'Round 5', 20, '2026-09-04 14:14:04'),
	(106, 'MS121', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 10:00:46'),
	(107, 'MS121', 'Mihir Zaveri', 'Round 2', 30, '2026-09-04 10:18:46'),
	(108, 'MS121', 'Manjira', 'Round 3', 18, '2026-09-04 10:36:46'),
	(109, 'MS121', 'Sudhevan kj', 'Round 4', 19, '2026-09-04 10:54:46'),
	(110, 'MS121', 'Sagar mokase', 'Round 5', 30, '2026-09-04 11:55:00'),
	(111, 'MS122', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 10:14:19'),
	(112, 'MS122', 'Virendar hada', 'Round 2', 27, '2026-09-04 10:44:19'),
	(113, 'MS122', 'Sudhevan kj', 'Round 3', 28, '2026-09-04 11:14:19'),
	(114, 'MS122', 'Sagar mokase', 'Round 4', 29, '2026-09-04 11:44:19'),
	(115, 'MS122', 'Tikendra sumara', 'Round 5', 27, '2026-09-04 14:46:57'),
	(116, 'MS123', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 09:57:03'),
	(117, 'MS123', 'Arun jose', 'Round 2', 24, '2026-09-04 10:08:03'),
	(118, 'MS123', 'Sagar mokase', 'Round 3', 25, '2026-09-04 10:19:03'),
	(119, 'MS123', 'Tikendra sumara', 'Round 4', 26, '2026-09-04 10:30:03'),
	(120, 'MS123', 'Pooja Bora', 'Round 5', 24, '2026-09-04 11:01:45'),
	(121, 'MS124', 'Virendar hada', 'Round 1', 30, '2026-09-04 10:12:57'),
	(122, 'MS124', 'Manjira', 'Round 2', 21, '2026-09-04 10:36:57'),
	(123, 'MS124', 'Tikendra sumara', 'Round 3', 22, '2026-09-04 11:00:57'),
	(124, 'MS124', 'Pooja Bora', 'Round 4', 23, '2026-09-04 11:24:57'),
	(125, 'MS124', 'Meharban singh Bhatia', 'Round 5', 21, '2026-09-04 13:26:05'),
	(126, 'MS125', 'Arun jose', 'Round 1', 27, '2026-09-04 09:59:24'),
	(127, 'MS125', 'Sudhevan kj', 'Round 2', 18, '2026-09-04 10:08:24'),
	(128, 'MS125', 'Pooja Bora', 'Round 3', 19, '2026-09-04 10:17:24'),
	(129, 'MS125', 'Meharban singh Bhatia', 'Round 4', 20, '2026-09-04 10:26:24'),
	(130, 'MS125', 'Imtiyaz syed', 'Round 5', 18, '2026-09-04 10:32:35'),
	(131, 'MS126', 'Manjira', 'Round 1', 24, '2026-09-04 10:20:38'),
	(132, 'MS126', 'Sagar mokase', 'Round 2', 28, '2026-09-04 10:48:38'),
	(133, 'MS126', 'Meharban singh Bhatia', 'Round 3', 29, '2026-09-04 11:16:38'),
	(134, 'MS126', 'Imtiyaz syed', 'Round 4', 30, '2026-09-04 11:44:38'),
	(135, 'MS126', 'Mihir Zaveri', 'Round 5', 28, '2026-09-04 14:37:37'),
	(136, 'MS127', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 10:08:11'),
	(137, 'MS127', 'Tikendra sumara', 'Round 2', 25, '2026-09-04 10:22:11'),
	(138, 'MS127', 'Imtiyaz syed', 'Round 3', 26, '2026-09-04 10:36:11'),
	(139, 'MS127', 'Mihir Zaveri', 'Round 4', 27, '2026-09-04 10:50:11'),
	(140, 'MS127', 'Virendar hada', 'Round 5', 25, '2026-09-04 12:02:47'),
	(141, 'MS128', 'Sagar mokase', 'Round 1', 18, '2026-09-04 10:17:45'),
	(142, 'MS128', 'Pooja Bora', 'Round 2', 22, '2026-09-04 10:38:45'),
	(143, 'MS128', 'Mihir Zaveri', 'Round 3', 23, '2026-09-04 10:59:45'),
	(144, 'MS128', 'Virendar hada', 'Round 4', 24, '2026-09-04 11:20:45'),
	(145, 'MS128', 'Arun jose', 'Round 5', 22, '2026-09-04 13:12:06'),
	(146, 'MS129', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 10:15:28'),
	(147, 'MS129', 'Meharban singh Bhatia', 'Round 2', 19, '2026-09-04 10:32:28'),
	(148, 'MS129', 'Virendar hada', 'Round 3', 20, '2026-09-04 10:49:28'),
	(149, 'MS129', 'Arun jose', 'Round 4', 21, '2026-09-04 11:06:28'),
	(150, 'MS129', 'Manjira', 'Round 5', 19, '2026-09-04 11:57:15'),
	(151, 'MS130', 'Pooja Bora', 'Round 1', 27, '2026-09-04 10:14:36'),
	(152, 'MS130', 'Imtiyaz syed', 'Round 2', 29, '2026-09-04 10:32:36'),
	(153, 'MS130', 'Virendar hada', 'Round 3', 30, '2026-09-04 10:52:36'),
	(154, 'MS131', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 10:18:19'),
	(155, 'MS131', 'Mihir Zaveri', 'Round 2', 26, '2026-09-04 10:38:19'),
	(156, 'MS131', 'Arun jose', 'Round 3', 27, '2026-09-04 11:00:19'),
	(157, 'MS132', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 10:20:47'),
	(158, 'MS132', 'Virendar hada', 'Round 2', 23, '2026-09-04 10:42:47'),
	(159, 'MS132', 'Manjira', 'Round 3', 24, '2026-09-04 11:06:47'),
	(160, 'MS133', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 10:19:53'),
	(161, 'MS133', 'Arun jose', 'Round 2', 20, '2026-09-04 10:35:53'),
	(162, 'MS133', 'Sudhevan kj', 'Round 3', 21, '2026-09-04 10:53:53'),
	(163, 'MS134', 'Virendar hada', 'Round 1', 30, '2026-09-04 10:30:22'),
	(164, 'MS134', 'Manjira', 'Round 2', 18, '2026-09-04 10:52:22'),
	(165, 'MS134', 'Sagar mokase', 'Round 3', 18, '2026-09-04 11:16:22'),
	(166, 'MS135', 'Arun jose', 'Round 1', 27, '2026-09-04 10:23:09'),
	(167, 'MS135', 'Sudhevan kj', 'Round 2', 28, '2026-09-04 10:43:09'),
	(168, 'MS135', 'Tikendra sumara', 'Round 3', 28, '2026-09-04 11:05:09'),
	(169, 'MS136', 'Manjira', 'Round 1', 24, '2026-09-04 10:27:41'),
	(170, 'MS136', 'Sagar mokase', 'Round 2', 25, '2026-09-04 10:49:41'),
	(171, 'MS136', 'Pooja Bora', 'Round 3', 25, '2026-09-04 11:13:41'),
	(172, 'MS137', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 10:28:15'),
	(173, 'MS137', 'Tikendra sumara', 'Round 2', 22, '2026-09-04 10:48:15'),
	(174, 'MS137', 'Meharban singh Bhatia', 'Round 3', 22, '2026-09-04 11:10:15'),
	(175, 'MS138', 'Sagar mokase', 'Round 1', 18, '2026-09-04 10:30:55'),
	(176, 'MS138', 'Pooja Bora', 'Round 2', 19, '2026-09-04 10:52:55'),
	(177, 'MS138', 'Imtiyaz syed', 'Round 3', 19, '2026-09-04 11:16:55'),
	(178, 'MS139', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 10:35:30'),
	(179, 'MS139', 'Meharban singh Bhatia', 'Round 2', 29, '2026-09-04 10:57:30'),
	(180, 'MS139', 'Mihir Zaveri', 'Round 3', 29, '2026-09-04 11:21:30'),
	(181, 'MS140', 'Pooja Bora', 'Round 1', 27, '2026-09-04 10:38:47'),
	(182, 'MS140', 'Imtiyaz syed', 'Round 2', 26, '2026-09-04 11:00:47'),
	(183, 'MS140', 'Virendar hada', 'Round 3', 26, '2026-09-04 11:24:47'),
	(184, 'MS141', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 10:38:12'),
	(185, 'MS141', 'Mihir Zaveri', 'Round 2', 23, '2026-09-04 10:58:12'),
	(186, 'MS141', 'Arun jose', 'Round 3', 23, '2026-09-04 11:20:12'),
	(187, 'MS142', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 10:42:59'),
	(188, 'MS142', 'Virendar hada', 'Round 2', 20, '2026-09-04 11:02:59'),
	(189, 'MS142', 'Manjira', 'Round 3', 20, '2026-09-04 11:24:59'),
	(190, 'MS143', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 10:36:23'),
	(191, 'MS143', 'Arun jose', 'Round 2', 30, '2026-09-04 10:56:23'),
	(192, 'MS143', 'Sudhevan kj', 'Round 3', 30, '2026-09-04 11:18:23'),
	(193, 'MS144', 'Virendar hada', 'Round 1', 30, '2026-09-04 10:44:07'),
	(194, 'MS144', 'Manjira', 'Round 2', 27, '2026-09-04 11:06:07'),
	(195, 'MS144', 'Sagar mokase', 'Round 3', 27, '2026-09-04 11:30:07'),
	(196, 'MS145', 'Arun jose', 'Round 1', 27, '2026-09-04 10:44:44'),
	(197, 'MS145', 'Sudhevan kj', 'Round 2', 24, '2026-09-04 11:06:44'),
	(198, 'MS145', 'Tikendra sumara', 'Round 3', 24, '2026-09-04 11:30:44'),
	(199, 'MS146', 'Manjira', 'Round 1', 24, '2026-09-04 10:46:18'),
	(200, 'MS146', 'Sagar mokase', 'Round 2', 21, '2026-09-04 11:08:18'),
	(201, 'MS146', 'Pooja Bora', 'Round 3', 21, '2026-09-04 11:32:18'),
	(202, 'MS147', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 10:44:37'),
	(203, 'MS147', 'Tikendra sumara', 'Round 2', 18, '2026-09-04 11:04:37'),
	(204, 'MS147', 'Meharban singh Bhatia', 'Round 3', 18, '2026-09-04 11:26:37'),
	(205, 'MS148', 'Sagar mokase', 'Round 1', 18, '2026-09-04 10:48:26'),
	(206, 'MS148', 'Pooja Bora', 'Round 2', 28, '2026-09-04 11:10:26'),
	(207, 'MS148', 'Imtiyaz syed', 'Round 3', 28, '2026-09-04 11:34:26'),
	(208, 'MS149', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 10:48:53'),
	(209, 'MS149', 'Meharban singh Bhatia', 'Round 2', 25, '2026-09-04 11:10:53'),
	(210, 'MS149', 'Mihir Zaveri', 'Round 3', 25, '2026-09-04 11:34:53'),
	(211, 'MS150', 'Pooja Bora', 'Round 1', 27, '2026-09-04 10:58:14'),
	(212, 'MS151', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 10:54:39'),
	(213, 'MS152', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 11:02:56'),
	(214, 'MS153', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 10:54:21'),
	(215, 'MS154', 'Virendar hada', 'Round 1', 30, '2026-09-04 11:06:05'),
	(216, 'MS155', 'Arun jose', 'Round 1', 27, '2026-09-04 11:00:48'),
	(217, 'MS156', 'Manjira', 'Round 1', 24, '2026-09-04 11:04:33'),
	(218, 'MS157', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 11:02:17'),
	(219, 'MS158', 'Sagar mokase', 'Round 1', 18, '2026-09-04 11:04:42'),
	(220, 'MS159', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 11:12:09'),
	(221, 'MS160', 'Pooja Bora', 'Round 1', 27, '2026-09-04 11:10:31'),
	(222, 'MS161', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 11:12:54'),
	(223, 'MS162', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 11:12:26'),
	(224, 'MS163', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 11:14:48'),
	(225, 'MS164', 'Virendar hada', 'Round 1', 30, '2026-09-04 11:20:11'),
	(226, 'MS165', 'Arun jose', 'Round 1', 27, '2026-09-04 11:18:37'),
	(227, 'MS166', 'Manjira', 'Round 1', 24, '2026-09-04 11:22:52'),
	(228, 'MS167', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 11:24:15'),
	(229, 'MS168', 'Sagar mokase', 'Round 1', 18, '2026-09-04 11:26:43'),
	(230, 'MS169', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 11:32:29'),
	(231, 'MS170', 'Pooja Bora', 'Round 1', 27, '2026-09-04 11:30:07'),
	(232, 'MS171', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 11:36:41'),
	(233, 'MS172', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 11:34:23'),
	(234, 'MS173', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 11:34:58'),
	(235, 'MS174', 'Virendar hada', 'Round 1', 30, '2026-09-04 11:40:34'),
	(236, 'MS175', 'Arun jose', 'Round 1', 27, '2026-09-04 11:42:12'),
	(237, 'MS176', 'Manjira', 'Round 1', 24, '2026-09-04 11:42:47'),
	(238, 'MS177', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 11:44:22'),
	(239, 'MS178', 'Sagar mokase', 'Round 1', 18, '2026-09-04 11:48:59'),
	(240, 'MS179', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 11:48:13'),
	(241, 'MS180', 'Pooja Bora', 'Round 1', 27, '2026-09-04 11:52:45'),
	(242, 'MS181', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 11:54:28'),
	(243, 'MS182', 'Imtiyaz syed', 'Round 1', 21, '2026-09-04 11:52:06'),
	(244, 'MS183', 'Mihir Zaveri', 'Round 1', 18, '2026-09-04 11:58:52'),
	(245, 'MS184', 'Virendar hada', 'Round 1', 30, '2026-09-04 12:02:19'),
	(246, 'MS185', 'Arun jose', 'Round 1', 27, '2026-09-04 12:00:37'),
	(247, 'MS186', 'Meharban singh Bhatia', 'Round 1', 24, '2026-09-04 12:02:11'),
	(248, 'MS187', 'Sudhevan kj', 'Round 1', 21, '2026-09-04 12:04:48'),
	(249, 'MS188', 'Sagar mokase', 'Round 1', 18, '2026-09-04 12:06:32'),
	(250, 'MS189', 'Tikendra sumara', 'Round 1', 30, '2026-09-04 12:10:07');

-- Dumping structure for table skill_contest_portal.participants
CREATE TABLE IF NOT EXISTS `participants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role` varchar(50) DEFAULT NULL,
  `agency` varchar(80) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `zone` varchar(30) DEFAULT NULL,
  `city` varchar(80) DEFAULT NULL,
  `dealer_name` varchar(80) DEFAULT NULL,
  `dealer_code` varchar(20) DEFAULT NULL,
  `round_start_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_mspin` (`mpin`),
  KEY `idx_round_start_time` (`round_start_time`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.participants: ~90 rows (approximately)
INSERT INTO `participants` (`id`, `mpin`, `name`, `role`, `agency`, `region`, `zone`, `city`, `dealer_name`, `dealer_code`, `round_start_time`) VALUES
	(1, 'MS100', 'AYUSH RAJ', 'RM', 'Agency A', 'C1', 'Central', 'Delhi', 'PERFECT AUTO SERVICES', 'AH01-AH', '2026-09-04 09:00:17'),
	(2, 'MS101', 'AYUSH YADAV', 'RM', 'Agency B', 'C1', 'Central', 'Delhi', 'PERFECT AUTO SERVICES', 'AH01-AH', '2026-09-04 09:01:42'),
	(3, 'MS102', 'AYYUB KHAN', 'RM', 'Agency C', 'C1', 'Central', 'Delhi', 'PERFECT AUTO SERVICES', 'AH01-AH', '2026-09-04 09:03:09'),
	(4, 'MS103', 'AZHAR KALIM KHAN', 'RM', 'Agency A', 'C1', 'Central', 'Delhi', 'PERFECT AUTO SERVICES', 'AH01-AH', '2026-09-04 09:04:53'),
	(5, 'MS104', 'B CHANDRA SEKHAR', 'RM', 'Agency B', 'C1', 'Central', 'Delhi', 'PERFECT AUTO SERVICES', 'AH01-AH', '2026-09-04 09:06:31'),
	(6, 'MS105', 'BABITHESH P K', 'SRM', 'Agency C', 'C2', 'Central', 'Gurugram', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E', '2026-09-04 09:10:22'),
	(7, 'MS106', 'BABLU NAGAR', 'SRM', 'Agency A', 'C2', 'Central', 'Gurugram', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E', '2026-09-04 09:12:08'),
	(8, 'MS107', 'BADRISH PANDEY', 'SRM', 'Agency B', 'C2', 'Central', 'Gurugram', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E', '2026-09-04 09:14:47'),
	(9, 'MS108', 'BAKHTAR ALLI KILEDAR', 'SRM', 'Agency C', 'C2', 'Central', 'Gurugram', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E', '2026-09-04 09:16:35'),
	(10, 'MS109', 'BALASUNDARAM MUTYALA', 'SRM', 'Agency A', 'C2', 'Central', 'Gurugram', 'KATARIA AUTOMOBILES PVT. LTD.', '2E01-2E', '2026-09-04 09:18:11'),
	(11, 'MS110', 'CHUDAMANI SAHU', 'RM', 'Agency B', 'C3', 'Central', 'Noida', 'RANA MOTORS PVT LTD', '08A1-08', '2026-09-04 09:20:29'),
	(12, 'MS111', 'CIZEER RAJENDRA KADAM', 'RM', 'Agency C', 'C3', 'Central', 'Noida', 'RANA MOTORS PVT LTD', '08A1-08', '2026-09-04 09:22:04'),
	(13, 'MS112', 'DABHI LEENKUMAR NARESHKUMAR', 'RM', 'Agency A', 'C3', 'Central', 'Noida', 'RANA MOTORS PVT LTD', '08A1-08', '2026-09-04 09:24:38'),
	(14, 'MS113', 'DALEEP SINGH', 'RM', 'Agency B', 'C3', 'Central', 'Noida', 'RANA MOTORS PVT LTD', '08A1-08', '2026-09-04 09:26:52'),
	(15, 'MS114', 'DALVIR SINGH', 'RM', 'Agency C', 'C3', 'Central', 'Noida', 'RANA MOTORS PVT LTD', '08A1-08', '2026-09-04 09:28:16'),
	(16, 'MS115', 'DAMANPREET SINGH', 'RM', 'Agency A', 'C4', 'Central', 'Ghaziabad', 'RANA MOTORS PVT LTD', '08A4-08', '2026-09-04 09:30:27'),
	(17, 'MS116', 'DANISH AHAMAD', 'RM', 'Agency B', 'C4', 'Central', 'Ghaziabad', 'RANA MOTORS PVT LTD', '08A4-08', '2026-09-04 09:32:44'),
	(18, 'MS117', 'DANISH GULZAR ZARGER', 'RM', 'Agency C', 'C4', 'Central', 'Ghaziabad', 'RANA MOTORS PVT LTD', '08A4-08', '2026-09-04 09:34:09'),
	(19, 'MS118', 'DANISH MAJEED BHAT', 'RM', 'Agency A', 'C4', 'Central', 'Ghaziabad', 'RANA MOTORS PVT LTD', '08A4-08', '2026-09-04 09:36:33'),
	(20, 'MS119', 'DARPAN ACHARYA', 'RM', 'Agency B', 'C4', 'Central', 'Ghaziabad', 'RANA MOTORS PVT LTD', '08A4-08', '2026-09-04 09:38:51'),
	(21, 'MS120', 'DARSHAN GOWDA L', 'RM', 'Agency C', 'E1', 'East', 'Kolkata', 'MAGIC AUTO PVT LTD', '08B1-08', '2026-09-04 09:40:12'),
	(22, 'MS121', 'DARSHAN SINGH', 'RM', 'Agency A', 'E1', 'East', 'Kolkata', 'MAGIC AUTO PVT LTD', '08B1-08', '2026-09-04 09:42:46'),
	(23, 'MS122', 'DARSHAN VILAS GARVAD', 'RM', 'Agency B', 'E1', 'East', 'Kolkata', 'MAGIC AUTO PVT LTD', '08B1-08', '2026-09-04 09:44:19'),
	(24, 'MS123', 'DATTATRAY BABASO ROMAN', 'RM', 'Agency C', 'E1', 'East', 'Kolkata', 'MAGIC AUTO PVT LTD', '08B1-08', '2026-09-04 09:46:03'),
	(25, 'MS124', 'EDWIN M J', 'RM', 'Agency A', 'E1', 'East', 'Kolkata', 'MAGIC AUTO PVT LTD', '08B1-08', '2026-09-04 09:48:57'),
	(26, 'MS125', 'EZAZ HIDAYATULLAH KHANUSIYA', 'RM', 'Agency B', 'E2', 'East', 'Bhubaneswar', 'AAA VEHICLEADES PVT LTD', '08B4-08', '2026-09-04 09:50:24'),
	(27, 'MS126', 'FAHAD BIN AYYUB', 'RM', 'Agency C', 'E2', 'East', 'Bhubaneswar', 'AAA VEHICLEADES PVT LTD', '08B4-08', '2026-09-04 09:52:38'),
	(28, 'MS127', 'FAHEK ALI BANGALI', 'RM', 'Agency A', 'E2', 'East', 'Bhubaneswar', 'AAA VEHICLEADES PVT LTD', '08B4-08', '2026-09-04 09:54:11'),
	(29, 'MS128', 'FAIZAN ASHRAF DAR', 'SRM', 'Agency B', 'E2', 'East', 'Bhubaneswar', 'AAA VEHICLEADES PVT LTD', '08B4-08', '2026-09-04 09:56:45'),
	(30, 'MS129', 'FAIZAN PASHA KK', 'RM', 'Agency C', 'E2', 'East', 'Bhubaneswar', 'AAA VEHICLEADES PVT LTD', '08B4-08', '2026-09-04 09:58:28'),
	(31, 'MS130', 'FAKRE ALAM', 'RM', 'Agency A', 'E3', 'East', 'Patna', 'MAGIC AUTO PVT LTD', '08B7-08', '2026-09-04 10:00:36'),
	(32, 'MS131', 'FAROOQ KHAN', 'RM', 'Agency B', 'E3', 'East', 'Patna', 'MAGIC AUTO PVT LTD', '08B7-08', '2026-09-04 10:02:19'),
	(33, 'MS132', 'FEROZ SALIM SHAIKH', 'RM', 'Agency C', 'E3', 'East', 'Patna', 'MAGIC AUTO PVT LTD', '08B7-08', '2026-09-04 10:04:47'),
	(34, 'MS133', 'FIDUL KHADER', 'RM', 'Agency A', 'E3', 'East', 'Patna', 'MAGIC AUTO PVT LTD', '08B7-08', '2026-09-04 10:06:53'),
	(35, 'MS134', 'FINAZ K P', 'SRM', 'Agency B', 'E3', 'East', 'Patna', 'MAGIC AUTO PVT LTD', '08B7-08', '2026-09-04 10:08:22'),
	(36, 'MS135', 'FIRDOUS ALAM', 'RM', 'Agency C', 'N1', 'North', 'Chandigarh', 'MAGIC AUTO PVT LTD', '08B8-08', '2026-09-04 10:10:09'),
	(37, 'MS136', 'GOVIND RANA', 'RM', 'Agency A', 'N1', 'North', 'Chandigarh', 'MAGIC AUTO PVT LTD', '08B8-08', '2026-09-04 10:12:41'),
	(38, 'MS137', 'GOVIND SINGH PARIHAR', 'RM', 'Agency B', 'N1', 'North', 'Chandigarh', 'MAGIC AUTO PVT LTD', '08B8-08', '2026-09-04 10:14:15'),
	(39, 'MS138', 'GRISHANT GHANSHAM GAIKWAD', 'SRM', 'Agency C', 'N1', 'North', 'Chandigarh', 'MAGIC AUTO PVT LTD', '08B8-08', '2026-09-04 10:16:55'),
	(40, 'MS139', 'GULSHAN KUMAR', 'RM', 'Agency A', 'N1', 'North', 'Chandigarh', 'MAGIC AUTO PVT LTD', '08B8-08', '2026-09-04 10:18:30'),
	(41, 'MS140', 'GULSHAN KUMAR NARCHAL', 'RM', 'Agency B', 'N2', 'North', 'Ludhiana', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08', '2026-09-04 10:20:47'),
	(42, 'MS141', 'GULZAR AHMAD JOO', 'RM', 'Agency C', 'N2', 'North', 'Ludhiana', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08', '2026-09-04 10:22:12'),
	(43, 'MS142', 'GUNDUMOGULA VENKATA PHANEENDRA', 'RM', 'Agency A', 'N2', 'North', 'Ludhiana', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08', '2026-09-04 10:24:59'),
	(44, 'MS143', 'HANTSULA K', 'SRM', 'Agency B', 'N2', 'North', 'Ludhiana', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08', '2026-09-04 10:26:23'),
	(45, 'MS144', 'HARDIBEN PANKAJBHAI PATEL', 'RM', 'Agency C', 'N2', 'North', 'Ludhiana', 'COMPETENT AUTOMOBILES CO. LTD.', '08C2-08', '2026-09-04 10:28:07'),
	(46, 'MS145', 'HARDIK KULKARNI', 'RM', 'Agency A', 'N3', 'North', 'Amritsar', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08', '2026-09-04 10:30:44'),
	(47, 'MS146', 'HARDIK RAJESHBHAI SANCHALA', 'RM', 'Agency B', 'N3', 'North', 'Amritsar', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08', '2026-09-04 10:32:18'),
	(48, 'MS147', 'HARDIPSINH ZALA', 'SRM', 'Agency C', 'N3', 'North', 'Amritsar', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08', '2026-09-04 10:34:37'),
	(49, 'MS148', 'HARENDER', 'RM', 'Agency A', 'N3', 'North', 'Amritsar', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08', '2026-09-04 10:36:26'),
	(50, 'MS149', 'HARIHARAN S', 'RM', 'Agency B', 'N3', 'North', 'Amritsar', 'T.R. SAWHNEY MOTORS PVT LTD', '08C3-08', '2026-09-04 10:38:53'),
	(51, 'MS150', 'HARIKRISHNA SRIKOLANU', 'RM', 'Agency C', 'N4', 'North', 'Jammu', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08', '2026-09-04 10:40:14'),
	(52, 'MS151', 'INBARASAN P', 'RM', 'Agency A', 'N4', 'North', 'Jammu', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08', '2026-09-04 10:42:39'),
	(53, 'MS152', 'INSHAD C S', 'RM', 'Agency B', 'N4', 'North', 'Jammu', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08', '2026-09-04 10:44:56'),
	(54, 'MS153', 'INZAMAM A SHAIKH', 'RM', 'Agency C', 'N4', 'North', 'Jammu', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08', '2026-09-04 10:46:21'),
	(55, 'MS154', 'IRAPU RAVI', 'SRM', 'Agency A', 'N4', 'North', 'Jammu', 'T.R. SAWHNEY MOTORS PVT LTD', '08D2-08', '2026-09-04 10:48:05'),
	(56, 'MS155', 'IRFAN PATEL', 'RM', 'Agency B', 'S1', 'South', 'Bengaluru', 'PREM MOTORS PVT. LTD.', '08D4-08', '2026-09-04 10:50:48'),
	(57, 'MS156', 'ISHFAQ AHMAD FARASH', 'SRM', 'Agency C', 'S1', 'South', 'Bengaluru', 'PREM MOTORS PVT. LTD.', '08D4-08', '2026-09-04 10:52:33'),
	(58, 'MS157', 'IZHAR ANWAAR SIDDIQUI', 'RM', 'Agency A', 'S1', 'South', 'Bengaluru', 'PREM MOTORS PVT. LTD.', '08D4-08', '2026-09-04 10:54:17'),
	(59, 'MS158', 'JADHAV ULHAS VIJAY', 'RM', 'Agency B', 'S1', 'South', 'Bengaluru', 'PREM MOTORS PVT. LTD.', '08D4-08', '2026-09-04 10:56:42'),
	(60, 'MS159', 'JAGAN M', 'RM', 'Agency C', 'S1', 'South', 'Bengaluru', 'PREM MOTORS PVT. LTD.', '08D4-08', '2026-09-04 10:58:09'),
	(61, 'MS160', 'JAGAN THOMAS MATHEW', 'RM', 'Agency A', 'S2', 'South', 'Chennai', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:00:31'),
	(62, 'MS161', 'JAGDEEP SINGH', 'RM', 'Agency B', 'S2', 'South', 'Chennai', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:02:54'),
	(63, 'MS162', 'JAGDISH', 'RM', 'Agency C', 'S2', 'South', 'Chennai', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:04:26'),
	(64, 'MS163', 'JAGDISH KUMAR', 'RM', 'Agency A', 'S2', 'South', 'Chennai', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:06:48'),
	(65, 'MS164', 'KAMAL KANT', 'RM', 'Agency B', 'S2', 'South', 'Chennai', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:08:11'),
	(66, 'MS165', 'KAMAL KISHOR', 'RM', 'Agency C', 'S3', 'South', 'Hyderabad', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:10:37'),
	(67, 'MS166', 'KAMAL KUMAR VISHVAKARMA', 'SRM', 'Agency A', 'S3', 'South', 'Hyderabad', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:12:52'),
	(68, 'MS167', 'KAMAL TANEJA', 'RM', 'Agency B', 'S3', 'South', 'Hyderabad', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:14:15'),
	(69, 'MS168', 'KAMINI DEWANGAN', 'RM', 'Agency C', 'S3', 'South', 'Hyderabad', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:16:43'),
	(70, 'MS169', 'KAMINI KUMARI', 'RM', 'Agency A', 'S3', 'South', 'Hyderabad', 'MAGIC AUTO PVT LTD', '08D5-08', '2026-09-04 11:18:29'),
	(71, 'MS170', 'KAMLESH BANGWAL', 'RM', 'Agency B', 'T1', 'South East', 'Visakhapatnam', 'RANA MOTORS PVT LTD', '08D6-08', '2026-09-04 11:20:07'),
	(72, 'MS171', 'KAMLESH TIWARI', 'SRM', 'Agency C', 'T1', 'South East', 'Visakhapatnam', 'RANA MOTORS PVT LTD', '08D6-08', '2026-09-04 11:22:41'),
	(73, 'MS172', 'LOVEPRIT SINGH', 'RM', 'Agency A', 'T1', 'South East', 'Visakhapatnam', 'RANA MOTORS PVT LTD', '08D6-08', '2026-09-04 11:24:23'),
	(74, 'MS173', 'LUCKY ALI', 'RM', 'Agency B', 'T1', 'South East', 'Visakhapatnam', 'RANA MOTORS PVT LTD', '08D6-08', '2026-09-04 11:26:58'),
	(75, 'MS174', 'LUCKY RAJ SINGH', 'RM', 'Agency C', 'T1', 'South East', 'Visakhapatnam', 'RANA MOTORS PVT LTD', '08D6-08', '2026-09-04 11:28:34'),
	(76, 'MS175', 'M LALRINSANGI', 'RM', 'Agency A', 'T2', 'South East', 'Bhubaneswar', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:30:12'),
	(77, 'MS176', 'M ZUBAIR', 'RM', 'Agency B', 'T2', 'South East', 'Bhubaneswar', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:32:47'),
	(78, 'MS177', 'MADASAMY R', 'RM', 'Agency C', 'T2', 'South East', 'Bhubaneswar', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:34:22'),
	(79, 'MS178', 'MADHU SUDHANA', 'SRM', 'Agency A', 'T2', 'South East', 'Bhubaneswar', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:36:59'),
	(80, 'MS179', 'MADHU TERESA', 'SRM', 'Agency B', 'T2', 'South East', 'Bhubaneswar', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:38:13'),
	(81, 'MS180', 'MADHUMANTHI TRIMURTHULU', 'RM', 'Agency C', 'W1', 'West', 'Mumbai', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:40:45'),
	(82, 'MS181', 'MAHABIR PRASAD SAHOO', 'RM', 'Agency A', 'W1', 'West', 'Mumbai', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:42:28'),
	(83, 'MS182', 'MAHADEVI POOJARI', 'SRM', 'Agency B', 'W1', 'West', 'Mumbai', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:44:06'),
	(84, 'MS183', 'MAHAK RAWAT', 'RM', 'Agency C', 'W1', 'West', 'Mumbai', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:46:52'),
	(85, 'MS184', 'MAHAMADFARID CHHATBAR', 'SRM', 'Agency A', 'W1', 'West', 'Mumbai', 'ROHAN MOTORS LTD.', '6G02-6G', '2026-09-04 11:48:19'),
	(86, 'MS185', 'OSMAN E GHANI', 'RM', 'Agency B', 'W2', 'West', 'Pune', 'PASCO AUTOMOBILES', '7L02-7L', '2026-09-04 11:50:37'),
	(87, 'MS186', 'OVAIS REYAZ KHAN', 'RM', 'Agency C', 'W2', 'West', 'Pune', 'PASCO AUTOMOBILES', '7L02-7L', '2026-09-04 11:52:11'),
	(88, 'MS187', 'PABITRA KUMAR BEHERA', 'RM', 'Agency A', 'W2', 'West', 'Pune', 'PASCO AUTOMOBILES', '7L02-7L', '2026-09-04 11:54:48'),
	(89, 'MS188', 'PALANIKUMAR M', 'RM', 'Agency B', 'W3', 'West', 'Ahmedabad', 'PLATINUM MOTOCORP LLP', '9Q02-9Q', '2026-09-04 11:56:32'),
	(90, 'MS189', 'PALASH SINGHA', 'RM', 'Agency C', 'W3', 'West', 'Ahmedabad', 'PLATINUM MOTOCORP LLP', '9Q02-9Q', '2026-09-04 11:58:07');

-- Dumping structure for table skill_contest_portal.setup_config
CREATE TABLE IF NOT EXISTS `setup_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `project_name` varchar(150) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.setup_config: ~0 rows (approximately)
INSERT INTO `setup_config` (`id`, `project_name`, `status`, `created_at`) VALUES
	(1, 'Arena', 'active', '2026-10-12 10:48:37');

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

-- Dumping data for table skill_contest_portal.setup_field_master: ~36 rows (approximately)
INSERT INTO `setup_field_master` (`id`, `setup_config_id`, `field_key`, `field_group`, `field_order`, `sort_order`, `is_selected`, `created_at`) VALUES
	(37, 1, 'zone', 'filters', 1, 1, 1, '2026-10-12 10:48:59'),
	(38, 1, 'region', 'filters', 2, 1, 1, '2026-10-12 10:48:59'),
	(39, 1, 'areaOffice', 'filters', 3, 1, 1, '2026-10-12 10:48:59'),
	(40, 1, 'trainer', 'filters', 4, 1, 1, '2026-10-12 10:48:59'),
	(41, 1, 'role', 'filters', 5, 1, 1, '2026-10-12 10:48:59'),
	(42, 1, 'agency', 'filters', 6, 1, 0, '2026-10-12 10:48:59'),
	(43, 1, 'dealerName', 'filters', 7, 1, 1, '2026-10-12 10:48:59'),
	(44, 1, 'dealerCode', 'filters', 8, 1, 1, '2026-10-12 10:48:59'),
	(45, 1, 'scheduled', 'todayLive', 1, 2, 1, '2026-10-12 10:48:59'),
	(46, 1, 'attempted', 'todayLive', 2, 2, 1, '2026-10-12 10:48:59'),
	(47, 1, 'absentees', 'todayLive', 3, 2, 1, '2026-10-12 10:48:59'),
	(48, 1, 'delayed', 'todayLive', 4, 2, 1, '2026-10-12 10:48:59'),
	(49, 1, 'passRate', 'todayLive', 5, 2, 1, '2026-10-12 10:48:59'),
	(50, 1, 'avgTime', 'todayLive', 6, 2, 1, '2026-10-12 10:48:59'),
	(51, 1, 'activeTrainers', 'todayLive', 7, 2, 1, '2026-10-12 10:48:59'),
	(52, 1, 'totalScheduled', 'contest', 1, 3, 1, '2026-10-12 10:48:59'),
	(53, 1, 'totalAttempted', 'contest', 2, 3, 1, '2026-10-12 10:48:59'),
	(54, 1, 'totalAbsentees', 'contest', 3, 3, 1, '2026-10-12 10:48:59'),
	(55, 1, 'totalDelayed', 'contest', 4, 3, 1, '2026-10-12 10:48:59'),
	(56, 1, 'totalResets', 'contest', 5, 3, 1, '2026-10-12 10:48:59'),
	(57, 1, 'overallPass', 'contest', 6, 3, 1, '2026-10-12 10:48:59'),
	(58, 1, 'overallAvg', 'contest', 7, 3, 1, '2026-10-12 10:48:59'),
	(59, 1, 'trainerAssigned', 'metrics', 1, 4, 1, '2026-10-12 10:48:59'),
	(60, 1, 'trainerPassRate', 'metrics', 2, 4, 1, '2026-10-12 10:48:59'),
	(61, 1, 'trainerAvgTime', 'metrics', 3, 4, 1, '2026-10-12 10:48:59'),
	(62, 1, 'participantStatus', 'metrics', 4, 4, 1, '2026-10-12 10:48:59'),
	(63, 1, 'rounds', 'participantJourney', 1, 5, 1, '2026-10-12 10:48:59'),
	(64, 1, 'percentage', 'participantJourney', 2, 5, 1, '2026-10-12 10:48:59'),
	(65, 1, 'totalTime', 'participantJourney', 3, 5, 1, '2026-10-12 10:48:59'),
	(66, 1, 'status', 'participantJourney', 4, 5, 1, '2026-10-12 10:48:59'),
	(67, 1, 'milestones', 'participantJourney', 5, 5, 1, '2026-10-12 10:48:59'),
	(68, 1, 'completed', 'trainerJourney', 1, 6, 1, '2026-10-12 10:48:59'),
	(69, 1, 'passRate', 'trainerJourney', 2, 6, 1, '2026-10-12 10:48:59'),
	(70, 1, 'avgTime', 'trainerJourney', 3, 6, 1, '2026-10-12 10:48:59'),
	(71, 1, 'roundMilestones', 'trainerJourney', 4, 6, 1, '2026-10-12 10:48:59'),
	(72, 1, 'recentList', 'trainerJourney', 5, 6, 1, '2026-10-12 10:48:59');

-- Dumping structure for table skill_contest_portal.trainers
CREATE TABLE IF NOT EXISTS `trainers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.trainers: ~10 rows (approximately)
INSERT INTO `trainers` (`id`, `name`, `photo_url`) VALUES
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

-- Dumping data for table skill_contest_portal.user_permission: ~0 rows (approximately)
INSERT INTO `user_permission` (`id`, `user_id`, `setup_config_id`, `allowed_roles`, `allowed_zones`, `allowed_regions`, `permissions`, `updated_at`) VALUES
	(1, 1, 1, '["RM", "SRM"]', '["Central", "East", "North", "South", "South East", "West"]', '["C1", "C2", "C3", "C4"]', '{"contest": {"overallAvg": true, "overallPass": true, "totalResets": true, "totalDelayed": true, "totalAbsentees": true, "totalAttempted": true, "totalScheduled": true}, "filters": {"role": true, "zone": true, "region": true, "trainer": true, "areaOffice": true, "dealerCode": true, "dealerName": true}, "metrics": {"trainerAvgTime": true, "trainerAssigned": true, "trainerPassRate": true, "participantStatus": true}, "todayLive": {"avgTime": true, "delayed": true, "passRate": true, "absentees": true, "attempted": true, "scheduled": true, "activeTrainers": true}, "trainerJourney": {"avgTime": true, "passRate": true, "completed": true, "recentList": true, "roundMilestones": true}, "participantJourney": {"rounds": true, "status": true, "totalTime": true, "milestones": true, "percentage": true}}', '2026-10-12 10:50:21'),
	(2, 2, 1, '["RM", "SRM"]', '["Central", "East", "North", "South", "South East", "West"]', '["C1", "C2", "C3", "C4", "E1", "E2", "E3", "N1", "N2", "N3", "N4", "S1", "S2", "S3", "T1", "T2", "W1", "W2", "W3"]', '{"contest": {"overallAvg": true, "overallPass": true, "totalResets": true, "totalDelayed": true, "totalAbsentees": true, "totalAttempted": true, "totalScheduled": true}, "filters": {"role": false, "zone": true, "region": true, "trainer": false, "areaOffice": false, "dealerCode": false, "dealerName": false}, "metrics": {"trainerAvgTime": true, "trainerAssigned": true, "trainerPassRate": true, "participantStatus": true}, "todayLive": {"avgTime": false, "delayed": false, "passRate": false, "absentees": false, "attempted": true, "scheduled": true, "activeTrainers": false}, "trainerJourney": {"avgTime": true, "passRate": true, "completed": true, "recentList": true, "roundMilestones": true}, "participantJourney": {"rounds": true, "status": true, "totalTime": true, "milestones": true, "percentage": true}}', '2026-10-12 10:50:56');

-- Dumping structure for table skill_contest_portal.user_result
CREATE TABLE IF NOT EXISTS `user_result` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mpin` varchar(20) NOT NULL,
  `trainer` varchar(120) DEFAULT NULL COMMENT 'Latest/current trainer',
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'sum(score)/150*100',
  `status` enum('Pass','Fail') NOT NULL DEFAULT 'Fail',
  `rounds_status` enum('In Progress','Completed') NOT NULL DEFAULT 'In Progress',
  `total_time` varchar(10) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_result_mspin` (`mpin`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table skill_contest_portal.user_result: ~90 rows (approximately)
INSERT INTO `user_result` (`id`, `mpin`, `trainer`, `percentage`, `status`, `rounds_status`, `total_time`, `updated_at`) VALUES
	(1, 'MS100', 'Manjira', 94.00, 'Pass', 'Completed', '02:30:40', '2026-09-29 05:38:28'),
	(2, 'MS101', 'Sudhevan kj', 84.67, 'Pass', 'Completed', '04:12:18', '2026-09-29 05:38:28'),
	(3, 'MS102', 'Sagar mokase', 74.67, 'Fail', 'Completed', '01:45:45', '2026-09-29 05:38:28'),
	(4, 'MS103', 'Tikendra sumara', 64.67, 'Fail', 'Completed', '05:21:05', '2026-09-29 05:38:28'),
	(5, 'MS104', 'Pooja Bora', 90.67, 'Pass', 'Completed', '03:08:22', '2026-09-29 05:38:28'),
	(6, 'MS105', 'Meharban singh Bhatia', 89.33, 'Pass', 'Completed', '00:47:18', '2026-09-29 05:38:28'),
	(7, 'MS106', 'Imtiyaz syed', 79.33, 'Fail', 'Completed', '04:55:41', '2026-09-29 05:38:28'),
	(8, 'MS107', 'Mihir Zaveri', 69.33, 'Fail', 'Completed', '02:12:09', '2026-09-29 05:38:28'),
	(9, 'MS108', 'Virendar hada', 76.67, 'Fail', 'Completed', '03:42:36', '2026-09-29 05:38:28'),
	(10, 'MS109', 'Arun jose', 94.00, 'Pass', 'Completed', '01:28:54', '2026-09-29 05:38:28'),
	(11, 'MS110', 'Manjira', 84.00, 'Pass', 'Completed', '05:33:27', '2026-09-29 05:38:28'),
	(12, 'MS111', 'Sudhevan kj', 74.00, 'Fail', 'Completed', '02:58:03', '2026-09-29 05:38:28'),
	(13, 'MS112', 'Sagar mokase', 64.00, 'Fail', 'Completed', '04:07:52', '2026-09-29 05:38:28'),
	(14, 'MS113', 'Tikendra sumara', 88.67, 'Pass', 'Completed', '01:52:11', '2026-09-29 05:38:28'),
	(15, 'MS114', 'Pooja Bora', 88.67, 'Pass', 'Completed', '03:23:44', '2026-09-29 05:38:28'),
	(16, 'MS115', 'Imtiyaz syed', 78.67, 'Fail', 'Completed', '00:52:33', '2026-09-29 05:38:28'),
	(17, 'MS116', 'Mihir Zaveri', 68.67, 'Fail', 'Completed', '05:15:19', '2026-09-29 05:38:28'),
	(18, 'MS117', 'Virendar hada', 84.67, 'Pass', 'Completed', '02:42:48', '2026-09-29 05:38:28'),
	(19, 'MS118', 'Arun jose', 83.33, 'Pass', 'Completed', '03:56:07', '2026-09-29 05:38:28'),
	(20, 'MS119', 'Manjira', 83.33, 'Pass', 'Completed', '01:38:27', '2026-09-29 05:38:28'),
	(21, 'MS120', 'Sudhevan kj', 73.33, 'Fail', 'Completed', '04:33:52', '2026-09-29 05:38:28'),
	(22, 'MS121', 'Sagar mokase', 80.67, 'Pass', 'Completed', '02:12:14', '2026-09-29 05:38:28'),
	(23, 'MS122', 'Tikendra sumara', 88.00, 'Pass', 'Completed', '05:02:38', '2026-09-29 05:38:28'),
	(24, 'MS123', 'Pooja Bora', 78.00, 'Fail', 'Completed', '01:15:42', '2026-09-29 05:38:28'),
	(25, 'MS124', 'Meharban singh Bhatia', 78.00, 'Fail', 'Completed', '03:37:08', '2026-09-29 05:38:28'),
	(26, 'MS125', 'Imtiyaz syed', 68.00, 'Fail', 'Completed', '00:42:11', '2026-09-29 05:38:28'),
	(27, 'MS126', 'Mihir Zaveri', 92.67, 'Pass', 'Completed', '04:44:59', '2026-09-29 05:38:28'),
	(28, 'MS127', 'Virendar hada', 82.67, 'Pass', 'Completed', '02:08:36', '2026-09-29 05:38:28'),
	(29, 'MS128', 'Arun jose', 72.67, 'Fail', 'Completed', '03:15:21', '2026-09-29 05:38:28'),
	(30, 'MS129', 'Manjira', 72.67, 'Fail', 'Completed', '01:58:47', '2026-09-29 05:38:28'),
	(31, 'MS130', 'Virendar hada', 57.33, 'Fail', 'In Progress', '00:52:00', '2026-09-29 05:38:28'),
	(32, 'MS131', 'Arun jose', 51.33, 'Fail', 'In Progress', '00:58:00', '2026-09-29 05:38:28'),
	(33, 'MS132', 'Manjira', 45.33, 'Fail', 'In Progress', '01:02:00', '2026-09-29 05:38:28'),
	(34, 'MS133', 'Sudhevan kj', 39.33, 'Fail', 'In Progress', '00:47:00', '2026-09-29 05:38:28'),
	(35, 'MS134', 'Sagar mokase', 44.00, 'Fail', 'In Progress', '01:08:00', '2026-09-29 05:38:28'),
	(36, 'MS135', 'Tikendra sumara', 55.33, 'Fail', 'In Progress', '00:55:00', '2026-09-29 05:38:28'),
	(37, 'MS136', 'Pooja Bora', 49.33, 'Fail', 'In Progress', '01:01:00', '2026-09-29 05:38:28'),
	(38, 'MS137', 'Meharban singh Bhatia', 43.33, 'Fail', 'In Progress', '00:56:00', '2026-09-29 05:38:28'),
	(39, 'MS138', 'Imtiyaz syed', 37.33, 'Fail', 'In Progress', '01:00:00', '2026-09-29 05:38:28'),
	(40, 'MS139', 'Mihir Zaveri', 58.67, 'Fail', 'In Progress', '01:03:00', '2026-09-29 05:38:28'),
	(41, 'MS140', 'Virendar hada', 52.67, 'Fail', 'In Progress', '01:04:00', '2026-09-29 05:38:28'),
	(42, 'MS141', 'Arun jose', 46.67, 'Fail', 'In Progress', '00:58:00', '2026-09-29 05:38:28'),
	(43, 'MS142', 'Manjira', 40.67, 'Fail', 'In Progress', '01:00:00', '2026-09-29 05:38:28'),
	(44, 'MS143', 'Sudhevan kj', 52.00, 'Fail', 'In Progress', '00:52:00', '2026-09-29 05:38:28'),
	(45, 'MS144', 'Sagar mokase', 56.00, 'Fail', 'In Progress', '01:02:00', '2026-09-29 05:38:28'),
	(46, 'MS145', 'Tikendra sumara', 50.00, 'Fail', 'In Progress', '01:00:00', '2026-09-29 05:38:28'),
	(47, 'MS146', 'Pooja Bora', 44.00, 'Fail', 'In Progress', '01:00:00', '2026-09-29 05:38:28'),
	(48, 'MS147', 'Meharban singh Bhatia', 38.00, 'Fail', 'In Progress', '00:52:00', '2026-09-29 05:38:28'),
	(49, 'MS148', 'Imtiyaz syed', 49.33, 'Fail', 'In Progress', '00:58:00', '2026-09-29 05:38:28'),
	(50, 'MS149', 'Mihir Zaveri', 53.33, 'Fail', 'In Progress', '00:56:00', '2026-09-29 05:38:28'),
	(51, 'MS150', 'Pooja Bora', 18.00, 'Fail', 'In Progress', '00:18:00', '2026-09-29 05:38:28'),
	(52, 'MS151', 'Meharban singh Bhatia', 16.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(53, 'MS152', 'Imtiyaz syed', 14.00, 'Fail', 'In Progress', '00:18:00', '2026-09-29 05:38:28'),
	(54, 'MS153', 'Mihir Zaveri', 12.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(55, 'MS154', 'Virendar hada', 20.00, 'Fail', 'In Progress', '00:18:00', '2026-09-29 05:38:28'),
	(56, 'MS155', 'Arun jose', 18.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(57, 'MS156', 'Manjira', 16.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(58, 'MS157', 'Sudhevan kj', 14.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(59, 'MS158', 'Sagar mokase', 12.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(60, 'MS159', 'Tikendra sumara', 20.00, 'Fail', 'In Progress', '00:14:00', '2026-09-29 05:38:28'),
	(61, 'MS160', 'Pooja Bora', 18.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(62, 'MS161', 'Meharban singh Bhatia', 16.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(63, 'MS162', 'Imtiyaz syed', 14.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(64, 'MS163', 'Mihir Zaveri', 12.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(65, 'MS164', 'Virendar hada', 20.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(66, 'MS165', 'Arun jose', 18.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(67, 'MS166', 'Manjira', 16.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(68, 'MS167', 'Sudhevan kj', 14.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(69, 'MS168', 'Sagar mokase', 12.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(70, 'MS169', 'Tikendra sumara', 20.00, 'Fail', 'In Progress', '00:14:00', '2026-09-29 05:38:28'),
	(71, 'MS170', 'Pooja Bora', 18.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(72, 'MS171', 'Meharban singh Bhatia', 16.00, 'Fail', 'In Progress', '00:14:00', '2026-09-29 05:38:28'),
	(73, 'MS172', 'Imtiyaz syed', 14.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(74, 'MS173', 'Mihir Zaveri', 12.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(75, 'MS174', 'Virendar hada', 20.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(76, 'MS175', 'Arun jose', 18.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(77, 'MS176', 'Manjira', 16.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(78, 'MS177', 'Sudhevan kj', 14.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(79, 'MS178', 'Sagar mokase', 12.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(80, 'MS179', 'Tikendra sumara', 20.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(81, 'MS180', 'Pooja Bora', 18.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(82, 'MS181', 'Meharban singh Bhatia', 16.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(83, 'MS182', 'Imtiyaz syed', 14.00, 'Fail', 'In Progress', '00:08:00', '2026-09-29 05:38:28'),
	(84, 'MS183', 'Mihir Zaveri', 12.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28'),
	(85, 'MS184', 'Virendar hada', 20.00, 'Fail', 'In Progress', '00:14:00', '2026-09-29 05:38:28'),
	(86, 'MS185', 'Arun jose', 18.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(87, 'MS186', 'Meharban singh Bhatia', 16.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(88, 'MS187', 'Sudhevan kj', 14.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(89, 'MS188', 'Sagar mokase', 12.00, 'Fail', 'In Progress', '00:10:00', '2026-09-29 05:38:28'),
	(90, 'MS189', 'Tikendra sumara', 20.00, 'Fail', 'In Progress', '00:12:00', '2026-09-29 05:38:28');

-- Dumping structure for trigger skill_contest_portal.trg_participant_rounds_after_insert
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_participant_rounds_after_insert` AFTER INSERT ON `participant_rounds` FOR EACH ROW BEGIN
    DECLARE v_exists         INT DEFAULT 0;
    DECLARE v_total_score    INT DEFAULT 0;
    DECLARE v_percentage     DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status         VARCHAR(4);
    DECLARE v_latest_trainer VARCHAR(120);
    DECLARE v_rounds_status  VARCHAR(15);
    DECLARE v_finished       INT DEFAULT 0;
    DECLARE v_total_rounds   INT DEFAULT 0;
    DECLARE v_round_start    DATETIME DEFAULT NULL;
    DECLARE v_last_end       DATETIME DEFAULT NULL;
    DECLARE v_total_secs     BIGINT DEFAULT 0;
    DECLARE v_total_time     VARCHAR(10) DEFAULT '00:00:00';

    -- Total score & percentage
    SELECT COALESCE(SUM(score), 0) INTO v_total_score
      FROM participant_rounds WHERE mpin = NEW.mpin;

    SET v_percentage = ROUND((v_total_score / 150) * 100, 2);

    IF v_percentage > 80 THEN SET v_status = 'Pass';
    ELSE                        SET v_status = 'Fail';
    END IF;

    -- Latest trainer
    SELECT trainer_name INTO v_latest_trainer
      FROM participant_rounds WHERE mpin = NEW.mpin
      ORDER BY id DESC LIMIT 1;

    -- Rounds finished vs total
    SELECT COUNT(*), SUM(score IS NOT NULL AND end_time IS NOT NULL)
      INTO v_total_rounds, v_finished
      FROM participant_rounds WHERE mpin = NEW.mpin;

    IF v_total_rounds >= 5 AND v_finished = 5 THEN
        SET v_rounds_status = 'Completed';
    ELSE
        SET v_rounds_status = 'In Progress';
    END IF;

    -- round_start_time
    SELECT round_start_time INTO v_round_start
      FROM participants WHERE mpin = NEW.mpin LIMIT 1;

    -- Last finished round
    SELECT MAX(end_time) INTO v_last_end
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL AND end_time IS NOT NULL;

    IF v_finished > 0 AND v_round_start IS NOT NULL AND v_last_end IS NOT NULL THEN
        SET v_total_secs = TIMESTAMPDIFF(SECOND, v_round_start, v_last_end);
        IF v_total_secs < 0 THEN SET v_total_secs = 0; END IF;
    ELSE
        SET v_total_secs = 0;
    END IF;

    SET v_total_time = CONCAT(
        LPAD(FLOOR(v_total_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_total_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_total_secs % 60, 2, '0'));

    -- Upsert user_result
    SELECT COUNT(*) INTO v_exists FROM user_result WHERE mpin = NEW.mpin;

    IF v_exists > 0 THEN
        UPDATE user_result
           SET trainer       = v_latest_trainer,
               percentage    = v_percentage,
               status        = v_status,
               rounds_status = v_rounds_status,
               total_time    = v_total_time,
               updated_at    = CURRENT_TIMESTAMP
         WHERE mpin = NEW.mpin;
    ELSE
        INSERT INTO user_result
            (mpin, trainer, percentage, status, rounds_status, total_time)
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
    DECLARE v_exists         INT DEFAULT 0;
    DECLARE v_total_score    INT DEFAULT 0;
    DECLARE v_percentage     DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_status         VARCHAR(4);
    DECLARE v_latest_trainer VARCHAR(120);
    DECLARE v_rounds_status  VARCHAR(15);
    DECLARE v_finished       INT DEFAULT 0;
    DECLARE v_total_rounds   INT DEFAULT 0;
    DECLARE v_round_start    DATETIME DEFAULT NULL;
    DECLARE v_last_end       DATETIME DEFAULT NULL;
    DECLARE v_total_secs     BIGINT DEFAULT 0;
    DECLARE v_total_time     VARCHAR(10) DEFAULT '00:00:00';

    SELECT COALESCE(SUM(score), 0) INTO v_total_score
      FROM participant_rounds WHERE mpin = NEW.mpin;

    SET v_percentage = ROUND((v_total_score / 150) * 100, 2);

    IF v_percentage > 80 THEN SET v_status = 'Pass';
    ELSE                        SET v_status = 'Fail';
    END IF;

    SELECT trainer_name INTO v_latest_trainer
      FROM participant_rounds WHERE mpin = NEW.mpin
      ORDER BY id DESC LIMIT 1;

    SELECT COUNT(*), SUM(score IS NOT NULL AND end_time IS NOT NULL)
      INTO v_total_rounds, v_finished
      FROM participant_rounds WHERE mpin = NEW.mpin;

    IF v_total_rounds >= 5 AND v_finished = 5 THEN
        SET v_rounds_status = 'Completed';
    ELSE
        SET v_rounds_status = 'In Progress';
    END IF;

    SELECT round_start_time INTO v_round_start
      FROM participants WHERE mpin = NEW.mpin LIMIT 1;

    SELECT MAX(end_time) INTO v_last_end
      FROM participant_rounds
     WHERE mpin = NEW.mpin AND score IS NOT NULL AND end_time IS NOT NULL;

    IF v_finished > 0 AND v_round_start IS NOT NULL AND v_last_end IS NOT NULL THEN
        SET v_total_secs = TIMESTAMPDIFF(SECOND, v_round_start, v_last_end);
        IF v_total_secs < 0 THEN SET v_total_secs = 0; END IF;
    ELSE
        SET v_total_secs = 0;
    END IF;

    SET v_total_time = CONCAT(
        LPAD(FLOOR(v_total_secs / 3600), 2, '0'), ':',
        LPAD(FLOOR((v_total_secs % 3600) / 60), 2, '0'), ':',
        LPAD(v_total_secs % 60, 2, '0'));

    SELECT COUNT(*) INTO v_exists FROM user_result WHERE mpin = NEW.mpin;

    IF v_exists > 0 THEN
        UPDATE user_result
           SET trainer       = v_latest_trainer,
               percentage    = v_percentage,
               status        = v_status,
               rounds_status = v_rounds_status,
               total_time    = v_total_time,
               updated_at    = CURRENT_TIMESTAMP
         WHERE mpin = NEW.mpin;
    ELSE
        INSERT INTO user_result
            (mpin, trainer, percentage, status, rounds_status, total_time)
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
