CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`description` text DEFAULT '' NOT NULL,
	`link_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `experiences_order_idx` ON `experiences` (`sort_order`,`start_date`);
