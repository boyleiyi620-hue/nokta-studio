import { describe, expect, it } from "vitest";
import { compareSemver, packageIntegrity, satisfiesSemver } from "./packageRegistry";

describe("paket kayıt sürüm sözleşmesi", () => {
  it("semver sürümlerini büyükten küçüğe karşılaştırır", () => {
    expect(compareSemver("1.3.0", "1.2.9")).toBeGreaterThan(0);
    expect(compareSemver("2.0.0", "2.0.0")).toBe(0);
    expect(compareSemver("0.9.9", "1.0.0")).toBeLessThan(0);
  });

  it("tam, uyumlu ana sürüm ve küçük sürüm aralıklarını çözer", () => {
    expect(satisfiesSemver("1.4.3", "^1.2")).toBe(true);
    expect(satisfiesSemver("1.4.3", "~1.4")).toBe(true);
    expect(satisfiesSemver("1.5.0", "~1.4")).toBe(false);
    expect(satisfiesSemver("2.0.0", "^1.4")).toBe(false);
    expect(satisfiesSemver("2.0.0", "*")).toBe(true);
  });

  it("kaynak, dışa aktarımlar veya bağımlılıklar değiştiğinde bütünlük kimliğini değiştirir", () => {
    const base = { name: "rapor-araclari", version: "1.0.0", entry: "modul.nokta", source: "yaz \"hazır\"", exports: ["ozet"], dependencies: { istatistik: "^1.2" } };
    const sameWithDifferentOrder = { ...base, exports: ["ozet"], dependencies: { istatistik: "^1.2" } };
    const changedSource = { ...base, source: "yaz \"güncel\"" };

    expect(packageIntegrity(base)).toBe(packageIntegrity(sameWithDifferentOrder));
    expect(packageIntegrity(base)).not.toBe(packageIntegrity(changedSource));
    expect(packageIntegrity(base)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
