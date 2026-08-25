/**
 * Nokta Windows Yerel Yardımcı v0.2.
 * Yalnızca localhost HTTPS, izinli web kaynakları, tek kullanımlık eşleştirme
 * kodu ve süreli oturumlar üzerinden dar kapsamlı dosya planları yürütür.
 */
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

const port = Number(process.env.NOKTA_HELPER_PORT ?? 8417);
const home = process.env.NOKTA_HELPER_HOME ?? join(homedir(), "AppData", "Local", "NoktaHelper");
const configPath = join(home, "config.json");
const auditPath = join(home, "audit.jsonl");
const allowedExtensions = new Set([".csv", ".json", ".nokta", ".txt"]);
const maximumBytes = 5 * 1024 * 1024;
const completedKeys = new Map();
const sessions = new Map();
const testHttp = process.env.NOKTA_HELPER_ALLOW_HTTP_TESTS === "1";

const same = (left, right) => {
  const leftBuffer = Buffer.from(left ?? "");
  const rightBuffer = Buffer.from(right ?? "");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

async function loadConfig() {
  await mkdir(home, { recursive: true });
  if (!existsSync(configPath)) throw new Error("Yardımcı yapılandırması bulunamadı. Windows’ta önce scripts/setup-https.ps1 betiğini çalıştırın.");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (!config.workspace || !Array.isArray(config.allowedOrigins)) throw new Error("Yardımcı yapılandırması eksik. scripts/setup-https.ps1 betiğini yeniden çalıştırın.");
  return config;
}

function originOf(request) { return request.headers.origin?.replace(/\/$/, "") ?? ""; }
function originAllowed(config, request) { return config.allowedOrigins.includes(originOf(request)); }
function send(response, status, body, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
  if (origin) Object.assign(headers, { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, X-Nokta-Session, X-Nokta-Pairing-Code", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" });
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

async function requestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("İstek gövdesi 1 MB sınırını aşıyor.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("İstek geçerli JSON değil."); }
}

function permittedPath(config, input, actionType) {
  if (typeof input !== "string" || input.trim() === "") throw new Error("Dosya yolu zorunludur.");
  if (input.includes("\0")) throw new Error("Dosya yolunda geçersiz karakter var.");
  const root = resolve(config.workspace);
  const target = resolve(root, input);
  const relativeTarget = relative(root, target);
  if (relativeTarget.startsWith("..") || (relativeTarget === "" && target !== root)) throw new Error("Dosya yolu izinli çalışma klasörünün dışında.");
  const extension = extname(target).toLowerCase();
  if (!new Set(["file.list", "file.mkdir"]).has(actionType) && !allowedExtensions.has(extension)) throw new Error("Bu dosya türüne izin verilmiyor.");
  return target;
}

async function writeAudit(record) {
  await appendFile(auditPath, `${JSON.stringify({ time: new Date().toISOString(), ...record })}\n`, { encoding: "utf8", mode: 0o600 });
}

function requireSession(request, origin) {
  const token = request.headers["x-nokta-session"];
  const session = typeof token === "string" ? sessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now() || session.origin !== origin) throw new Error("Geçerli bir eşleştirilmiş yerel oturum yok.");
  return session;
}

async function executeAction(config, action) {
  if (!action || typeof action.type !== "string") throw new Error("Eylem türü zorunludur.");
  const target = permittedPath(config, action.path, action.type);
  switch (action.type) {
    case "file.list": {
      const entries = await readdir(target, { withFileTypes: true });
      return { type: action.type, path: action.path, entries: entries.filter((entry) => entry.isDirectory() || allowedExtensions.has(extname(entry.name).toLowerCase())).map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "directory" : "file" })) };
    }
    case "file.read": {
      const info = await stat(target);
      const cap = Math.min(Number(action.maxBytes ?? config.maximumBytes), config.maximumBytes);
      if (info.size > cap) throw new Error(`Dosya ${cap} bayt okuma sınırını aşıyor.`);
      return { type: action.type, path: action.path, content: await readFile(target, "utf8"), bytes: info.size };
    }
    case "file.write": {
      if (typeof action.content !== "string") throw new Error("Yazma eylemi metin içeriği gerektirir.");
      const bytes = Buffer.byteLength(action.content, "utf8");
      if (bytes > config.maximumBytes) throw new Error("Yazılacak içerik boyut sınırını aşıyor.");
      await mkdir(dirname(target), { recursive: true });
      const temporary = join(dirname(target), `.${basename(target)}.${randomBytes(6).toString("hex")}.tmp`);
      await writeFile(temporary, action.content, "utf8");
      await writeFile(target, await readFile(temporary));
      return { type: action.type, path: action.path, bytes };
    }
    case "file.mkdir": await mkdir(target, { recursive: true }); return { type: action.type, path: action.path };
    default: throw new Error(`Desteklenmeyen eylem: ${action.type}`);
  }
}

async function main() {
  const config = await loadConfig();
  const pairingCode = randomBytes(18).toString("base64url");
  const pairingExpiresAt = Date.now() + 5 * 60_000;
  const handler = async (request, response) => {
    const origin = originOf(request);
    try {
      if (!originAllowed(config, request)) return send(response, 403, { error: "Bu web kaynağının yerel yardımcı erişim izni yok." });
      if (request.method === "OPTIONS") return send(response, 204, {}, origin);
      const requestUrl = new URL(request.url ?? "/", `${testHttp ? "http" : "https"}://localhost:${port}`);
      if (request.method === "POST" && requestUrl.pathname === "/v1/pair") {
        if (Date.now() > pairingExpiresAt || !same(request.headers["x-nokta-pairing-code"], pairingCode)) throw new Error("Eşleştirme kodu geçersiz veya süresi dolmuş.");
        const sessionToken = randomBytes(32).toString("base64url");
        sessions.set(sessionToken, { origin, expiresAt: Date.now() + 10 * 60_000 });
        await writeAudit({ status: "paired", origin });
        return send(response, 200, { ok: true, sessionToken, expiresInSeconds: 600, workspaceName: basename(config.workspace) }, origin);
      }
      requireSession(request, origin);
      if (request.method === "GET" && requestUrl.pathname === "/v1/health") return send(response, 200, { ok: true, workspace: config.workspace, capabilities: ["file.list", "file.read", "file.write", "file.mkdir"], transport: testHttp ? "http-test" : "https" }, origin);
      if (request.method === "GET" && requestUrl.pathname === "/v1/audit/recent") {
        const records = existsSync(auditPath) ? (await readFile(auditPath, "utf8")).trim().split("\n").filter(Boolean).slice(-100).map((line) => JSON.parse(line)) : [];
        return send(response, 200, { records }, origin);
      }
      if (request.method !== "POST" || requestUrl.pathname !== "/v1/plans/execute") return send(response, 404, { error: "Uç nokta bulunamadı." }, origin);
      const plan = await requestBody(request);
      if (!plan?.taskId || !plan?.idempotencyKey || !Array.isArray(plan.actions)) throw new Error("Plan; taskId, idempotencyKey ve actions içermelidir.");
      if (!plan.expiresAt || Number.isNaN(Date.parse(plan.expiresAt)) || Date.parse(plan.expiresAt) < Date.now()) throw new Error("Planın süresi geçerli değil veya geçmişte.");
      if (completedKeys.has(plan.idempotencyKey)) return send(response, 200, { ok: true, reused: true, receipt: completedKeys.get(plan.idempotencyKey) }, origin);
      const results = [];
      for (const action of plan.actions) results.push(await executeAction(config, action));
      const receipt = { taskId: plan.taskId, idempotencyKey: plan.idempotencyKey, completedAt: new Date().toISOString(), results };
      completedKeys.set(plan.idempotencyKey, receipt);
      await writeAudit({ taskId: plan.taskId, key: plan.idempotencyKey, status: "completed", actions: plan.actions.map((action) => ({ type: action.type, path: action.path })) });
      return send(response, 200, { ok: true, receipt }, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen yardımcı hatası.";
      await writeAudit({ status: "rejected", origin, reason: message }).catch(() => undefined);
      return send(response, 400, { ok: false, error: message }, origin);
    }
  };
  const server = testHttp ? createHttpServer(handler) : createHttpsServer({ pfx: await readFile(config.https?.pfxPath ?? ""), passphrase: config.https?.passphrase }, handler);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Nokta Yardımcı hazır: ${testHttp ? "http" : "https"}://localhost:${port}`);
    console.log(`Çalışma klasörü: ${config.workspace}`);
    console.log(`İzinli kaynaklar: ${config.allowedOrigins.join(", ")}`);
    console.log(`Eşleştirme kodu (5 dakika geçerli): ${pairingCode}`);
  });
}

main().catch((error) => { console.error(error); process.exit(1); });
