CREATE TABLE `package_installs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`registry_id` int NOT NULL,
	`package_id` int NOT NULL,
	`version_id` int NOT NULL,
	`requested_range` varchar(64) NOT NULL,
	`locked_version` varchar(32) NOT NULL,
	`update_available` boolean NOT NULL DEFAULT false,
	`notifications_enabled` boolean NOT NULL DEFAULT true,
	`installed_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `package_installs_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_installs_user_package_unique` UNIQUE(`user_id`,`package_id`)
);
--> statement-breakpoint
CREATE TABLE `package_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`install_id` int,
	`package_id` int NOT NULL,
	`kind` enum('update_available','package_published') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_registries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`display_name` varchar(120) NOT NULL,
	`description` text,
	`visibility` enum('private','organization') NOT NULL,
	`owner_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `package_registries_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_registries_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `package_registry_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registry_id` int NOT NULL,
	`user_id` int NOT NULL,
	`access_level` enum('owner','publisher','reader') NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_registry_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_registry_members_unique` UNIQUE(`registry_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `package_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`package_id` int NOT NULL,
	`version` varchar(32) NOT NULL,
	`entry` varchar(160) NOT NULL,
	`source` text NOT NULL,
	`exports_json` json NOT NULL,
	`dependencies_json` json NOT NULL,
	`integrity` varchar(160) NOT NULL,
	`published_by` int NOT NULL,
	`published_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `package_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_versions_package_version_unique` UNIQUE(`package_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registry_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`latest_version` varchar(32),
	`created_by` int NOT NULL,
	`is_archived` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packages_id` PRIMARY KEY(`id`),
	CONSTRAINT `packages_registry_name_unique` UNIQUE(`registry_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `package_installs_user_idx` ON `package_installs` (`user_id`);--> statement-breakpoint
CREATE INDEX `package_notifications_user_read_idx` ON `package_notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `package_registries_owner_idx` ON `package_registries` (`owner_id`);--> statement-breakpoint
CREATE INDEX `package_registry_members_user_idx` ON `package_registry_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `package_versions_package_idx` ON `package_versions` (`package_id`);--> statement-breakpoint
CREATE INDEX `packages_registry_idx` ON `packages` (`registry_id`);