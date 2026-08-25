import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Bell, Check, ChevronLeft, Code2, GitBranch, PackageCheck, PackageOpen, Plus, RefreshCw, Search, Send, ShieldAlert, ShieldCheck, SlidersHorizontal, TriangleAlert, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";
import "./PackageRegistry.css";

type Tab = "kayitlar" | "yayinla" | "bagimliliklar";

function dependenciesFromText(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).reduce<Record<string, string>>((result, line) => {
    const [name, range] = line.split("@");
    if (name && range) result[name.trim()] = range.trim();
    return result;
  }, {});
}

function DependencyGraph({ graph }: { graph: { nodes: { id: string; label: string; version: string; updateAvailable: boolean; securitySeverity?: "low" | "moderate" | "high" | "critical" | null; advisoryCount?: number }[]; edges: { source: string; target: string | null; label: string; missing: boolean }[] } }) {
  const positions = useMemo(() => graph.nodes.map((node, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return { ...node, x: 112 + column * 170, y: 84 + row * 120 };
  }), [graph.nodes]);
  const positionById = new Map(positions.map((node) => [node.id, node]));

  if (!positions.length) return <div className="registry-empty graph-empty"><GitBranch size={25} /><strong>Henüz kurulmuş paket yok.</strong><span>Bir kayıt paketini kurduğunuzda bağımlılık grafiği yalnızca gerçek kilitli sürümlerle oluşur.</span></div>;
  return <div className="dependency-graph">
    <svg viewBox={`0 0 620 ${Math.max(250, 140 + Math.ceil(positions.length / 3) * 120)}`} role="img" aria-label="Kurulu paket bağımlılık grafiği">
      <defs><marker id="paket-ok" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#799084" /></marker></defs>
      {graph.edges.filter((edge) => edge.target).map((edge) => {
        const source = positionById.get(edge.source);
        const target = edge.target ? positionById.get(edge.target) : undefined;
        if (!source || !target) return null;
        return <g key={`${edge.source}-${edge.target}-${edge.label}`}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="dependency-edge" markerEnd="url(#paket-ok)" /><text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8} className="dependency-edge-label">{edge.label}</text></g>;
      })}
      {positions.map((node) => <g key={node.id} transform={`translate(${node.x}, ${node.y})`}><rect x="-62" y="-30" width="124" height="60" className={`dependency-node ${node.updateAvailable ? "update" : ""} ${node.securitySeverity ? `security-${node.securitySeverity}` : ""}`} /><circle cx="-49" cy="-16" r="4" className="dependency-node-dot" /><text x="-39" y="-12" className="dependency-node-name">{node.label}</text><text x="-39" y="8" className="dependency-node-version">v{node.version}</text>{node.updateAvailable && <g className="graph-badge update"><circle cx="50" cy="-20" r="10" /><text x="50" y="-17">↑</text></g>}{node.securitySeverity && <g className={`graph-badge security ${node.securitySeverity}`}><circle cx="50" cy="16" r="10" /><text x="50" y="19">!</text></g>}</g>)}
    </svg>
    {graph.edges.some((edge) => edge.missing) && <p className="graph-warning">Kesik uçlar, henüz bu çalışma alanına kurulmamış bağımlılıkları gösterir: {graph.edges.filter((edge) => edge.missing).map((edge) => edge.label).join(", ")}.</p>}
  </div>;
}

function RegistryLoading() {
  return <main className="registry-status-shell"><header><span className="status-wordmark">Nokta <b>Studio</b></span><span>PAKET KAYIT MERKEZİ</span></header><section><div className="status-symbol"><PackageOpen size={24} /></div><p>ÇALIŞMA SAYFASI / HAZIRLIK</p><h1>Kayıt defterini<br /><em>hazırlıyoruz.</em></h1><div className="status-trace"><i /><i /><i /><span>OTURUM VE KAYIT İZİ OKUNUYOR</span></div><small>Paket çalışma alanı hazırlanıyor…</small></section></main>;
}

export default function PackageRegistry() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("kayitlar");
  const [registryDraft, setRegistryDraft] = useState({ slug: "", displayName: "", description: "", visibility: "private" as "private" | "organization" });
  const [memberDraft, setMemberDraft] = useState({ registryId: 0, openId: "", accessLevel: "reader" as "publisher" | "reader" });
  const [publishDraft, setPublishDraft] = useState({ registryId: 0, name: "", description: "", readme: "", version: "0.1.0", releaseNotes: "", entry: "modul.nokta", source: "modul araclar:\n  islev calistir(deger):\n    dondur deger", exports: "calistir", dependencies: "" });
  const [catalogQuery, setCatalogQuery] = useState("");
  const [registryFilter, setRegistryFilter] = useState("hepsi");
  const [healthFilter, setHealthFilter] = useState("hepsi");
  const [installFilter, setInstallFilter] = useState("hepsi");
  const [sortOrder, setSortOrder] = useState("guncel");
  const workspace = trpc.packageRegistry.workspace.useQuery(undefined, { enabled: Boolean(user) });
  const graph = trpc.packageRegistry.graph.useQuery(undefined, { enabled: Boolean(user) });
  const createRegistry = trpc.packageRegistry.createRegistry.useMutation({ onSuccess: () => { utils.packageRegistry.workspace.invalidate(); setRegistryDraft({ slug: "", displayName: "", description: "", visibility: "private" }); } });
  const addMember = trpc.packageRegistry.addMember.useMutation({ onSuccess: () => { utils.packageRegistry.workspace.invalidate(); setMemberDraft((current) => ({ ...current, openId: "" })); } });
  const publish = trpc.packageRegistry.publish.useMutation({ onSuccess: () => { utils.packageRegistry.workspace.invalidate(); utils.packageRegistry.graph.invalidate(); setPublishDraft((current) => ({ ...current, name: "", description: "", readme: "", version: "0.1.0", releaseNotes: "", source: "", exports: "", dependencies: "" })); } });
  const install = trpc.packageRegistry.install.useMutation({ onSuccess: () => { utils.packageRegistry.workspace.invalidate(); utils.packageRegistry.graph.invalidate(); } });
  const applyUpdate = trpc.packageRegistry.applyUpdate.useMutation({ onSuccess: () => { utils.packageRegistry.workspace.invalidate(); utils.packageRegistry.graph.invalidate(); } });
  const markRead = trpc.packageRegistry.markNotificationRead.useMutation({ onSuccess: () => utils.packageRegistry.workspace.invalidate() });

  const workspaceError = workspace.error?.message || graph.error?.message || createRegistry.error?.message || addMember.error?.message || publish.error?.message || install.error?.message || applyUpdate.error?.message;
  const accessibleRegistries = workspace.data?.registries ?? [];
  const catalogPackages = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLocaleLowerCase("tr");
    return [...(workspace.data?.packages ?? [])].filter((pkg) => {
      const registry = accessibleRegistries.find((item) => item.id === pkg.registryId);
      const matchesText = !normalizedQuery || [pkg.name, pkg.description, registry?.displayName, registry?.slug].filter(Boolean).join(" ").toLocaleLowerCase("tr").includes(normalizedQuery);
      const matchesRegistry = registryFilter === "hepsi" || String(pkg.registryId) === registryFilter;
      const matchesHealth = healthFilter === "hepsi" || (healthFilter === "uyari" ? Boolean(pkg.health.severity) : pkg.health.severity === healthFilter);
      const matchesInstall = installFilter === "hepsi" || (installFilter === "kurulu" ? Boolean(pkg.installed) : installFilter === "guncelleme" ? Boolean(pkg.installed?.updateAvailable) : !pkg.installed);
      return matchesText && matchesRegistry && matchesHealth && matchesInstall;
    }).sort((left, right) => {
      if (sortOrder === "ad") return left.name.localeCompare(right.name, "tr");
      if (sortOrder === "uyari") return Number(Boolean(right.health.severity)) - Number(Boolean(left.health.severity));
      if (sortOrder === "kurulum") return Number(Boolean(right.installed)) - Number(Boolean(left.installed));
      return Number(new Date(right.latest?.publishedAt ?? 0)) - Number(new Date(left.latest?.publishedAt ?? 0));
    });
  }, [workspace.data?.packages, accessibleRegistries, catalogQuery, registryFilter, healthFilter, installFilter, sortOrder]);

  const submitRegistry = (event: FormEvent) => { event.preventDefault(); createRegistry.mutate(registryDraft); };
  const submitPublish = (event: FormEvent) => {
    event.preventDefault();
    publish.mutate({ ...publishDraft, exports: publishDraft.exports.split(",").map((item) => item.trim()).filter(Boolean), dependencies: dependenciesFromText(publishDraft.dependencies) });
  };
  const submitMember = (event: FormEvent) => { event.preventDefault(); if (memberDraft.registryId) addMember.mutate(memberDraft); };

  if (loading) return <RegistryLoading />;
  if (!user) return <main className="registry-auth"><PackageOpen size={34} /><p className="eyebrow">NOKTA KAYIT MERKEZİ</p><h1>Özel paketleriniz yalnızca size ve ekibinize açık kalsın.</h1><p>Paket yayımlamak, kurum üyelerine yetki vermek ve güncellemeleri görmek için güvenli oturum açın.</p><button onClick={() => startLogin()}><ShieldCheck size={16} /> Oturum aç</button><Link href="/"><ChevronLeft size={15} /> Studio’ya dön</Link></main>;

  return <main className="registry-shell">
    <header className="registry-topbar"><Link href="/"><ChevronLeft size={16} /> Nokta Studio</Link><div><span className="registry-user-dot" /> {user.name || "Nokta geliştiricisi"}</div></header>
    <section className="registry-hero"><div><p className="eyebrow">PAKET KAYIT MERKEZİ</p><h1>Kütüphanelerini <em>yayınla, kilitle, izle.</em></h1><p>Özel ve kurumsal kayıtlar yalnızca yetkili kullanıcılar tarafından okunur veya yayımlanır. Her sürüm, kaynak ve dışa aktarımlarından üretilen SHA-256 bütünlük kimliğiyle saklanır.</p></div><div className="notification-stamp"><Bell size={17} /><strong>{workspace.data?.unreadNotifications ?? 0}</strong><span>okunmamış güncelleme</span></div></section>
    <nav className="registry-tabs" aria-label="Paket kayıt bölümleri"><button className={tab === "kayitlar" ? "active" : ""} onClick={() => setTab("kayitlar")}><PackageOpen size={15} /> Kayıtlar</button><button className={tab === "yayinla" ? "active" : ""} onClick={() => setTab("yayinla")}><Send size={15} /> Yayınla</button><button className={tab === "bagimliliklar" ? "active" : ""} onClick={() => setTab("bagimliliklar")}><GitBranch size={15} /> Bağımlılıklar</button></nav>
    {workspaceError && <div className="registry-error">{workspaceError}</div>}

    {tab === "kayitlar" && <section className="registry-grid">
      <div className="registry-column"><article className="registry-paper"><div className="paper-heading"><span><Plus size={14} /> YENİ KAYIT</span><small>Özel veya kurum</small></div><form onSubmit={submitRegistry} className="registry-form"><label>Kayıt kimliği<input required value={registryDraft.slug} onChange={(event) => setRegistryDraft({ ...registryDraft, slug: event.target.value })} placeholder="finans-ekibi" /></label><label>Görünen ad<input required value={registryDraft.displayName} onChange={(event) => setRegistryDraft({ ...registryDraft, displayName: event.target.value })} placeholder="Finans Ekibi Kayıt Alanı" /></label><label>Açıklama<textarea value={registryDraft.description} onChange={(event) => setRegistryDraft({ ...registryDraft, description: event.target.value })} placeholder="Bu kayıt hangi ekip içindir?" /></label><label>Erişim<select value={registryDraft.visibility} onChange={(event) => setRegistryDraft({ ...registryDraft, visibility: event.target.value as "private" | "organization" })}><option value="private">Özel</option><option value="organization">Kurumsal</option></select></label><button disabled={createRegistry.isPending}>{createRegistry.isPending ? "Oluşturuluyor" : "Kaydı oluştur"}</button></form></article>
        <article className="registry-paper member-paper"><div className="paper-heading"><span><Users size={14} /> ÜYE YETKİSİ</span><small>Sahip kaydı</small></div><form onSubmit={submitMember} className="registry-form"><label>Kayıt<select value={memberDraft.registryId} onChange={(event) => setMemberDraft({ ...memberDraft, registryId: Number(event.target.value) })}><option value={0}>Kayıt seçin</option>{accessibleRegistries.filter((registry) => registry.access === "owner").map((registry) => <option key={registry.id} value={registry.id}>{registry.displayName}</option>)}</select></label><label>Kullanıcı açık kimliği<input required value={memberDraft.openId} onChange={(event) => setMemberDraft({ ...memberDraft, openId: event.target.value })} placeholder="Kullanıcının Nokta açık kimliği" /></label><label>Yetki<select value={memberDraft.accessLevel} onChange={(event) => setMemberDraft({ ...memberDraft, accessLevel: event.target.value as "publisher" | "reader" })}><option value="reader">Okuyucu</option><option value="publisher">Yayıncı</option></select></label><button disabled={!memberDraft.registryId || addMember.isPending}>Üyeyi kaydet</button></form></article></div>
      <div className="registry-column wide"><article className="registry-paper"><div className="paper-heading"><span><PackageCheck size={14} /> ERİŞEBİLDİĞİN KAYITLAR</span><small>{accessibleRegistries.length} kayıt</small></div>{workspace.isLoading ? <p className="registry-muted">Kayıtlar okunuyor…</p> : accessibleRegistries.length === 0 ? <div className="registry-empty"><PackageOpen size={23} /><strong>Henüz bir kayıt oluşturmadınız.</strong><span>İlk özel veya kurumsal kaydınızı soldaki defterden açın.</span></div> : <div className="registry-list">{accessibleRegistries.map((registry) => <div className="registry-row" key={registry.id}><span><strong>{registry.displayName}</strong><small>{registry.slug} · {registry.visibility === "private" ? "ÖZEL" : "KURUMSAL"}</small>{registry.description && <em>{registry.description}</em>}</span><b>{registry.access === "owner" ? "SAHİP" : registry.access === "publisher" ? "YAYINCI" : "OKUYUCU"}</b></div>)}</div>}</article>
      <article className="registry-paper catalog-paper"><div className="paper-heading"><span><Code2 size={14} /> PAKET KATALOĞU</span><small>Kur, kilitle, güncelle</small></div><div className="catalog-tools"><label className="catalog-search"><Search size={14} /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Paket, kayıt veya açıklama ara" /></label><div className="catalog-filters"><span><SlidersHorizontal size={12} /> Filtrele</span><select value={registryFilter} onChange={(event) => setRegistryFilter(event.target.value)}><option value="hepsi">Tüm kayıtlar</option>{accessibleRegistries.map((registry) => <option key={registry.id} value={registry.id}>{registry.displayName}</option>)}</select><select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)}><option value="hepsi">Tüm sağlık durumları</option><option value="uyari">Uyarısı olan</option><option value="critical">Kritik</option><option value="high">Yüksek</option><option value="moderate">Orta</option><option value="low">Düşük</option></select><select value={installFilter} onChange={(event) => setInstallFilter(event.target.value)}><option value="hepsi">Tüm kurulumlar</option><option value="kurulu">Kurulu</option><option value="guncelleme">Güncelleme bekliyor</option><option value="kurulu-degil">Kurulu değil</option></select><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="guncel">En güncel</option><option value="ad">Ada göre</option><option value="uyari">Önce uyarılar</option><option value="kurulum">Önce kurulu</option></select></div></div>{workspace.data?.packages.length ? <><p className="catalog-result-count">{catalogPackages.length} / {workspace.data.packages.length} paket gösteriliyor</p><div className="catalog-list">{catalogPackages.map((pkg) => <div className="catalog-item" key={pkg.id}><div><div className="catalog-title"><strong>{pkg.name}</strong>{pkg.health.severity && <span className={`health-badge ${pkg.health.severity}`}><ShieldAlert size={11} /> {pkg.health.severity === "critical" ? "KRİTİK" : pkg.health.severity === "high" ? "YÜKSEK" : pkg.health.severity === "moderate" ? "ORTA" : "DÜŞÜK"}</span>}{pkg.installed?.updateAvailable && <span className="update-badge"><RefreshCw size={10} /> GÜNCELLE</span>}</div><small>{pkg.latest ? `v${pkg.latest.version}` : "Henüz yayımlanmadı"} · {accessibleRegistries.find((registry) => registry.id === pkg.registryId)?.slug}</small><p>{pkg.description || "Açıklama eklenmedi."}</p>{pkg.latest && <code>{pkg.latest.integrity.slice(0, 20)}…</code>}</div><div className="catalog-actions"><Link href={`/paketler/${pkg.id}`}><ArrowUpRight size={13} /> İncele</Link>{pkg.latest && (pkg.installed ? <div className="install-state"><span>{pkg.installed.lockedVersion} kilitli</span>{pkg.installed.updateAvailable && <button onClick={() => applyUpdate.mutate({ installId: pkg.installed!.id })}><RefreshCw size={13} /> Güncelle</button>}</div> : <button onClick={() => install.mutate({ packageId: pkg.id, requestedRange: `^${pkg.latest!.version.split(".").slice(0, 2).join(".")}` })}><Plus size={13} /> Kur</button>)}</div></div>)}</div></> : <p className="registry-muted">Erişebildiğiniz kayıtlarda yayımlanmış paket bulunmuyor.</p>}</article></div>
    </section>}

    {tab === "yayinla" && <section className="publish-layout"><article className="registry-paper publish-paper"><div className="paper-heading"><span><Send size={14} /> YENİ SÜRÜM YAYINLA</span><small>Geri alınamaz sürüm</small></div><form onSubmit={submitPublish} className="publish-form"><label>Hedef kayıt<select required value={publishDraft.registryId} onChange={(event) => setPublishDraft({ ...publishDraft, registryId: Number(event.target.value) })}><option value={0}>Kayıt seçin</option>{accessibleRegistries.filter((registry) => registry.access === "owner" || registry.access === "publisher").map((registry) => <option key={registry.id} value={registry.id}>{registry.displayName} · {registry.access}</option>)}</select></label><div className="form-two"><label>Paket adı<input required value={publishDraft.name} onChange={(event) => setPublishDraft({ ...publishDraft, name: event.target.value })} placeholder="rapor-araclari" /></label><label>Sürüm<input required value={publishDraft.version} onChange={(event) => setPublishDraft({ ...publishDraft, version: event.target.value })} placeholder="1.0.0" /></label></div><label>Açıklama<input value={publishDraft.description} onChange={(event) => setPublishDraft({ ...publishDraft, description: event.target.value })} placeholder="Paketin kısa amacı" /></label><label>README<textarea value={publishDraft.readme} onChange={(event) => setPublishDraft({ ...publishDraft, readme: event.target.value })} placeholder="# Paket adı\n\nKurulum ve kullanım açıklaması" /></label><label>Sürüm notu<textarea value={publishDraft.releaseNotes} onChange={(event) => setPublishDraft({ ...publishDraft, releaseNotes: event.target.value })} placeholder="Bu sürümdeki değişiklikler" /></label><label>Giriş dosyası<input required value={publishDraft.entry} onChange={(event) => setPublishDraft({ ...publishDraft, entry: event.target.value })} /></label><label>Dışa aktarılan işlevler<input required value={publishDraft.exports} onChange={(event) => setPublishDraft({ ...publishDraft, exports: event.target.value })} placeholder="calistir, ozet" /></label><label>Bağımlılıklar <small>Her satır: paket@aralık</small><textarea value={publishDraft.dependencies} onChange={(event) => setPublishDraft({ ...publishDraft, dependencies: event.target.value })} placeholder="istatistik@^1.2" /></label><label>Paket kaynağı<textarea required className="source-editor" value={publishDraft.source} onChange={(event) => setPublishDraft({ ...publishDraft, source: event.target.value })} placeholder="modul araclar:\n  islev calistir(deger):\n    dondur deger" /></label><button disabled={!publishDraft.registryId || publish.isPending}>{publish.isPending ? "Bütünlük doğrulanıyor…" : "Sürümü yayımla"}</button></form></article><aside className="publish-notes"><span>YAYIN SÖZLEŞMESİ</span><p>Yayınlanan her sürüm, kaynak metni, dışa aktarımları ve bağımlılıklarıyla birlikte SHA-256 bütünlük kimliği alır.</p><p>Sürüm numarası mevcut en güncel sürümden büyük olmalıdır. Bu uygulama geçmiş sürümü değiştirmez veya silmez.</p><p>Uyumlu sürüm aralığında yeni sürüm varsa, kullanan geliştiriciler bildirim alır; güncellemeyi kendileri uygular.</p></aside></section>}

    {tab === "bagimliliklar" && <section className="graph-layout"><article className="registry-paper"><div className="paper-heading"><span><GitBranch size={14} /> KİLİTLİ BAĞIMLILIK GRAFİĞİ</span><small>Yalnızca kurulu sürümler</small></div><DependencyGraph graph={graph.data ?? { nodes: [], edges: [] }} /></article><aside className="notification-panel"><div className="paper-heading"><span><Bell size={14} /> GÜNCELLEME BİLDİRİMLERİ</span><small>{workspace.data?.unreadNotifications ?? 0} yeni</small></div>{workspace.data?.notifications.length ? <div className="notification-list">{workspace.data.notifications.map((notification) => <button className={notification.isRead ? "read" : ""} key={notification.id} onClick={() => !notification.isRead && markRead.mutate({ notificationId: notification.id })}><span><strong>{notification.title}</strong><small>{notification.body}</small></span>{!notification.isRead && <i />}</button>)}</div> : <div className="registry-empty"><Bell size={22} /><strong>Bildirim yok.</strong><span>Kurulu bir paketin uyumlu yeni sürümü yayımlandığında burada görünür.</span></div>}</aside></section>}
  </main>;
}
