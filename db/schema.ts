import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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
