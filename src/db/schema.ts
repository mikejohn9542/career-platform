import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  location: text("location").notNull(),
  pronouns: text("pronouns"),
  ...timestamps,
});

export const experiences = sqliteTable("experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  location: text("location").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  current: integer("current", { mode: "boolean" }).notNull().default(false),
  summary: text("summary").notNull(),
  ...timestamps,
}, (table) => ({
  profileOrder: uniqueIndex("experiences_profile_order_idx").on(table.profileId, table.sortOrder),
}));

export const experienceHighlights = sqliteTable("experience_highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experienceId: integer("experience_id").notNull().references(() => experiences.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  value: text("value").notNull(),
}, (table) => ({
  experienceOrder: uniqueIndex("experience_highlights_order_idx").on(table.experienceId, table.sortOrder),
}));

export const education = sqliteTable("education", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  school: text("school").notNull(),
  degree: text("degree").notNull(),
  field: text("field").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  summary: text("summary"),
  ...timestamps,
}, (table) => ({
  profileOrder: uniqueIndex("education_profile_order_idx").on(table.profileId, table.sortOrder),
}));

export const skillGroups = sqliteTable("skill_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  name: text("name").notNull(),
}, (table) => ({
  profileOrder: uniqueIndex("skill_groups_profile_order_idx").on(table.profileId, table.sortOrder),
}));

export const skillItems = sqliteTable("skill_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  skillGroupId: integer("skill_group_id").notNull().references(() => skillGroups.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  value: text("value").notNull(),
}, (table) => ({
  groupOrder: uniqueIndex("skill_items_group_order_idx").on(table.skillGroupId, table.sortOrder),
}));

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  ...timestamps,
}, (table) => ({
  profileSlug: uniqueIndex("projects_profile_slug_idx").on(table.profileId, table.slug),
  profileOrder: uniqueIndex("projects_profile_order_idx").on(table.profileId, table.sortOrder),
}));

export const projectTechnologies = sqliteTable("project_technologies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  value: text("value").notNull(),
}, (table) => ({
  projectOrder: uniqueIndex("project_technologies_order_idx").on(table.projectId, table.sortOrder),
}));

export const projectHighlights = sqliteTable("project_highlights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  value: text("value").notNull(),
}, (table) => ({
  projectOrder: uniqueIndex("project_highlights_order_idx").on(table.projectId, table.sortOrder),
}));

export const projectLinks = sqliteTable("project_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
}, (table) => ({
  projectOrder: uniqueIndex("project_links_order_idx").on(table.projectId, table.sortOrder),
}));

export const projectMedia = sqliteTable("project_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  src: text("src").notNull(),
  alt: text("alt").notNull(),
});

export const resumeMetadata = sqliteTable("resume_metadata", {
  id: integer("id").primaryKey(),
  profileId: integer("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  publishedAt: text("published_at").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull(),
  pdfUrl: text("pdf_url").notNull(),
  summary: text("summary").notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey(),
  profileId: integer("profile_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  phone: text("phone"),
  linkedin: text("linkedin").notNull(),
  github: text("github").notNull(),
  website: text("website"),
  location: text("location").notNull(),
});

export const schema = {
  profiles,
  experiences,
  experienceHighlights,
  education,
  skillGroups,
  skillItems,
  projects,
  projectTechnologies,
  projectHighlights,
  projectLinks,
  projectMedia,
  resumeMetadata,
  contacts,
};
