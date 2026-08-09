import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  passwordHash: text("password_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const blogPostPasswords = sqliteTable("blog_post_passwords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const experiences = sqliteTable("experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  organization: text("organization").notNull().default(""),
  location: text("location").notNull().default(""),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  description: text("description").notNull().default(""),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const postTags = sqliteTable("post_tags", {
  postId: integer("post_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

export const postGalleryItems = sqliteTable("post_gallery_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const siteProfile = sqliteTable("site_profile", {
  id: integer("id").primaryKey(), aboutHeadingZh:text("about_heading_zh").notNull(), aboutHeadingEn:text("about_heading_en").notNull(),
  aboutBodyZh:text("about_body_zh").notNull(), aboutBodyEn:text("about_body_en").notNull(), skillsHeadingZh:text("skills_heading_zh").notNull(), skillsHeadingEn:text("skills_heading_en").notNull(),
  contactHeadingZh:text("contact_heading_zh").notNull(), contactHeadingEn:text("contact_heading_en").notNull(), contactBodyZh:text("contact_body_zh").notNull(), contactBodyEn:text("contact_body_en").notNull(), updatedAt:integer("updated_at").notNull(),
});
export const portfolioProjects = sqliteTable("portfolio_projects", {
  id:integer("id").primaryKey({autoIncrement:true}),
  titleZh:text("title_zh").notNull(), titleEn:text("title_en").notNull(),
  descriptionZh:text("description_zh").notNull(), descriptionEn:text("description_en").notNull(),
  tag:text("tag").notNull(), technologies:text("technologies").notNull().default(""),
  coverImage:text("cover_image"), linkUrl:text("link_url"), githubUrl:text("github_url"),
  blogSlug:text("blog_slug"), completedAt:text("completed_at"),
  featured:integer("featured", { mode:"boolean" }).notNull().default(false),
  sortOrder:integer("sort_order").notNull().default(0),
});
export const portfolioSkills = sqliteTable("portfolio_skills", { id:integer("id").primaryKey({autoIncrement:true}), nameZh:text("name_zh").notNull(), nameEn:text("name_en").notNull(), descriptionZh:text("description_zh").notNull(), descriptionEn:text("description_en").notNull(), sortOrder:integer("sort_order").notNull().default(0) });
export const contactLinks = sqliteTable("contact_links", { id:integer("id").primaryKey({autoIncrement:true}), label:text("label").notNull(), value:text("value").notNull(), linkUrl:text("link_url"), sortOrder:integer("sort_order").notNull().default(0) });

export const musicTracks = sqliteTable("music_tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  audioUrl: text("audio_url").notNull(),
  coverUrl: text("cover_url"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const songRequests = sqliteTable("song_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  linkUrl: text("link_url"),
  message: text("message").notNull().default(""),
  requesterHash: text("requester_hash").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: integer("created_at").notNull(),
});

export const siteVisits = sqliteTable("site_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorHash: text("visitor_hash").notNull(),
  path: text("path").notNull(),
  blogSlug: text("blog_slug"),
  visitedAt: integer("visited_at").notNull(),
  visitDay: text("visit_day").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  ipAddress: text("ip_address"),
});

export const onlineSessions = sqliteTable("online_sessions", {
  visitorHash: text("visitor_hash").primaryKey(),
  path: text("path").notNull(),
  lastSeen: integer("last_seen").notNull(),
});

export const adminActivityLogs = sqliteTable("admin_activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const visitorProfiles = sqliteTable("visitor_profiles", {
  visitorHash: text("visitor_hash").primaryKey(), consentLevel: text("consent_level").notNull().default("automatic"),
  firstSeen: integer("first_seen").notNull(), lastSeen: integer("last_seen").notNull(), browser: text("browser"), os: text("os"),
  device: text("device"), language: text("language"), timezone: text("timezone"), country: text("country"), screenSize: text("screen_size"),
  viewportSize: text("viewport_size"), colorScheme: text("color_scheme"), connectionType: text("connection_type"),
  touchEnabled: integer("touch_enabled", { mode: "boolean" }), referrerHost: text("referrer_host"),
});
