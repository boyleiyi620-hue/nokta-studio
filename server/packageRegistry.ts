import { and, desc, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  packageInstallEvents,
  packageInstalls,
  packageNotifications,
  packageRegistries,
  packageRegistryMembers,
  packageSecurityAdvisories,
  packageVersions,
  packages,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export type RegistryAccess = "owner" | "publisher" | "reader";

export type PublishPackageInput = {
  registryId: number;
  name: string;
  description: string;
  version: string;
  entry: string;
  source: string;
  exports: string[];
  dependencies: Record<string, string>;
  readme: string;
  releaseNotes: string;
};

const semverPattern = /^\d+\.\d+\.\d+$/;
const packageNamePattern = /^[a-z][a-z0-9-]{1,118}$/;

export function compareSemver(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function satisfiesSemver(version: string, range: string) {
  if (range === "*" || range === "") return true;
  const normalized = range.replace(/^[~^]/, "");
  const [major = 0, minor = 0, patch = 0] = normalized.split(".").map(Number);
  const [actualMajor = 0, actualMinor = 0, actualPatch = 0] = version.split(".").map(Number);
  if (range.startsWith("^")) return actualMajor === major && (actualMinor > minor || (actualMinor === minor && actualPatch >= patch));
  if (range.startsWith("~")) return actualMajor === major && actualMinor === minor && actualPatch >= patch;
  return actualMajor === major && actualMinor === minor && actualPatch === patch;
}

export function packageIntegrity(input: Pick<PublishPackageInput, "name" | "version" | "entry" | "source" | "exports" | "dependencies">) {
  const canonical = JSON.stringify({
    name: input.name,
    version: input.version,
    entry: input.entry,
    source: input.source,
    exports: [...input.exports].sort(),
    dependencies: Object.entries(input.dependencies).sort(([left], [right]) => left.localeCompare(right, "tr")),
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function highestSeverity(advisories: { severity: "low" | "moderate" | "high" | "critical" }[]) {
  const score = { low: 1, moderate: 2, high: 3, critical: 4 } as const;
  return advisories.reduce<"low" | "moderate" | "high" | "critical" | null>((current, advisory) => !current || score[advisory.severity] > score[current] ? advisory.severity : current, null);
}

function buildPermissionRecord(action: "install" | "manual_update" | "security_update" | "download_intent", registryId: number, packageId: number, version: string, integrity: string) {
  return { scope: "paket.kurulum", action, registryId, packageId, targetVersion: version, integrity, approvedBy: "kullanıcı_etkileşimi" };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Paket kaydı şu anda kullanılamıyor.");
  return db;
}

async function safeVersionFor(packageId: number, requestedRange: string) {
  const db = await requireDb();
  const [versions, advisories] = await Promise.all([
    db.select().from(packageVersions).where(eq(packageVersions.packageId, packageId)),
    db.select().from(packageSecurityAdvisories).where(eq(packageSecurityAdvisories.packageId, packageId)),
  ]);
  return [...versions].sort((left, right) => compareSemver(right.version, left.version)).find((version) =>
    satisfiesSemver(version.version, requestedRange) && !advisories.some((advisory) => !advisory.resolvedAt && satisfiesSemver(version.version, advisory.affectedRange)),
  ) ?? null;
}

async function writeInstallEvent(input: { userId: number; installId: number | null; registryId: number; packageId: number; action: "install" | "manual_update" | "security_update" | "download_intent"; sourceVersion: string | null; targetVersion: string; integrity: string }) {
  const db = await requireDb();
  await db.insert(packageInstallEvents).values({
    userId: input.userId,
    installId: input.installId,
    registryId: input.registryId,
    packageId: input.packageId,
    action: input.action,
    sourceVersion: input.sourceVersion,
    targetVersion: input.targetVersion,
    permissionJson: buildPermissionRecord(input.action, input.registryId, input.packageId, input.targetVersion, input.integrity),
    integrity: input.integrity,
  });
}

async function accessFor(userId: number, registryId: number): Promise<RegistryAccess | null> {
  const db = await requireDb();
  const registry = await db.select().from(packageRegistries).where(eq(packageRegistries.id, registryId)).limit(1);
  if (!registry[0]) return null;
  if (registry[0].ownerId === userId) return "owner";
  const member = await db.select().from(packageRegistryMembers).where(and(eq(packageRegistryMembers.registryId, registryId), eq(packageRegistryMembers.userId, userId))).limit(1);
  return member[0]?.accessLevel ?? null;
}

async function requireAccess(userId: number, registryId: number, allowed: RegistryAccess[]) {
  const access = await accessFor(userId, registryId);
  if (!access || !allowed.includes(access)) throw new Error("Bu kayıt için gerekli erişim yetkiniz yok.");
  return access;
}

export async function listPackageWorkspace(userId: number) {
  const db = await requireDb();
  const [owned, memberships, installs, notifications] = await Promise.all([
    db.select().from(packageRegistries).where(eq(packageRegistries.ownerId, userId)),
    db.select().from(packageRegistryMembers).where(eq(packageRegistryMembers.userId, userId)),
    db.select().from(packageInstalls).where(eq(packageInstalls.userId, userId)),
    db.select().from(packageNotifications).where(eq(packageNotifications.userId, userId)).orderBy(desc(packageNotifications.createdAt)).limit(24),
  ]);
  const accessByRegistry = new Map<number, RegistryAccess>();
  owned.forEach((registry) => accessByRegistry.set(registry.id, "owner"));
  memberships.forEach((member) => accessByRegistry.set(member.registryId, member.accessLevel));
  const registryIds = Array.from(accessByRegistry.keys());
  const registries = registryIds.length ? await db.select().from(packageRegistries).where(inArray(packageRegistries.id, registryIds)) : [];
  const packageRows = registryIds.length ? await db.select().from(packages).where(inArray(packages.registryId, registryIds)) : [];
  const [versionRows, advisoryRows] = packageRows.length ? await Promise.all([
    db.select().from(packageVersions).where(inArray(packageVersions.packageId, packageRows.map((item) => item.id))),
    db.select().from(packageSecurityAdvisories).where(inArray(packageSecurityAdvisories.packageId, packageRows.map((item) => item.id))),
  ]) : [[], []] as const;
  const latestVersionByPackage = new Map<number, typeof versionRows[number]>();
  versionRows.forEach((version) => {
    const owner = packageRows.find((item) => item.id === version.packageId);
    if (owner?.latestVersion === version.version) latestVersionByPackage.set(version.packageId, version);
  });
  const installByPackage = new Map(installs.map((install) => [install.packageId, install]));

  return {
    registries: registries.map((registry) => ({ ...registry, access: accessByRegistry.get(registry.id) ?? "reader" })),
    packages: packageRows.filter((item) => !item.isArchived).map((item) => {
      const latest = latestVersionByPackage.get(item.id);
      const installed = installByPackage.get(item.id);
      const activeAdvisories = advisoryRows.filter((advisory) => advisory.packageId === item.id && !advisory.resolvedAt && latest && satisfiesSemver(latest.version, advisory.affectedRange));
      return {
        ...item,
        latest: latest ? {
          id: latest.id,
          version: latest.version,
          integrity: latest.integrity,
          exports: latest.exportsJson as string[],
          dependencies: latest.dependenciesJson as Record<string, string>,
          publishedAt: latest.publishedAt,
          releaseNotes: latest.releaseNotes,
        } : null,
        health: {
          severity: highestSeverity(activeAdvisories),
          advisoryCount: activeAdvisories.length,
        },
        installed: installed ? {
          id: installed.id,
          lockedVersion: installed.lockedVersion,
          requestedRange: installed.requestedRange,
          updateAvailable: installed.updateAvailable,
          notificationsEnabled: installed.notificationsEnabled,
        } : null,
      };
    }),
    notifications,
    unreadNotifications: notifications.filter((notification) => !notification.isRead).length,
  };
}

export async function createPackageRegistry(userId: number, input: { slug: string; displayName: string; description: string; visibility: "private" | "organization" }) {
  const db = await requireDb();
  const slug = input.slug.trim().toLocaleLowerCase("tr");
  if (!/^[a-z][a-z0-9-]{1,78}$/.test(slug)) throw new Error("Kayıt kimliği küçük harf, sayı ve tire içermeli; bir harfle başlamalıdır.");
  await db.insert(packageRegistries).values({ slug, displayName: input.displayName.trim(), description: input.description.trim() || null, visibility: input.visibility, ownerId: userId });
  const registry = await db.select().from(packageRegistries).where(eq(packageRegistries.slug, slug)).limit(1);
  if (!registry[0]) throw new Error("Kayıt oluşturulamadı.");
  await db.insert(packageRegistryMembers).values({ registryId: registry[0].id, userId, accessLevel: "owner" });
  return registry[0];
}

export async function addRegistryMember(ownerId: number, input: { registryId: number; openId: string; accessLevel: "publisher" | "reader" }) {
  const db = await requireDb();
  await requireAccess(ownerId, input.registryId, ["owner"]);
  const memberUser = await db.select().from(users).where(eq(users.openId, input.openId.trim())).limit(1);
  if (!memberUser[0]) throw new Error("Bu kullanıcı henüz Nokta Studio’ya giriş yapmamış.");
  await db.insert(packageRegistryMembers).values({ registryId: input.registryId, userId: memberUser[0].id, accessLevel: input.accessLevel }).onDuplicateKeyUpdate({ set: { accessLevel: input.accessLevel } });
  return { userId: memberUser[0].id, accessLevel: input.accessLevel };
}

export async function publishPackageVersion(userId: number, input: PublishPackageInput) {
  const db = await requireDb();
  await requireAccess(userId, input.registryId, ["owner", "publisher"]);
  if (!packageNamePattern.test(input.name)) throw new Error("Paket adı küçük harf, sayı ve tire kullanmalı; en az iki karakter olmalıdır.");
  if (!semverPattern.test(input.version)) throw new Error("Sürüm MAJOR.MINOR.PATCH biçiminde olmalıdır.");
  const existing = await db.select().from(packages).where(and(eq(packages.registryId, input.registryId), eq(packages.name, input.name))).limit(1);
  let packageRow = existing[0];
  if (!packageRow) {
    await db.insert(packages).values({ registryId: input.registryId, name: input.name, description: input.description.trim() || null, readme: input.readme.trim() || null, createdBy: userId });
    const created = await db.select().from(packages).where(and(eq(packages.registryId, input.registryId), eq(packages.name, input.name))).limit(1);
    packageRow = created[0];
  }
  if (!packageRow) throw new Error("Paket oluşturulamadı.");
  if (packageRow.latestVersion && compareSemver(input.version, packageRow.latestVersion) <= 0) throw new Error(`Yeni sürüm ${packageRow.latestVersion} sürümünden büyük olmalıdır.`);
  const integrity = packageIntegrity(input);
  await db.insert(packageVersions).values({ packageId: packageRow.id, version: input.version, entry: input.entry, source: input.source, exportsJson: input.exports, dependenciesJson: input.dependencies, releaseNotes: input.releaseNotes.trim() || null, integrity, publishedBy: userId });
  const version = await db.select().from(packageVersions).where(and(eq(packageVersions.packageId, packageRow.id), eq(packageVersions.version, input.version))).limit(1);
  if (!version[0]) throw new Error("Paket sürümü yayımlanamadı.");
  await db.update(packages).set({ description: input.description.trim() || null, readme: input.readme.trim() || packageRow.readme, latestVersion: input.version }).where(eq(packages.id, packageRow.id));

  const installs = await db.select().from(packageInstalls).where(eq(packageInstalls.packageId, packageRow.id));
  for (const install of installs) {
    if (!install.notificationsEnabled || !satisfiesSemver(input.version, install.requestedRange) || compareSemver(input.version, install.lockedVersion) <= 0) continue;
    await db.update(packageInstalls).set({ updateAvailable: true }).where(eq(packageInstalls.id, install.id));
    await db.insert(packageNotifications).values({ userId: install.userId, installId: install.id, packageId: packageRow.id, kind: "update_available", title: `${packageRow.name} için güncelleme hazır`, body: `${install.lockedVersion} sürümünden ${input.version} sürümüne geçebilirsiniz.` });
  }
  return { packageId: packageRow.id, versionId: version[0].id, integrity };
}

export async function installPackage(userId: number, input: { packageId: number; requestedRange: string }) {
  const db = await requireDb();
  const packageRow = await db.select().from(packages).where(eq(packages.id, input.packageId)).limit(1);
  if (!packageRow[0] || packageRow[0].isArchived || !packageRow[0].latestVersion) throw new Error("Paket kuruluma uygun değil.");
  await requireAccess(userId, packageRow[0].registryId, ["owner", "publisher", "reader"]);
  if (!satisfiesSemver(packageRow[0].latestVersion, input.requestedRange)) throw new Error("İstenen sürüm aralığı, kayıtlı en güncel sürümle uyuşmuyor.");
  const version = await db.select().from(packageVersions).where(and(eq(packageVersions.packageId, packageRow[0].id), eq(packageVersions.version, packageRow[0].latestVersion))).limit(1);
  if (!version[0]) throw new Error("Paket sürümü bulunamadı.");
  const previousInstall = await db.select().from(packageInstalls).where(and(eq(packageInstalls.userId, userId), eq(packageInstalls.packageId, packageRow[0].id))).limit(1);
  await db.insert(packageInstalls).values({ userId, registryId: packageRow[0].registryId, packageId: packageRow[0].id, versionId: version[0].id, requestedRange: input.requestedRange, lockedVersion: version[0].version }).onDuplicateKeyUpdate({ set: { versionId: version[0].id, requestedRange: input.requestedRange, lockedVersion: version[0].version, updateAvailable: false } });
  const currentInstall = await db.select().from(packageInstalls).where(and(eq(packageInstalls.userId, userId), eq(packageInstalls.packageId, packageRow[0].id))).limit(1);
  if (!currentInstall[0]) throw new Error("Kurulum kaydı oluşturulamadı.");
  await writeInstallEvent({ userId, installId: currentInstall[0].id, registryId: packageRow[0].registryId, packageId: packageRow[0].id, action: previousInstall[0] ? "manual_update" : "install", sourceVersion: previousInstall[0]?.lockedVersion ?? null, targetVersion: version[0].version, integrity: version[0].integrity });
  return { version: version[0].version, integrity: version[0].integrity };
}

export async function applyPackageUpdate(userId: number, installId: number) {
  const db = await requireDb();
  const install = await db.select().from(packageInstalls).where(and(eq(packageInstalls.id, installId), eq(packageInstalls.userId, userId))).limit(1);
  if (!install[0]) throw new Error("Paket kurulumu bulunamadı.");
  const packageRow = await db.select().from(packages).where(eq(packages.id, install[0].packageId)).limit(1);
  if (!packageRow[0]) throw new Error("Paket bulunamadı.");
  const version = await safeVersionFor(packageRow[0].id, install[0].requestedRange);
  if (!version || compareSemver(version.version, install[0].lockedVersion) <= 0) throw new Error("Bu kurulum için güvenli ve uyumlu bir güncelleme yok.");
  await db.update(packageInstalls).set({ versionId: version.id, lockedVersion: version.version, updateAvailable: false }).where(eq(packageInstalls.id, install[0].id));
  await writeInstallEvent({ userId, installId: install[0].id, registryId: packageRow[0].registryId, packageId: packageRow[0].id, action: "manual_update", sourceVersion: install[0].lockedVersion, targetVersion: version.version, integrity: version.integrity });
  return { version: version.version, integrity: version.integrity };
}

export async function getSecurityResolution(userId: number, installId: number) {
  const db = await requireDb();
  const install = await db.select().from(packageInstalls).where(and(eq(packageInstalls.id, installId), eq(packageInstalls.userId, userId))).limit(1);
  if (!install[0]) throw new Error("Paket kurulumu bulunamadı.");
  const [packageRow, currentVersion, advisories] = await Promise.all([
    db.select().from(packages).where(eq(packages.id, install[0].packageId)).limit(1),
    db.select().from(packageVersions).where(eq(packageVersions.id, install[0].versionId)).limit(1),
    db.select().from(packageSecurityAdvisories).where(eq(packageSecurityAdvisories.packageId, install[0].packageId)),
  ]);
  if (!packageRow[0] || !currentVersion[0]) throw new Error("Paket çözüm bilgisi bulunamadı.");
  const affected = advisories.filter((advisory) => !advisory.resolvedAt && satisfiesSemver(currentVersion[0].version, advisory.affectedRange));
  const safeVersion = await safeVersionFor(packageRow[0].id, install[0].requestedRange);
  return {
    affected: affected.map((advisory) => ({ id: advisory.id, severity: advisory.severity, summary: advisory.summary, remediation: advisory.remediation, affectedRange: advisory.affectedRange })),
    currentVersion: currentVersion[0].version,
    recommendation: safeVersion && compareSemver(safeVersion.version, currentVersion[0].version) > 0 ? { version: safeVersion.version, integrity: safeVersion.integrity, entry: safeVersion.entry } : null,
  };
}

export async function applySecurityUpdate(userId: number, installId: number) {
  const db = await requireDb();
  const install = await db.select().from(packageInstalls).where(and(eq(packageInstalls.id, installId), eq(packageInstalls.userId, userId))).limit(1);
  if (!install[0]) throw new Error("Paket kurulumu bulunamadı.");
  const packageRow = await db.select().from(packages).where(eq(packages.id, install[0].packageId)).limit(1);
  if (!packageRow[0]) throw new Error("Paket bulunamadı.");
  const solution = await getSecurityResolution(userId, installId);
  if (!solution.affected.length) throw new Error("Bu kurulum için açık güvenlik uyarısı yok.");
  const version = await safeVersionFor(packageRow[0].id, install[0].requestedRange);
  if (!version || !solution.recommendation || version.version !== solution.recommendation.version) throw new Error("Bu uyarı için uyumlu, güvenli bir sürüm önerisi bulunamadı.");
  await db.update(packageInstalls).set({ versionId: version.id, lockedVersion: version.version, updateAvailable: false }).where(eq(packageInstalls.id, install[0].id));
  await writeInstallEvent({ userId, installId: install[0].id, registryId: packageRow[0].registryId, packageId: packageRow[0].id, action: "security_update", sourceVersion: install[0].lockedVersion, targetVersion: version.version, integrity: version.integrity });
  return { version: version.version, integrity: version.integrity, resolvedAdvisoryCount: solution.affected.length };
}

export async function markPackageNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(packageNotifications).set({ isRead: true }).where(and(eq(packageNotifications.id, notificationId), eq(packageNotifications.userId, userId)));
  return { success: true };
}

export async function getPackageDetail(userId: number, packageId: number) {
  const db = await requireDb();
  const packageRow = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
  if (!packageRow[0] || packageRow[0].isArchived) throw new Error("Paket bulunamadı.");
  await requireAccess(userId, packageRow[0].registryId, ["owner", "publisher", "reader"]);
  const [registry, versions, installs, advisories, currentInstall] = await Promise.all([
    db.select().from(packageRegistries).where(eq(packageRegistries.id, packageRow[0].registryId)).limit(1),
    db.select().from(packageVersions).where(eq(packageVersions.packageId, packageId)),
    db.select().from(packageInstalls).where(eq(packageInstalls.packageId, packageId)),
    db.select().from(packageSecurityAdvisories).where(eq(packageSecurityAdvisories.packageId, packageId)),
    db.select().from(packageInstalls).where(and(eq(packageInstalls.packageId, packageId), eq(packageInstalls.userId, userId))).limit(1),
  ]);
  const sortedVersions = [...versions].sort((left, right) => compareSemver(right.version, left.version));
  const activeAdvisories = advisories.filter((advisory) => !advisory.resolvedAt);
  return {
    package: packageRow[0],
    registry: registry[0] ? { id: registry[0].id, slug: registry[0].slug, displayName: registry[0].displayName, visibility: registry[0].visibility } : null,
    versions: sortedVersions.map((version) => ({ id: version.id, version: version.version, entry: version.entry, exports: version.exportsJson as string[], dependencies: version.dependenciesJson as Record<string, string>, integrity: version.integrity, releaseNotes: version.releaseNotes, publishedAt: version.publishedAt })),
    advisories: activeAdvisories.map((advisory) => ({ id: advisory.id, severity: advisory.severity, affectedRange: advisory.affectedRange, summary: advisory.summary, remediation: advisory.remediation, createdAt: advisory.createdAt })),
    usage: { installations: installs.length, updatesPending: installs.filter((install) => install.updateAvailable).length, latestVersion: packageRow[0].latestVersion },
    currentInstall: currentInstall[0] ? { id: currentInstall[0].id, lockedVersion: currentInstall[0].lockedVersion, updateAvailable: currentInstall[0].updateAvailable } : null,
  };
}

export async function getPackageComparison(userId: number, input: { packageId: number; fromVersionId: number; toVersionId: number }) {
  const db = await requireDb();
  const packageRow = await db.select().from(packages).where(eq(packages.id, input.packageId)).limit(1);
  if (!packageRow[0]) throw new Error("Paket bulunamadı.");
  await requireAccess(userId, packageRow[0].registryId, ["owner", "publisher", "reader"]);
  const versions = await db.select().from(packageVersions).where(and(eq(packageVersions.packageId, input.packageId), inArray(packageVersions.id, [input.fromVersionId, input.toVersionId])));
  const from = versions.find((version) => version.id === input.fromVersionId);
  const to = versions.find((version) => version.id === input.toVersionId);
  if (!from || !to) throw new Error("Karşılaştırılacak sürümler bu pakete ait değil.");
  const fromLines = from.source.split("\n");
  const toLines = to.source.split("\n");
  const maxLines = Math.max(fromLines.length, toLines.length);
  const sourceDiff = Array.from({ length: maxLines }, (_, index) => {
    const before = fromLines[index] ?? null;
    const after = toLines[index] ?? null;
    return { line: index + 1, before, after, kind: before === after ? "same" : before === null ? "added" : after === null ? "removed" : "changed" } as const;
  });
  const fromDependencies = from.dependenciesJson as Record<string, string>;
  const toDependencies = to.dependenciesJson as Record<string, string>;
  const dependencyDiff = Array.from(new Set([...Object.keys(fromDependencies), ...Object.keys(toDependencies)])).sort((left, right) => left.localeCompare(right, "tr")).map((name) => ({ name, before: fromDependencies[name] ?? null, after: toDependencies[name] ?? null, kind: !fromDependencies[name] ? "added" : !toDependencies[name] ? "removed" : fromDependencies[name] === toDependencies[name] ? "same" : "changed" }));
  const fromExports = new Set(from.exportsJson as string[]);
  const toExports = new Set(to.exportsJson as string[]);
  const exportDiff = Array.from(new Set([...Array.from(fromExports), ...Array.from(toExports)])).sort((left, right) => left.localeCompare(right, "tr")).map((name) => ({ name, before: fromExports.has(name), after: toExports.has(name), kind: !fromExports.has(name) ? "added" : !toExports.has(name) ? "removed" : "same" }));
  return {
    from: { id: from.id, version: from.version, integrity: from.integrity, releaseNotes: from.releaseNotes, publishedAt: from.publishedAt },
    to: { id: to.id, version: to.version, integrity: to.integrity, releaseNotes: to.releaseNotes, publishedAt: to.publishedAt },
    sourceDiff,
    dependencyDiff,
    exportDiff,
  };
}

export async function listPackageInstallHistory(userId: number) {
  const db = await requireDb();
  const events = await db.select().from(packageInstallEvents).where(eq(packageInstallEvents.userId, userId)).orderBy(desc(packageInstallEvents.createdAt)).limit(100);
  const packageRows = events.length ? await db.select().from(packages).where(inArray(packages.id, events.map((event) => event.packageId))) : [];
  const registryRows = events.length ? await db.select().from(packageRegistries).where(inArray(packageRegistries.id, events.map((event) => event.registryId))) : [];
  const packageById = new Map(packageRows.map((item) => [item.id, item]));
  const registryById = new Map(registryRows.map((item) => [item.id, item]));
  return events.map((event) => ({ ...event, packageName: packageById.get(event.packageId)?.name ?? "bilinmeyen-paket", registryName: registryById.get(event.registryId)?.displayName ?? "bilinmeyen-kayıt", permission: event.permissionJson as Record<string, unknown> }));
}

export async function recordDownloadIntent(userId: number, packageId: number) {
  const db = await requireDb();
  const packageRow = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
  if (!packageRow[0] || !packageRow[0].latestVersion) throw new Error("Paket indirmeye uygun değil.");
  await requireAccess(userId, packageRow[0].registryId, ["owner", "publisher", "reader"]);
  const version = await db.select().from(packageVersions).where(and(eq(packageVersions.packageId, packageId), eq(packageVersions.version, packageRow[0].latestVersion))).limit(1);
  if (!version[0]) throw new Error("Paket sürümü bulunamadı.");
  await writeInstallEvent({ userId, installId: null, registryId: packageRow[0].registryId, packageId, action: "download_intent", sourceVersion: null, targetVersion: version[0].version, integrity: version[0].integrity });
  return { version: version[0].version, integrity: version[0].integrity };
}

export async function createSecurityAdvisory(userId: number, input: { packageId: number; affectedRange: string; severity: "low" | "moderate" | "high" | "critical"; summary: string; remediation: string }) {
  const db = await requireDb();
  const packageRow = await db.select().from(packages).where(eq(packages.id, input.packageId)).limit(1);
  if (!packageRow[0]) throw new Error("Paket bulunamadı.");
  await requireAccess(userId, packageRow[0].registryId, ["owner", "publisher"]);
  if (!/^([~^])?\d+(\.\d+){0,2}$/.test(input.affectedRange) && input.affectedRange !== "*") throw new Error("Etkilenen sürüm aralığı SemVer biçiminde olmalıdır.");
  await db.insert(packageSecurityAdvisories).values({ packageId: input.packageId, affectedRange: input.affectedRange, severity: input.severity, summary: input.summary.trim(), remediation: input.remediation.trim() || null, reportedBy: userId });
  return { success: true };
}

export async function getDependencyGraph(userId: number) {
  const db = await requireDb();
  const installs = await db.select().from(packageInstalls).where(eq(packageInstalls.userId, userId));
  if (!installs.length) return { nodes: [], edges: [] };
  const packageRows = await db.select().from(packages).where(inArray(packages.id, installs.map((install) => install.packageId)));
  const [versionRows, advisoryRows] = await Promise.all([
    db.select().from(packageVersions).where(inArray(packageVersions.id, installs.map((install) => install.versionId))),
    db.select().from(packageSecurityAdvisories).where(inArray(packageSecurityAdvisories.packageId, installs.map((install) => install.packageId))),
  ]);
  const packageById = new Map(packageRows.map((item) => [item.id, item]));
  const versionById = new Map(versionRows.map((item) => [item.id, item]));
  const nodeByRegistryName = new Map(packageRows.map((item) => [`${item.registryId}:${item.name}`, item.id]));
  const nodes = installs.flatMap((install) => {
    const packageRow = packageById.get(install.packageId);
    const version = versionById.get(install.versionId);
    const exposed = version ? advisoryRows.filter((advisory) => advisory.packageId === install.packageId && !advisory.resolvedAt && satisfiesSemver(version.version, advisory.affectedRange)) : [];
    return packageRow && version ? [{ id: String(packageRow.id), label: packageRow.name, version: version.version, registryId: packageRow.registryId, updateAvailable: install.updateAvailable, securitySeverity: highestSeverity(exposed), advisoryCount: exposed.length }] : [];
  });
  const edges = installs.flatMap((install) => {
    const packageRow = packageById.get(install.packageId);
    const version = versionById.get(install.versionId);
    if (!packageRow || !version) return [];
    const dependencies = version.dependenciesJson as Record<string, string>;
    return Object.entries(dependencies).map(([name, requestedRange]) => ({ source: String(packageRow.id), target: nodeByRegistryName.get(`${packageRow.registryId}:${name}`) ? String(nodeByRegistryName.get(`${packageRow.registryId}:${name}`)) : null, label: `${name}@${requestedRange}`, missing: !nodeByRegistryName.get(`${packageRow.registryId}:${name}`) }));
  });
  return { nodes, edges };
}
