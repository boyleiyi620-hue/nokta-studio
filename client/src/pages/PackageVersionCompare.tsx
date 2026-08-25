import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeftRight, ChevronLeft, Code2, GitCompareArrows, Network, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import "./PackageOperations.css";
import "./PackageOperationStatus.css";

function CompareLoading() {
  return <main className="operation-status"><header><span className="status-wordmark">Nokta <b>Studio</b></span><span>SÜRÜM FARKI FÖYÜ</span></header><section><div className="operation-status-mark"><GitCompareArrows size={24} /></div><p>İZLEK / 02 · SÜRÜM İNCELEMESİ</p><h1>Fark föyünü<br /><em>hazırlıyoruz.</em></h1><div className="operation-status-trace"><i /><i /><i /><span>KAYNAK VE BAĞIMLILIK SÜRÜMLERİ OKUNUYOR</span></div><small>Sürüm farkı föyü hazırlanıyor…</small></section></main>;
}

export default function PackageVersionCompare() {
  const [, params] = useRoute("/paketler/:packageId/karsilastir");
  const packageId = Number(params?.packageId ?? 0);
  const { user, loading } = useAuth();
  const detail = trpc.packageRegistry.detail.useQuery({ packageId }, { enabled: Boolean(user && packageId) });
  const [fromVersionId, setFromVersionId] = useState(0);
  const [toVersionId, setToVersionId] = useState(0);
  useEffect(() => {
    if (!detail.data?.versions.length || fromVersionId || toVersionId) return;
    setToVersionId(detail.data.versions[0].id);
    setFromVersionId(detail.data.versions.at(-1)?.id ?? detail.data.versions[0].id);
  }, [detail.data, fromVersionId, toVersionId]);
  const comparison = trpc.packageRegistry.compare.useQuery({ packageId, fromVersionId, toVersionId }, { enabled: Boolean(user && packageId && fromVersionId && toVersionId && fromVersionId !== toVersionId) });

  if (loading || detail.isLoading) return <CompareLoading />;
  if (!user) return <main className="operation-auth"><GitCompareArrows size={30} /><h1>Sürüm karşılaştırması için oturum açın.</h1><button onClick={() => startLogin()}><ShieldCheck size={14} /> Oturum aç</button></main>;
  if (!detail.data) return <main className="operation-loading">{detail.error?.message || "Paket bulunamadı."}</main>;
  const { versions, package: pkg } = detail.data;
  const diff = comparison.data;
  return <main className="operation-shell"><header className="operation-topbar"><Link href={`/paketler/${packageId}`}><ChevronLeft size={15} /> {pkg.name}</Link><span>SÜRÜM FARKI İNCELEME FÖYÜ</span></header><section className="operation-hero"><p className="eyebrow">KOD VE BAĞIMLILIK KARŞILAŞTIRMASI</p><h1>Sürümler arasındaki<br /><em>değişimi görün.</em></h1><p>Aynı paketin iki yayımlanmış sürümündeki kaynak satırlarını, dışa aktarımları ve bağımlılık bildirimlerini karşılaştırın.</p></section><section className="compare-selector"><label>Önceki sürüm<select value={fromVersionId} onChange={(event) => setFromVersionId(Number(event.target.value))}>{versions.map((version) => <option key={version.id} value={version.id}>v{version.version}</option>)}</select></label><ArrowLeftRight size={19} /><label>Yeni sürüm<select value={toVersionId} onChange={(event) => setToVersionId(Number(event.target.value))}>{versions.map((version) => <option key={version.id} value={version.id}>v{version.version}</option>)}</select></label></section>{fromVersionId === toVersionId && <p className="operation-note">Farkları görmek için iki ayrı sürüm seçin.</p>}{diff && <><section className="compare-summary"><article><span>ÖNCE</span><strong>v{diff.from.version}</strong><code>{diff.from.integrity.slice(0, 25)}…</code></article><article className="compare-arrow"><GitCompareArrows size={19} /></article><article><span>SONRA</span><strong>v{diff.to.version}</strong><code>{diff.to.integrity.slice(0, 25)}…</code></article></section><section className="compare-grid"><article className="operation-paper"><div className="operation-heading"><span><Code2 size={14} /> KAYNAK SATIRLARI</span><small>{diff.sourceDiff.filter((row) => row.kind !== "same").length} değişiklik</small></div><div className="source-diff">{diff.sourceDiff.map((row) => <div key={row.line} className={row.kind === "same" ? "same" : row.kind}><span>{row.line}</span><code>{row.before ?? ""}</code><code>{row.after ?? ""}</code></div>)}</div></article><aside className="compare-side"><article className="operation-paper"><div className="operation-heading"><span><Network size={14} /> BAĞIMLILIKLAR</span><small>ARALIK FARKI</small></div><div className="delta-list">{diff.dependencyDiff.map((row) => <div key={row.name} className={row.kind}><strong>{row.name}</strong><span>{row.before ?? "—"}</span><i>→</i><span>{row.after ?? "—"}</span></div>) || <p>Bağımlılık bildirimi yok.</p>}</div></article><article className="operation-paper"><div className="operation-heading"><span><Code2 size={14} /> DIŞA AKTARIMLAR</span><small>API YÜZEYİ</small></div><div className="export-delta">{diff.exportDiff.map((row) => <span key={row.name} className={row.kind}>{row.kind === "added" ? "+" : row.kind === "removed" ? "−" : "="} {row.name}</span>)}</div></article></aside></section></>}</main>;
}
