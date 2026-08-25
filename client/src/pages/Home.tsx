/**
 * Nokta Studio / Atölye Defteri — ana IDE yüzeyi.
 * Sakin, editoryal, üç bölmeli bir çalışma tezgâhı; kod her zaman ana malzemedir.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  BookOpen,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Database,
  HardDrive,
  FileCode2,
  FolderTree,
  Keyboard,
  Play,
  PieChart as PieChartIcon,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Table2,
  TerminalSquare,
  FileUp,
  PlugZap,
  X,
} from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DEFAULT_CODE, formatValue, NOKTA_EXAMPLES, type ConsoleEntry, type DataPreview, type DatasetSource, runNokta } from "@/lib/noktaInterpreter";

const editorFacts = [
  { key: "1", title: "Girinti blok oluşturur", text: "Koşul, döngü ve adım gövdelerinde iki boşluk kullan." },
  { key: "2", title: "Hata görünür kalır", text: "Çıktı paneli seni doğrudan ilgili satıra götürür." },
  { key: "3", title: "Akışı böl", text: "akis ve adim ile bir işi denetlenebilir parçalara ayır." },
];

const toneIcon: Record<ConsoleEntry["tone"], typeof Check> = {
  output: TerminalSquare,
  step: ChevronRight,
  success: Check,
  error: X,
  info: Sparkles,
  permission: ShieldCheck,
  automation: CalendarClock,
};

const studioAsset = (filename: string, manusUrl: string) =>
  import.meta.env.BASE_URL === "/" ? manusUrl : `${import.meta.env.BASE_URL}nokta-assets/${filename}`;

const paperTexture = studioAsset("nokta-paper-texture.jpg", "/manus-storage/nokta-paper-texture_32790d41.jpg");
const brandMark = studioAsset("nokta-mark.png", "/manus-storage/nokta-mark_d1842735.png");
const statusStamps = studioAsset("nokta-status-stamps.png", "/manus-storage/nokta-status-stamps_639c30b1.png");
const flowSculpture = studioAsset("nokta-flow-sculpture.jpg", "/manus-storage/nokta-flow-sculpture_786ba9a4.jpg");

const chartColors = ["#276D57", "#BD8550", "#4B806E", "#D0AA72", "#193C32", "#7DA28E"];

function highlightNokta(source: string) {
  const token = /(#.*$)|("(?:[^"\\]|\\.)*")|\b(izin|zamanla|olay|akis|adim|eger|degilse|her|icin|islev|dondur|dur|yaz)\b|\b(csv|json|tablo|veri|liste|metin|sayi|kayit|dosya|uygulama|bildirim|uyari)\b|\b(\d+(?:\.\d+)?)\b/gm;
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  let markup = "";
  let position = 0;
  for (let match = token.exec(source); match; match = token.exec(source)) {
    markup += escape(source.slice(position, match.index));
    const className = match[1] ? "tok-comment" : match[2] ? "tok-string" : match[3] ? "tok-keyword" : match[4] ? "tok-module" : "tok-number";
    markup += `<span class="${className}">${escape(match[0])}</span>`;
    position = match.index + match[0].length;
  }
  return markup + escape(source.slice(position));
}

function DataChart({ preview }: { preview: DataPreview }) {
  const numericColumns = preview.columns.filter((column) => preview.rows.some((row) => typeof row[column] === "number"));
  const defaultCategory = preview.columns.find((column) => !numericColumns.includes(column)) ?? preview.columns[0] ?? "";
  const [category, setCategory] = useState(defaultCategory);
  const [metric, setMetric] = useState(numericColumns[0] ?? "");
  const [mode, setMode] = useState<"bar" | "pie">("bar");

  useEffect(() => {
    setCategory(preview.columns.find((column) => !numericColumns.includes(column)) ?? preview.columns[0] ?? "");
    setMetric(numericColumns[0] ?? "");
  }, [preview.title, preview.columns.join("|")]);

  const data = preview.rows.map((row) => ({ name: formatValue(row[category] ?? null), value: Number(row[metric] ?? 0) })).filter((item) => Number.isFinite(item.value));
  if (!metric || data.length === 0) return <p className="chart-empty">Grafik için en az bir sayısal sütun gerekir.</p>;

  return <section className="data-chart" aria-label={`${preview.title} grafik analizi`}>
    <div className="data-chart-heading"><span><BarChart3 size={14} /> GÖRSEL ANALİZ</span><div className="chart-mode"><button className={mode === "bar" ? "active" : ""} onClick={() => setMode("bar")} aria-label="Çubuk grafik"><BarChart3 size={13} /></button><button className={mode === "pie" ? "active" : ""} onClick={() => setMode("pie")} aria-label="Pasta grafik"><PieChartIcon size={13} /></button></div></div>
    <div className="chart-selectors"><label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}>{preview.columns.map((column) => <option key={column}>{column}</option>)}</select></label><label>Değer<select value={metric} onChange={(event) => setMetric(event.target.value)}>{numericColumns.map((column) => <option key={column}>{column}</option>)}</select></label></div>
    <div className="chart-canvas"><ResponsiveContainer width="100%" height={166}>{mode === "bar" ? <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 9, fill: "#56625c" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 8, fill: "#7b847e" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: "1px solid #d6d0c2", borderRadius: 2, fontSize: 11 }} /><Bar dataKey="value" fill="#276D57" radius={[2, 2, 0, 0]} /></BarChart> : <PieChart><Tooltip contentStyle={{ border: "1px solid #d6d0c2", borderRadius: 2, fontSize: 11 }} /><Pie data={data} dataKey="value" nameKey="name" innerRadius={34} outerRadius={66} paddingAngle={2}>{data.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie></PieChart>}</ResponsiveContainer></div>
  </section>;
}

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [activeExample, setActiveExample] = useState("veri-baslangic");
  const [result, setResult] = useState(() => runNokta(DEFAULT_CODE));
  const [runCount, setRunCount] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [datasets, setDatasets] = useState<Record<string, DatasetSource>>({});
  const [uploadNotice, setUploadNotice] = useState("CSV veya JSON dosyanı burada yerel olarak bağla.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [helperEndpoint, setHelperEndpoint] = useState("https://localhost:8417");
  const [helperPairingCode, setHelperPairingCode] = useState("");
  const [helperToken, setHelperToken] = useState("");
  const [helperStatus, setHelperStatus] = useState("Yerel yardımcı bekleniyor.");
  const [helperAction, setHelperAction] = useState("file.read");
  const [helperPath, setHelperPath] = useState("girdi/satislar.csv");
  const [helperContent, setHelperContent] = useState("");

  const lines = useMemo(() => code.split("\n"), [code]);
  const highlightedCode = useMemo(() => highlightNokta(code), [code]);
  const hasError = !result.ok;

  const runCode = () => {
    setIsRunning(true);
    window.setTimeout(() => {
      const next = runNokta(code, { datasets });
      setResult(next);
      setRunCount((value) => value + 1);
      setSelectedLine(next.entries.find((entry) => entry.tone === "error")?.line ?? null);
      setIsRunning(false);
    }, 140);
  };

  const openExample = (id: string) => {
    const example = NOKTA_EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setActiveExample(id);
    setCode(example.code);
    setResult(runNokta(example.code, { datasets }));
    setSelectedLine(null);
  };

  const resetCode = () => {
    const example = NOKTA_EXAMPLES.find((item) => item.id === activeExample) ?? NOKTA_EXAMPLES[3];
    setCode(example.code);
    setResult(runNokta(example.code, { datasets }));
    setSelectedLine(null);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code, datasets]);

  const handleDatasetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "json") { setUploadNotice("Yalnızca .csv veya .json dosyası yüklenebilir."); return; }
    if (file.size > 1_500_000) { setUploadNotice("Bu sürümde yerel önizleme için 1,5 MB altındaki dosyaları kullanın."); return; }
    const content = await file.text();
    if (extension === "json") {
      try { JSON.parse(content); } catch { setUploadNotice("JSON dosyası geçerli değil; tırnak ve virgülleri kontrol edin."); return; }
    }
    setDatasets((current) => ({ ...current, [file.name]: { name: file.name, format: extension, content } }));
    setUploadNotice(`${file.name} yerel veri kümesi olarak bağlandı.`);
  };

  const insertDatasetSnippet = (name: string) => {
    setCode((current) => `${current.trim()}\n\n# Yüklenen veri kümesini kullan\nveri_kumesi = veri.al("${name}")\ntablo.onizle(veri_kumesi, "${name}")`);
    setActiveExample("yerel-veri");
  };

  const helperHeaders = () => ({ "Content-Type": "application/json", "X-Nokta-Session": helperToken });

  const pairHelper = async () => {
    if (!helperPairingCode) { setHelperStatus("Windows yardımcı penceresindeki eşleştirme kodunu girin."); return; }
    try {
      const response = await fetch(`${helperEndpoint}/v1/pair`, { method: "POST", headers: { "X-Nokta-Pairing-Code": helperPairingCode } });
      const body = await response.json();
      if (!response.ok || !body.sessionToken) { setHelperStatus(body.error ?? "Eşleştirme reddedildi."); return; }
      setHelperToken(body.sessionToken);
      setHelperPairingCode("");
      setHelperStatus(`Eşleştirildi — ${body.workspaceName}; oturum ${Math.round(body.expiresInSeconds / 60)} dakika geçerli.`);
    } catch { setHelperStatus("HTTPS yardımcıya ulaşılamadı. Sertifika güvenini, adresi ve yardımcıyı kontrol edin."); }
  };

  const checkHelper = async () => {
    if (!helperToken) { setHelperStatus("Önce Eşleştir düğmesiyle süreli bir yerel oturum oluşturun."); return; }
    try {
      const response = await fetch(`${helperEndpoint}/v1/health`, { headers: helperHeaders() });
      const body = await response.json();
      setHelperStatus(response.ok ? `Bağlı — ${body.workspace}` : body.error ?? "Yardımcı bağlantısı reddedildi.");
    } catch { setHelperStatus("Yerel yardımcıya ulaşılamadı. Windows’ta npm start ile başlatıldığını ve adresi kontrol edin."); }
  };

  const sendHelperPlan = async () => {
    if (!helperToken) { setHelperStatus("Plan göndermeden önce Eşleştir düğmesiyle yerel oturum oluşturun."); return; }
    const plan = { taskId: `ide_${crypto.randomUUID()}`, idempotencyKey: crypto.randomUUID(), expiresAt: new Date(Date.now() + 120_000).toISOString(), actions: [{ type: helperAction, path: helperPath, ...(helperAction === "file.write" ? { content: helperContent } : {}) }] };
    try {
      const response = await fetch(`${helperEndpoint}/v1/plans/execute`, { method: "POST", headers: helperHeaders(), body: JSON.stringify(plan) });
      const body = await response.json();
      setHelperStatus(response.ok ? `Plan tamamlandı — ${body.receipt?.results?.[0]?.type ?? helperAction}` : body.error ?? "Plan reddedildi.");
    } catch { setHelperStatus("Plan gönderilemedi. Yardımcı durumu ve yerel ağ adresini kontrol edin."); }
  };

  return (
    <main className="studio-shell" style={{ "--paper-texture": `url("${paperTexture}")` } as CSSProperties & Record<"--paper-texture", string>}>
      <aside className="studio-sidebar" aria-label="Nokta Studio gezintisi">
        <div className="brand-block">
          <div className="brand-mark-wrap"><img src={brandMark} alt="Nokta işareti" className="brand-mark" /><span className="brand-orbit" aria-hidden="true" /></div>
          <div>
            <p className="brand-name">Nokta</p>
            <p className="brand-subtitle">Studio <span>v0.5</span></p>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-heading"><span>ÇALIŞMA ALANI</span><button aria-label="Çalışma alanı seçenekleri">•••</button></div>
          <div className="current-file"><div className="file-icon"><FileCode2 size={16} /></div><div><strong>akış.nokta</strong><small>Yerel taslak</small></div><span className="file-live" /></div>
        </div>

        <section className="dataset-shelf" aria-label="Yerel veri kümeleri">
          <div className="dataset-heading"><span><Database size={14} /> VERİ KÜMELERİ</span><button onClick={() => fileInputRef.current?.click()}><FileUp size={13} /> Yükle</button></div>
          <input ref={fileInputRef} className="dataset-file-input" type="file" accept=".csv,.json,text/csv,application/json" onChange={handleDatasetUpload} />
          {Object.values(datasets).length === 0 ? <p className="dataset-empty">{uploadNotice}</p> : <div className="dataset-list">{Object.values(datasets).map((dataset) => <div className="dataset-item" key={dataset.name}><span><strong>{dataset.name}</strong><small>{dataset.format.toUpperCase()} · yalnızca bu tarayıcıda</small></span><div><button title="Koda ekle" onClick={() => insertDatasetSnippet(dataset.name)}>Ekle</button><button title="Veri kümesini kaldır" onClick={() => setDatasets((current) => { const next = { ...current }; delete next[dataset.name]; return next; })}><X size={13} /></button></div></div>)}</div>}
        </section>

        <section className="helper-shelf" aria-label="Windows yerel yardımcı bağlantısı">
          <div className="dataset-heading"><span><HardDrive size={14} /> WINDOWS YARDIMCI</span><span className="helper-prototype">PROTOTİP</span></div>
          <p>İzinli dosya planları yalnızca cihazındaki çalışma klasöründe yürür.</p>
          <label>Adres<input value={helperEndpoint} onChange={(event) => setHelperEndpoint(event.target.value)} aria-label="Yerel yardımcı adresi" /></label>
          <label>Eşleştirme kodu<input value={helperPairingCode} onChange={(event) => setHelperPairingCode(event.target.value)} type="password" placeholder="5 dakika geçerli kod" aria-label="Yerel yardımcı eşleştirme kodu" /></label>
          <button className="helper-check" onClick={pairHelper}><PlugZap size={13} /> Eşleştir</button>
          <button className="helper-check" onClick={checkHelper}><PlugZap size={13} /> Bağlantıyı dene</button>
          <div className="helper-plan"><select value={helperAction} onChange={(event) => setHelperAction(event.target.value)} aria-label="Dosya eylemi"><option value="file.read">Dosya oku</option><option value="file.write">Dosya yaz</option><option value="file.list">Klasör listele</option><option value="file.mkdir">Klasör oluştur</option></select><input value={helperPath} onChange={(event) => setHelperPath(event.target.value)} placeholder="girdi/satislar.csv" aria-label="Göreli dosya yolu" />{helperAction === "file.write" && <textarea value={helperContent} onChange={(event) => setHelperContent(event.target.value)} placeholder="Yazılacak içerik" aria-label="Yazılacak içerik" />}<button className="helper-send" onClick={sendHelperPlan}><ShieldCheck size={13} /> İzinli planı gönder</button></div>
          <small className="helper-status">{helperStatus}</small>
        </section>

        <nav className="side-section" aria-label="Dosyalar">
          <p className="section-label"><FolderTree size={14} /> DOSYALAR</p>
          <button className="nav-file active"><FileCode2 size={15} /> akış.nokta <span>1</span></button>
          <button className="nav-file"><FileCode2 size={15} /> notlar.nokta</button>
        </nav>

        <nav className="side-section examples-section" aria-label="Örnek programlar">
          <p className="section-label"><BookOpen size={14} /> ÖRNEKLER <span className="section-shelf">ATÖLYE RAFI</span></p>
          <div className="example-list">
            {NOKTA_EXAMPLES.map((example) => (
              <button
                key={example.id}
                className={`example-item ${activeExample === example.id ? "active" : ""}`}
                onClick={() => openExample(example.id)}
              >
                <Code2 size={15} />
                <span><strong>{example.title}</strong><small>{example.subtitle}</small></span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-notice">
          <img src={statusStamps} alt="Nokta durum işaretleri" />
          <div><strong>Önizleme güvenlidir</strong><span>Bu sürüm tarayıcının dışına veri göndermez.</span></div>
        </div>
      </aside>

      <section className="studio-main">
        <header className="topbar">
          <div className="document-identity">
            <span className="breadcrumb">NOKTA / <b>ATÖLYE</b></span>
            <div><h1>akış.nokta</h1><span className="saved-state">Otomatik kaydedildi</span></div>
          </div>
          <div className="toolbar-actions">
            <button className="reset-button" onClick={resetCode} title="Örneği geri yükle"><RotateCcw size={16} /><span>Sıfırla</span></button>
            <button className={`run-button ${isRunning ? "running" : ""}`} onClick={runCode} disabled={isRunning}>
              <Play size={15} fill="currentColor" />
              <span>{isRunning ? "Çalışıyor" : "Çalıştır"}</span>
              <kbd>⌘↵</kbd>
            </button>
          </div>
        </header>

        <section className="editor-intro">
          <div><p className="eyebrow">NOKTA ATÖLYESİ</p><h2>Veriyi içeri al.<br /><em>Akışı görünür kıl.</em></h2></div>
          <div className="intro-meta"><span className={`status-pip ${hasError ? "warning" : ""}`} /> {hasError ? "İnceleme gerekiyor" : "Çalışmaya hazır"}</div>
        </section>

        <div className="workbench-grid">
          <section className="editor-panel" aria-label="Nokta kod düzenleyicisi">
            <div className="panel-header">
              <div className="panel-tab"><span className="panel-dot" /> KOD</div>
              <div className="language-chip">.nokta <span>Türkçe-öncelikli</span></div>
            </div>
            <div className="code-editor">
              <div className="line-numbers" aria-hidden="true">
                {lines.map((_, index) => <span key={index} className={selectedLine === index + 1 ? "marked" : ""}>{index + 1}</span>)}
              </div>
              <pre ref={highlightRef} className="syntax-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
              <textarea
                aria-label="Nokta kaynak kodu"
                spellCheck={false}
                value={code}
                onChange={(event) => { setCode(event.target.value); setSelectedLine(null); }}
                onScroll={(event) => { if (highlightRef.current) { highlightRef.current.scrollTop = event.currentTarget.scrollTop; highlightRef.current.scrollLeft = event.currentTarget.scrollLeft; } }}
              />
            </div>
            <footer className="editor-footer"><span><Keyboard size={14} /> Çalıştırmak için <kbd>⌘ Enter</kbd></span><span>{lines.length} satır · Nokta v0.5</span></footer>
          </section>

          <aside className="output-panel" aria-label="Yürütme çıktısı">
            <div className="output-header"><div><span className="eyebrow">YÜRÜTME KAYDI</span><h3>{hasError ? "Akış durdu" : "Akış tamamlandı"}</h3></div><span className="flow-seal output-seal" aria-hidden="true" /><div className={`run-indicator ${hasError ? "error" : ""}`}>{hasError ? "HATA" : "BAŞARILI"}</div></div>
            <div className="output-summary"><span><b>{result.entries.filter((entry) => entry.tone === "step").length}</b> adım</span><span><b>{result.plans.length}</b> plan</span><span><b>{Math.max(1, Math.round(result.duration))} ms</b> süre</span><span><b>#{runCount.toString().padStart(3, "0")}</b> kayıt</span></div>
            {result.plans.length > 0 && <section className="automation-plans" aria-label="Otomasyon planları">
              <div className="automation-plans-heading"><span>OTOMASYON PLANI</span><small>Güvenli önizleme</small></div>
              <div className="automation-plan-list">
                {result.plans.map((plan) => <button key={`${plan.kind}-${plan.line}`} className="automation-plan" onClick={() => setSelectedLine(plan.line)}>
                  <span className={`automation-plan-icon ${plan.kind}`}>{plan.kind === "zamanlama" ? <CalendarClock size={14} /> : <BellRing size={14} />}</span>
                  <span><small>{plan.kind === "zamanlama" ? "ZAMANLAMA" : "OLAY DİNLEYİCİSİ"}</small><strong>{plan.title}</strong></span>
                  <ChevronRight size={14} />
                </button>)}
              </div>
            </section>}
            {result.previews.map((preview, index) => <section className="data-preview" aria-label={`${preview.title} tablo önizlemesi`} key={`${preview.title}-${index}`}>
              <div className="data-preview-heading"><span><Table2 size={14} /> VERİ ÖNİZLEMESİ</span><small>{preview.rows.length} örnek satır · {preview.columns.length} sütun</small></div>
              <h4>{preview.title}</h4>
              <div className="data-table-scroll"><table><thead><tr>{preview.columns.slice(0, 4).map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
                {preview.rows.map((row, rowIndex) => <tr key={rowIndex}>{preview.columns.slice(0, 4).map((column) => <td key={column}>{formatValue(row[column] ?? null)}</td>)}</tr>)}
              </tbody></table></div>
              <DataChart preview={preview} />
            </section>)}
            {result.diagnostics.map((diagnostic) => <section className="diagnostic-card" key={`${diagnostic.code}-${diagnostic.line}`}><div><span>{diagnostic.code}</span><strong>{diagnostic.line ? `SATIR ${diagnostic.line}` : "GENEL TANI"}</strong></div><p>{diagnostic.message}</p><small><Sparkles size={12} /> {diagnostic.suggestion}</small>{diagnostic.line && <button onClick={() => setSelectedLine(diagnostic.line ?? null)}>İlgili satıra git <ChevronRight size={13} /></button>}</section>)}
            <div className="output-timeline">
              <div className="flow-trail-label"><span>AKIŞ İZİ</span><small>RUN #{runCount.toString().padStart(3, "0")}</small></div>
              {result.entries.length === 0 ? <p className="empty-output">Çıktılar burada görünecek.</p> : result.entries.map((entry, index) => {
                const Icon = toneIcon[entry.tone];
                return <button key={`${entry.text}-${index}`} className={`output-item ${entry.tone}`} onClick={() => setSelectedLine(entry.line ?? null)}>
                  <span className="timeline-node"><Icon size={13} /></span>
                  <span className="output-copy"><small>{entry.line ? `SATIR ${entry.line}` : entry.tone === "output" ? "ÇIKTI" : "DURUM"}</small><strong>{entry.text}</strong></span>
                </button>;
              })}
            </div>
            <div className="output-footnote"><span /> Önizleme modunda hiçbir dosya değiştirilmez.</div>
          </aside>
        </div>

        <section className="reference-area" aria-label="Nokta başvuru kartları">
          <div className="reference-heading"><div><p className="eyebrow">DİL KARTLARI</p><h3>Bir bakışta Nokta</h3></div><button onClick={() => setIsReferenceOpen((value) => !value)}><CircleHelp size={15} /> {isReferenceOpen ? "Kısa görünüm" : "Tüm sözdizimi"}</button></div>
          <div className="reference-grid">
            {editorFacts.map((fact) => <article className="rule-card" key={fact.key}><span>{fact.key.padStart(2, "0")}</span><h4>{fact.title}</h4><p>{fact.text}</p></article>)}
            <article className="sculpture-card"><div><span>AKIŞ MANTIĞI</span><p>Bir işi adımlara ayır; her çıktı görünür kalsın.</p></div><img src={flowSculpture} alt="Nokta veri akışını temsil eden soyut çalışma" /></article>
          </div>
          {isReferenceOpen && <div className="syntax-sheet">
            <div><span>ÇIKTI</span><pre>yaz "Merhaba"</pre><p>Bir değeri yürütme kaydına ekler.</p></div>
            <div><span>KOŞUL</span><pre>{`eger puan >= 80:\n  yaz "Başarılı"\ndegilse:\n  yaz "Tekrar dene"`}</pre><p>Doğru olan dala göre işlem yapar.</p></div>
            <div><span>DÖNGÜ</span><pre>{`her deger icin liste:\n  yaz deger`}</pre><p>Bir listedeki her değer için bloğu çalıştırır.</p></div>
            <div><span>İŞLEV</span><pre>{`islev iki_kat(sayi):\n  dondur sayi * 2`}</pre><p>Tekrar kullanılabilir bir işlem tanımlar.</p></div>
            <div><span>VERİ KÜMESİ</span><pre>{`satirlar = veri.al("dosya.csv")\ntablo.onizle(satirlar, "Rapor")`}</pre><p>Yüklenmiş yerel CSV veya JSON dosyasını bağlar.</p></div>
          </div>}
        </section>
      </section>
    </main>
  );
}
