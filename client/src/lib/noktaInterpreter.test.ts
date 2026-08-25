/** Nokta Studio — yorumlayıcı davranış sözleşmeleri. */
import { describe, expect, it } from "vitest";
import { NOKTA_EXAMPLES, runNokta } from "./noktaInterpreter";

describe("Nokta v0.1 yorumlayıcısı", () => {
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
});
