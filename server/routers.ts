import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addRegistryMember,
  applyPackageUpdate,
  applySecurityUpdate,
  createPackageRegistry,
  createSecurityAdvisory,
  getPackageComparison,
  getPackageDetail,
  getDependencyGraph,
  getSecurityResolution,
  installPackage,
  listPackageInstallHistory,
  listPackageWorkspace,
  markPackageNotificationRead,
  publishPackageVersion,
  recordDownloadIntent,
} from "./packageRegistry";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  packageRegistry: router({
    workspace: protectedProcedure.query(({ ctx }) => listPackageWorkspace(ctx.user.id)),
    graph: protectedProcedure.query(({ ctx }) => getDependencyGraph(ctx.user.id)),
    createRegistry: protectedProcedure.input(z.object({ slug: z.string().min(2).max(80), displayName: z.string().min(2).max(120), description: z.string().max(1200), visibility: z.enum(["private", "organization"]) })).mutation(({ ctx, input }) => createPackageRegistry(ctx.user.id, input)),
    addMember: protectedProcedure.input(z.object({ registryId: z.number().int().positive(), openId: z.string().min(2).max(64), accessLevel: z.enum(["publisher", "reader"]) })).mutation(({ ctx, input }) => addRegistryMember(ctx.user.id, input)),
    publish: protectedProcedure.input(z.object({ registryId: z.number().int().positive(), name: z.string().min(2).max(120), description: z.string().max(1200), readme: z.string().max(30000), version: z.string().regex(/^\d+\.\d+\.\d+$/), releaseNotes: z.string().max(4000), entry: z.string().min(1).max(160), source: z.string().min(1).max(100000), exports: z.array(z.string().min(1).max(120)).min(1).max(50), dependencies: z.record(z.string().min(2).max(120), z.string().min(1).max(64)) })).mutation(({ ctx, input }) => publishPackageVersion(ctx.user.id, input)),
    install: protectedProcedure.input(z.object({ packageId: z.number().int().positive(), requestedRange: z.string().min(1).max(64) })).mutation(({ ctx, input }) => installPackage(ctx.user.id, input)),
    applyUpdate: protectedProcedure.input(z.object({ installId: z.number().int().positive() })).mutation(({ ctx, input }) => applyPackageUpdate(ctx.user.id, input.installId)),
    securityResolution: protectedProcedure.input(z.object({ installId: z.number().int().positive() })).query(({ ctx, input }) => getSecurityResolution(ctx.user.id, input.installId)),
    applySecurityUpdate: protectedProcedure.input(z.object({ installId: z.number().int().positive() })).mutation(({ ctx, input }) => applySecurityUpdate(ctx.user.id, input.installId)),
    installHistory: protectedProcedure.query(({ ctx }) => listPackageInstallHistory(ctx.user.id)),
    recordDownloadIntent: protectedProcedure.input(z.object({ packageId: z.number().int().positive() })).mutation(({ ctx, input }) => recordDownloadIntent(ctx.user.id, input.packageId)),
    markNotificationRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markPackageNotificationRead(ctx.user.id, input.notificationId)),
    detail: protectedProcedure.input(z.object({ packageId: z.number().int().positive() })).query(({ ctx, input }) => getPackageDetail(ctx.user.id, input.packageId)),
    compare: protectedProcedure.input(z.object({ packageId: z.number().int().positive(), fromVersionId: z.number().int().positive(), toVersionId: z.number().int().positive() })).query(({ ctx, input }) => getPackageComparison(ctx.user.id, input)),
    addSecurityAdvisory: protectedProcedure.input(z.object({ packageId: z.number().int().positive(), affectedRange: z.string().min(1).max(64), severity: z.enum(["low", "moderate", "high", "critical"]), summary: z.string().min(4).max(240), remediation: z.string().max(4000) })).mutation(({ ctx, input }) => createSecurityAdvisory(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
