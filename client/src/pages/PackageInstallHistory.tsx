import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, Download, FileClock, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import "./PackageOperations.css";
import "./PackageOperationStatus.css";

const actionLabel = { install: "Kurulum", manual_update: "Güncelleme", security_update: "Güvenlik güncellemesi", download_intent: "İndirme isteği" } as const;

function HistoryLoading() {
  return <main className="operation-status"><header><span className="status-wordmark">Nokta <b>Studio</b></span><span>İZİNLİ İŞLEM GÜNLÜĞÜ</span></header><section><div className="operation-status-mark"><FileClock size={24} /></div><p>İZLEK / 03 · DENETİM KAYDI</p><h1>İşlem defterini<br /><em>açıyoruz.</em></h1><div className="operation-status-trace"><i /><i /><i /><span>İZİN, BÜTÜNLÜK VE SÜRÜM KAYITLARI OKUNUYOR</span></div><small>Paket işlem günlüğü hazırlanıyor…</small></section></main>;
}

export default function PackageInstallHistory() {
  const { user, loading } = useAuth();
  const history = trpc.packageRegistry.installHistory.useQuery(undefined, { enabled: Boolean(user) });
  const [filter, setFilter] = useState("hepsi");
  const entries = useMemo(() => (history.data ?? []).filter((entry) => filter === "hepsi" || entry.action === filter), [history.data, filter]);
  if (loading || history.isLoading) return <HistoryLoading />;
  if (!user) return <main className="operation-auth"><FileClock size={30} /><h1>İşlem günlüğü için oturum açın.</h1><button onClick={() => startLogin()}><ShieldCheck size={14} /> Oturum aç</button></main>;
  return <main className="operation-shell"><header className="operation-topbar"><Link href="/paketler"><ChevronLeft size={15} /> Kayıt merkezi</Link><span>İZİNLİ PAKET İŞLEM GÜNLÜĞÜ</span></header><section className="operation-hero"><p className="eyebrow">DENETİM VE İZLENEBİLİRLİK</p><h1>Her paketi,<br /><em>her izni izle.</em></h1><p>Bu günlüğe kullanıcı etkileşimiyle kaydedilen kurulum, güvenlik güncellemesi, standart güncelleme ve indirme isteği işlemleri yazılır.</p></section><section className="history-filter"><span><FileClock size={14} /> {entries.length} işlem</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="hepsi">Tüm işlemler</option><option value="install">Kurulumlar</option><option value="manual_update">Güncellemeler</option><option value="security_update">Güvenlik güncellemeleri</option><option value="download_intent">İndirme istekleri</option></select></section><section className="history-list">{entries.length ? entries.map((entry) => <article key={entry.id} className={`history-entry ${entry.action}`}><div className="history-icon">{entry.action === "security_update" ? <ShieldAlert size={16} /> : entry.action === "download_intent" ? <Download size={16} /> : <RefreshCw size={16} />}</div><div><strong>{entry.packageName}</strong><small>{entry.registryName} · {new Date(entry.createdAt).toLocaleString("tr-TR")}</small><p>{actionLabel[entry.action]}: <code>{entry.sourceVersion ?? "—"}</code> → <code>{entry.targetVersion ?? "—"}</code></p></div><aside><span>{String(entry.permission.scope)}</span><small>{String(entry.permission.approvedBy)}</small><code>{entry.integrity?.slice(0, 22)}…</code></aside></article>) : <div className="operation-empty"><FileClock size={23} /><strong>Bu filtre için işlem yok.</strong><span>Bir paket kurduğunuzda, güncellediğinizde veya indirme isteği oluşturduğunuzda izin ayrıntısı burada görünür.</span></div>}</section></main>;
}
