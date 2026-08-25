/** Nokta Studio — yorumlayıcı davranış sözleşmeleri. */
import { describe, expect, it } from "vitest";
import { NOKTA_EXAMPLES, runNokta } from "./noktaInterpreter";

describe("Nokta v0.2 yorumlayıcısı", () => {
  it("yerleşik tüm örnekleri hatasız yürütür", () => {
    NOKTA_EXAMPLES.forEach((example) => {
      const result = runNokta(example.code);
      expect(result.ok, `${example.title}: ${result.entries.map((entry) => entry.text).join(" | ")}`).toBe(true);
    });
  });

  it("Türkçe adları, kayıt alanlarını ve döngüyü işler", () => {
    const result = runNokta(`öğrenciler = [{ ad: "Ada", puan: 91 }, { ad: "Efe", puan: 76 }]
her öğrenci icin öğrenciler:
  eger öğrenci.puan >= 80:
    yaz öğrenci.ad + " başarılı"`);

    expect(result.ok).toBe(true);
    expect(result.entries.some((entry) => entry.text === "Ada başarılı")).toBe(true);
  });

  it("akışın adımlarını ve sayısal işlemleri yürütme kaydına ekler", () => {
    const result = runNokta(`akis "Toplama":
  adim "Hesapla":
    sonuc = 10 + 8 * 2
    yaz sonuc`);

    expect(result.ok).toBe(true);
    expect(result.entries.some((entry) => entry.text === "26")).toBe(true);
    expect(result.entries.filter((entry) => entry.tone === "step")).toHaveLength(1);
  });

  it("tanımsız adları açıklayıcı hata olarak bildirir", () => {
    const result = runNokta("yaz bulunmayan_deger");
    expect(result.ok).toBe(false);
    expect(result.entries.at(-1)?.text).toContain("bulunamadı");
  });

  it("izinli zamanlama ve olay planlarını güvenli önizleme olarak kaydeder", () => {
    const result = runNokta(`izin uygulama "Tarayıcı"
izin bildirim "Takvim"
zamanla "09:00":
  uygulama.ac("Tarayıcı")
  bildirim.izle("Takvim")
olay "bildirim:takvim":
  yaz "Hazır"`);

    expect(result.ok).toBe(true);
    expect(result.plans).toEqual([
      { kind: "zamanlama", title: "09:00", line: 3 },
      { kind: "olay", title: "bildirim:takvim", line: 6 },
    ]);
    expect(result.entries.some((entry) => entry.tone === "automation")).toBe(true);
  });

  it("uygulama eylemini açık izin olmadan çalıştırmaz", () => {
    const result = runNokta(`uygulama.ac("Tarayıcı")`);
    expect(result.ok).toBe(false);
    expect(result.entries.at(-1)?.text).toContain("uygulama izni yok");
  });

  it("genişletilmiş liste, metin, sayı ve kayıt yardımcılarını çalıştırır", () => {
    const result = runNokta(`sayilar = liste.ekle([4, 8], 12)
bilgi = { ad: "Nokta", durum: "hazır" }
yaz liste.son(sayilar)
yaz metin.degistir("akış hazır", "hazır", "tamam")
yaz sayi.sinirla(120, 0, 100)
yaz kayit.anahtarlar(bilgi)`);

    expect(result.ok).toBe(true);
    expect(result.entries.map((entry) => entry.text)).toEqual(["12", "akış tamam", "100", "[ad, durum]"]);
  });

  it("CSV verisini tabloya çevirir, filtreler, sıralar ve önizler", () => {
    const result = runNokta(`veri = csv.coz("ad,tutar,durum\\nAda,1200,tamam\\nEfe,700,bekliyor\\nLale,2400,tamam")
tamamlanan = tablo.filtrele(veri, "durum", "==", "tamam")
sirali = tablo.sirala(tamamlanan, "tutar", "azalan")
tablo.onizle(sirali, "Satışlar")
yaz tablo.topla(sirali, "tutar")
yaz csv.yaz(tablo.sec(sirali, ["ad", "tutar"]))`);

    expect(result.ok).toBe(true);
    expect(result.previews[0]).toMatchObject({ title: "Satışlar", columns: ["ad", "tutar", "durum"] });
    expect(result.previews[0].rows[0].ad).toBe("Lale");
    expect(result.entries.map((entry) => entry.text)).toContain("3600");
    expect(result.entries.at(-1)?.text).toBe("ad,tutar\nLale,2400\nAda,1200");
  });

  it("JSON verisini çözer, gruplar ve JSON olarak dışa aktarır", () => {
    const result = runNokta(`veri = json.coz('[{"ad":"Ada","grup":"A"},{"ad":"Efe","grup":"B"},{"ad":"Lale","grup":"A"}]')
gruplar = tablo.grupla(veri, "grup")
yaz kayit.anahtarlar(gruplar)
yaz json.yaz(gruplar)`);

    expect(result.ok).toBe(true);
    expect(result.entries[0].text).toBe("[A, B]");
    expect(result.entries[1].text).toContain('"Lale"');
  });

  it("tarayıcıya yüklenmiş CSV veri kümesini veri.al ile bağlar", () => {
    const result = runNokta("satislar = veri.al(\"subat.csv\")\ntablo.onizle(satislar, \"Şubat satışları\")\nyaz tablo.topla(satislar, \"tutar\")", {
      datasets: {
        "subat.csv": { name: "subat.csv", format: "csv", content: "sehir,tutar\nAnkara,900\nİzmir,1200" },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.previews[0].title).toBe("Şubat satışları");
    expect(result.entries.map((entry) => entry.text)).toContain("2100");
  });

  it("eksik veri kümesi için kod ve onarım önerisi içeren tanı üretir", () => {
    const result = runNokta("veri.al(\"yok.csv\")");
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ code: "NOKTA_201" });
    expect(result.diagnostics[0].suggestion).toContain("CSV veya JSON");
  });

  it("büyük listeleri parçalar, sayfalar, benzersizleştirir ve tablo özetler", () => {
    const result = runNokta("sayilar = [4, 8, 4, 12, 16, 20]\nessiz = liste.essiz(sayilar)\nparcalar = liste.parcala(essiz, 2)\nsayfa = liste.sayfala(essiz, 2, 2)\nsatislar = [{ bolge: \"A\", tutar: 1200 }, { bolge: \"B\", tutar: 700 }, { bolge: \"C\", tutar: 1800 }]\nozet = tablo.ozet(satislar, \"tutar\")\nyaz liste.uzunluk(parcalar)\nyaz sayfa.toplam_oge\nyaz ozet.en_buyuk");

    expect(result.ok).toBe(true);
    expect(result.entries.map((entry) => entry.text)).toEqual(["3", "5", "1800"]);
  });

  it("dosya eylemini yalnızca açık izinle yerel yardımcı planı olarak kaydeder", () => {
    const result = runNokta("izin dosya \"Raporlar/\"\ndosya.oku(\"Raporlar/satislar.csv\")");
    expect(result.ok).toBe(true);
    expect(result.entries.some((entry) => entry.text.includes("dosya okuma planlandı"))).toBe(true);
  });
});
