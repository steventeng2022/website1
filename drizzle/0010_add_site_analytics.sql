CREATE TABLE IF NOT EXISTS `site_visits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `visitor_hash` text NOT NULL,
  `path` text NOT NULL,
  `blog_slug` text,
  `visited_at` integer NOT NULL,
  `visit_day` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `online_sessions` (`visitor_hash` text PRIMARY KEY NOT NULL,`path` text NOT NULL,`last_seen` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admin_activity_logs` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,`admin_email` text NOT NULL,`action` text NOT NULL,`detail` text DEFAULT '' NOT NULL,`created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `site_visits_time_idx` ON `site_visits` (`visited_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `site_visits_day_idx` ON `site_visits` (`visit_day`,`visitor_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `site_visits_blog_idx` ON `site_visits` (`blog_slug`,`visited_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `online_sessions_seen_idx` ON `online_sessions` (`last_seen`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admin_activity_time_idx` ON `admin_activity_logs` (`created_at`);
