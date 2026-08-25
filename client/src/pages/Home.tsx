/**
 * Nokta Studio / Atölye Defteri — ana IDE yüzeyi.
 * Sakin, editoryal, üç bölmeli bir çalışma tezgâhı; kod her zaman ana malzemedir.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  FileCode2,
  FolderTree,
  Keyboard,
  Play,
  RotateCcw,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { DEFAULT_CODE, NOKTA_EXAMPLES, type ConsoleEntry, runNokta } from "@/lib/noktaInterpreter";

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
};

const studioAsset = (filename: string, manusUrl: string) =>
  import.meta.env.BASE_URL === "/" ? manusUrl : `${import.meta.env.BASE_URL}nokta-assets/${filename}`;

const paperTexture = studioAsset("nokta-paper-texture.jpg", "/manus-storage/nokta-paper-texture_32790d41.jpg");
const brandMark = studioAsset("nokta-mark.png", "/manus-storage/nokta-mark_d1842735.png");
const statusStamps = studioAsset("nokta-status-stamps.png", "/manus-storage/nokta-status-stamps_639c30b1.png");
const flowSculpture = studioAsset("nokta-flow-sculpture.jpg", "/manus-storage/nokta-flow-sculpture_786ba9a4.jpg");

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [activeExample, setActiveExample] = useState("satis");
  const [result, setResult] = useState(() => runNokta(DEFAULT_CODE));
  const [runCount, setRunCount] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const lines = useMemo(() => code.split("\n"), [code]);
  const hasError = !result.ok;

  const runCode = () => {
    setIsRunning(true);
    window.setTimeout(() => {
      const next = runNokta(code);
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
    setResult(runNokta(example.code));
    setSelectedLine(null);
  };

  const resetCode = () => {
    const example = NOKTA_EXAMPLES.find((item) => item.id === activeExample) ?? NOKTA_EXAMPLES[3];
    setCode(example.code);
    setResult(runNokta(example.code));
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
  }, [code]);

  return (
    <main className="studio-shell" style={{ "--paper-texture": `url("${paperTexture}")` } as CSSProperties & Record<"--paper-texture", string>}>
      <aside className="studio-sidebar" aria-label="Nokta Studio gezintisi">
        <div className="brand-block">
          <img src={brandMark} alt="Nokta işareti" className="brand-mark" />
          <div>
            <p className="brand-name">Nokta</p>
            <p className="brand-subtitle">Studio <span>v0.1</span></p>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-heading"><span>ÇALIŞMA ALANI</span><button aria-label="Çalışma alanı seçenekleri">•••</button></div>
          <div className="current-file"><div className="file-icon"><FileCode2 size={16} /></div><div><strong>akış.nokta</strong><small>Yerel taslak</small></div><span className="file-live" /></div>
        </div>

        <nav className="side-section" aria-label="Dosyalar">
          <p className="section-label"><FolderTree size={14} /> DOSYALAR</p>
          <button className="nav-file active"><FileCode2 size={15} /> akış.nokta <span>1</span></button>
          <button className="nav-file"><FileCode2 size={15} /> notlar.nokta</button>
        </nav>

        <nav className="side-section examples-section" aria-label="Örnek programlar">
          <p className="section-label"><BookOpen size={14} /> ÖRNEKLER</p>
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
              <textarea
                aria-label="Nokta kaynak kodu"
                spellCheck={false}
                value={code}
                onChange={(event) => { setCode(event.target.value); setSelectedLine(null); }}
              />
            </div>
            <footer className="editor-footer"><span><Keyboard size={14} /> Çalıştırmak için <kbd>⌘ Enter</kbd></span><span>{lines.length} satır · Nokta v0.1</span></footer>
          </section>

          <aside className="output-panel" aria-label="Yürütme çıktısı">
            <div className="output-header"><div><span className="eyebrow">YÜRÜTME KAYDI</span><h3>{hasError ? "Akış durdu" : "Akış tamamlandı"}</h3></div><div className={`run-indicator ${hasError ? "error" : ""}`}>{hasError ? "HATA" : "BAŞARILI"}</div></div>
            <div className="output-summary"><span><b>{result.entries.filter((entry) => entry.tone === "step").length}</b> adım</span><span><b>{Math.max(1, Math.round(result.duration))} ms</b> süre</span><span><b>#{runCount.toString().padStart(3, "0")}</b> kayıt</span></div>
            <div className="output-timeline">
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
          </div>}
        </section>
      </section>
    </main>
  );
}
