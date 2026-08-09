CREATE TABLE IF NOT EXISTS `blog_post_passwords` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `post_id` integer NOT NULL,
  `label` text DEFAULT '' NOT NULL,
  `password_hash` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `blog_post_passwords_post_idx` ON `blog_post_passwords` (`post_id`, `id`);
INSERT INTO `blog_post_passwords` (`post_id`, `label`, `password_hash`, `created_at`)
SELECT `id`, '原有密碼', `password_hash`, `updated_at` FROM `posts`
WHERE `password_hash` IS NOT NULL AND `password_hash` <> ''
  AND NOT EXISTS (SELECT 1 FROM `blog_post_passwords` WHERE `blog_post_passwords`.`post_id` = `posts`.`id`);
UPDATE `posts` SET `password_hash` = NULL WHERE `password_hash` IS NOT NULL;
