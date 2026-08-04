CREATE TABLE IF NOT EXISTS `tags` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `name` text NOT NULL UNIQUE, `slug` text NOT NULL UNIQUE, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `post_tags` (`post_id` integer NOT NULL, `tag_id` integer NOT NULL, PRIMARY KEY (`post_id`,`tag_id`));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `post_tags_tag_idx` ON `post_tags` (`tag_id`);
