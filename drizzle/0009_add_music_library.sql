CREATE TABLE IF NOT EXISTS `music_tracks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `artist` text NOT NULL,
  `audio_url` text NOT NULL,
  `cover_url` text,
  `enabled` integer DEFAULT 1 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `music_tracks_sort_idx` ON `music_tracks` (`enabled`,`sort_order`,`id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `song_requests` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `artist` text NOT NULL,
  `link_url` text,
  `message` text DEFAULT '' NOT NULL,
  `requester_hash` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `song_requests_requester_idx` ON `song_requests` (`requester_hash`,`created_at`);
