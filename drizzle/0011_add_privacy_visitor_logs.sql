ALTER TABLE `site_visits` ADD COLUMN `duration_seconds` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `visitor_profiles` (
  `visitor_hash` text PRIMARY KEY NOT NULL,
  `consent_level` text DEFAULT 'essential' NOT NULL,
  `first_seen` integer NOT NULL,
  `last_seen` integer NOT NULL,
  `browser` text,
  `os` text,
  `device` text,
  `language` text,
  `timezone` text,
  `country` text,
  `screen_size` text,
  `viewport_size` text,
  `color_scheme` text,
  `connection_type` text,
  `touch_enabled` integer,
  `referrer_host` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `visitor_profiles_seen_idx` ON `visitor_profiles` (`last_seen`);
