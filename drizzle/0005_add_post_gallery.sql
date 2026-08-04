CREATE TABLE `post_gallery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `post_gallery_post_idx` ON `post_gallery_items` (`post_id`,`sort_order`,`id`);
