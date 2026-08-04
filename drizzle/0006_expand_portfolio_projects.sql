ALTER TABLE `portfolio_projects` ADD `technologies` text DEFAULT '' NOT NULL;
ALTER TABLE `portfolio_projects` ADD `cover_image` text;
ALTER TABLE `portfolio_projects` ADD `github_url` text;
ALTER TABLE `portfolio_projects` ADD `blog_slug` text;
ALTER TABLE `portfolio_projects` ADD `completed_at` text;
ALTER TABLE `portfolio_projects` ADD `featured` integer DEFAULT 0 NOT NULL;
