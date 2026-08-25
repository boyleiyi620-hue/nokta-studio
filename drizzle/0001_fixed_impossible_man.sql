CREATE TABLE `package_security_advisories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`package_id` int NOT NULL,
	`affected_range` varchar(64) NOT NULL,
	`severity` enum('low','moderate','high','critical') NOT NULL,
	`summary` varchar(240) NOT NULL,
	`remediation` text,
	`reported_by` int NOT NULL,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_security_advisories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `package_versions` ADD `release_notes` text;--> statement-breakpoint
ALTER TABLE `packages` ADD `readme` text;--> statement-breakpoint
CREATE INDEX `package_security_advisories_package_idx` ON `package_security_advisories` (`package_id`);--> statement-breakpoint
CREATE INDEX `package_security_advisories_open_idx` ON `package_security_advisories` (`resolved_at`);