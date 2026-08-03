CREATE TABLE IF NOT EXISTS `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tags_name_unique` ON `tags` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tags_slug_unique` ON `tags` (`slug`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `post_tags` (
	`post_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY (`post_id`, `tag_id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `post_tags_tag_idx` ON `post_tags` (`tag_id`);
