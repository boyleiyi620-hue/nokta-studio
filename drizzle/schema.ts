import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const packageRegistries = mysqlTable("package_registries", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  description: text("description"),
  visibility: mysqlEnum("visibility", ["private", "organization"]).notNull(),
  ownerId: int("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("package_registries_owner_idx").on(table.ownerId)]);

export const packageRegistryMembers = mysqlTable("package_registry_members", {
  id: int("id").autoincrement().primaryKey(),
  registryId: int("registry_id").notNull(),
  userId: int("user_id").notNull(),
  accessLevel: mysqlEnum("access_level", ["owner", "publisher", "reader"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("package_registry_members_unique").on(table.registryId, table.userId),
  index("package_registry_members_user_idx").on(table.userId),
]);

export const packages = mysqlTable("packages", {
  id: int("id").autoincrement().primaryKey(),
  registryId: int("registry_id").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  readme: text("readme"),
  latestVersion: varchar("latest_version", { length: 32 }),
  createdBy: int("created_by").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("packages_registry_name_unique").on(table.registryId, table.name),
  index("packages_registry_idx").on(table.registryId),
]);

export const packageVersions = mysqlTable("package_versions", {
  id: int("id").autoincrement().primaryKey(),
  packageId: int("package_id").notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  entry: varchar("entry", { length: 160 }).notNull(),
  source: text("source").notNull(),
  exportsJson: json("exports_json").notNull(),
  dependenciesJson: json("dependencies_json").notNull(),
  releaseNotes: text("release_notes"),
  integrity: varchar("integrity", { length: 160 }).notNull(),
  publishedBy: int("published_by").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("package_versions_package_version_unique").on(table.packageId, table.version),
  index("package_versions_package_idx").on(table.packageId),
]);

export const packageInstalls = mysqlTable("package_installs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  registryId: int("registry_id").notNull(),
  packageId: int("package_id").notNull(),
  versionId: int("version_id").notNull(),
  requestedRange: varchar("requested_range", { length: 64 }).notNull(),
  lockedVersion: varchar("locked_version", { length: 32 }).notNull(),
  updateAvailable: boolean("update_available").default(false).notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("package_installs_user_package_unique").on(table.userId, table.packageId),
  index("package_installs_user_idx").on(table.userId),
]);

export const packageNotifications = mysqlTable("package_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  installId: int("install_id"),
  packageId: int("package_id").notNull(),
  kind: mysqlEnum("kind", ["update_available", "package_published"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("package_notifications_user_read_idx").on(table.userId, table.isRead),
]);

export const packageSecurityAdvisories = mysqlTable("package_security_advisories", {
  id: int("id").autoincrement().primaryKey(),
  packageId: int("package_id").notNull(),
  affectedRange: varchar("affected_range", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", ["low", "moderate", "high", "critical"]).notNull(),
  summary: varchar("summary", { length: 240 }).notNull(),
  remediation: text("remediation"),
  reportedBy: int("reported_by").notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: int("resolved_by"),
  resolutionVersion: varchar("resolution_version", { length: 32 }),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("package_security_advisories_package_idx").on(table.packageId),
  index("package_security_advisories_open_idx").on(table.resolvedAt),
]);

export const packageInstallEvents = mysqlTable("package_install_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  installId: int("install_id"),
  registryId: int("registry_id").notNull(),
  packageId: int("package_id").notNull(),
  action: mysqlEnum("action", ["install", "manual_update", "security_update", "download_intent"]).notNull(),
  sourceVersion: varchar("source_version", { length: 32 }),
  targetVersion: varchar("target_version", { length: 32 }),
  permissionJson: json("permission_json").notNull(),
  integrity: varchar("integrity", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("package_install_events_user_idx").on(table.userId),
  index("package_install_events_package_idx").on(table.packageId),
]);

export type PackageRegistry = typeof packageRegistries.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type PackageVersion = typeof packageVersions.$inferSelect;
