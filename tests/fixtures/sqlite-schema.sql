CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile_id` integer NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`linkedin` text NOT NULL,
	`github` text NOT NULL,
	`website` text,
	`location` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_profile_id_unique` ON `contacts` (`profile_id`);--> statement-breakpoint
CREATE TABLE `education` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`school` text NOT NULL,
	`degree` text NOT NULL,
	`field` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`summary` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `education_profile_order_idx` ON `education` (`profile_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `experience_highlights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`experience_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experience_highlights_order_idx` ON `experience_highlights` (`experience_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`location` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`current` integer DEFAULT false NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiences_profile_order_idx` ON `experiences` (`profile_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`location` text NOT NULL,
	`pronouns` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_highlights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_highlights_order_idx` ON `project_highlights` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `project_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_links_order_idx` ON `project_links` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `project_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`src` text NOT NULL,
	`alt` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_technologies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_technologies_order_idx` ON `project_technologies` (`project_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_profile_slug_idx` ON `projects` (`profile_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_profile_order_idx` ON `projects` (`profile_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `resume_metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`published_at` text NOT NULL,
	`status` text NOT NULL,
	`pdf_url` text NOT NULL,
	`summary` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_metadata_profile_id_unique` ON `resume_metadata` (`profile_id`);--> statement-breakpoint
CREATE TABLE `skill_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_groups_profile_order_idx` ON `skill_groups` (`profile_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `skill_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`skill_group_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`skill_group_id`) REFERENCES `skill_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skill_items_group_order_idx` ON `skill_items` (`skill_group_id`,`sort_order`);