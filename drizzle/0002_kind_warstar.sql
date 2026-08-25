CREATE TABLE `package_install_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`install_id` int,
	`registry_id` int NOT NULL,
	`package_id` int NOT NULL,
	`action` enum('install','manual_update','security_update','download_intent') NOT NULL,
	`source_version` varchar(32),
	`target_version` varchar(32),
	`permission_json` json NOT NULL,
	`integrity` varchar(160),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_install_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `package_security_advisories` ADD `resolved_by` int;--> statement-breakpoint
ALTER TABLE `package_security_advisories` ADD `resolution_version` varchar(32);--> statement-breakpoint
ALTER TABLE `package_security_advisories` ADD `resolution_note` text;--> statement-breakpoint
CREATE INDEX `package_install_events_user_idx` ON `package_install_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `package_install_events_package_idx` ON `package_install_events` (`package_id`);