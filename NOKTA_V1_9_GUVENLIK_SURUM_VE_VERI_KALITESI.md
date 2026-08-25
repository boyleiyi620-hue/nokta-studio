# Nokta v1.9 — Güvenlik, Sürüm Farkı ve Veri Kalitesi

Nokta Studio v1.9, paket güvenliği ile geliştirme akışını birbirine bağlar. Bir kullanıcının kilitlediği sürüm açık güvenlik uyarısından etkileniyorsa, paket inceleme föyü etkilenen uyarıları, yayıncının giderme notunu ve aynı sürüm aralığındaki en yeni güvenli adayı gösterir. Kullanıcı, önerilen sürümü **tek tıklamayla** seçtiğinde kilit kaydı güncellenir ve işlem izin ayrıntılarıyla denetim günlüğüne yazılır.

## Güvenlik çözüm akışı

Güvenlik güncellemesi rastgele en yeni sürümü seçmez. Sistem, kullanıcının istek aralığını korur; yayımlanan sürümleri en yeniden eskiye inceler ve açık uyarı aralığına girmeyen ilk uyumlu sürümü önerir. Uyumlu ve güvenli bir sürüm yoksa güncelleme düğmesi gösterilmez; yayıncının giderme notu korunur.

| Adım | Davranış | Kayıt |
|---|---|---|
| Uyarıyı algılama | Kilitli sürümün açık uyarı aralığıyla eşleşmesi denetlenir. | Paket sağlık verisi |
| Çözüm önerme | Uyumlu, açık uyarıdan etkilenmeyen en yeni sürüm bulunur. | İnceleme föyü |
| Güvenli güncelleme | Kullanıcının açık eylemiyle sürüm kilidi değiştirilir. | `security_update` olayı |
| Denetim | Kaynak/hedef sürüm, bütünlük kimliği ve izin kapsamı saklanır. | İşlem günlüğü |

> Güvenlik güncellemesi, paket kaynağını arka planda çalıştırmaz. Bu sürüm yalnızca paket yönetim kaydını ve kilitli sürümü günceller.

## Sürüm farkı inceleme föyü

Her paket ayrıntısındaki **Sürümleri karşılaştır** bağlantısı iki yayımlanmış sürümü seçilebilir hale getirir. Karşılaştırma, kaynak metni satırlarını yan yana sunar; eklenen satırlar yeşil, kaldırılan satırlar kırmızı, değiştirilen satırlar ise önce/sonra yüzeyleriyle işaretlenir. Aynı sayfa bağımlılık aralıklarındaki ve dışa aktarılan işlevlerdeki değişimleri de gösterir.

| Katman | Karşılaştırılan veri |
|---|---|
| Kaynak | İki sürümün Nokta kaynak satırları |
| Bağımlılık | Paket adı ile istenen sürüm aralığı |
| Dışa aktarım | Paketin yayımladığı işlev/alan yüzeyi |
| Bütünlük | Her sürümün SHA-256 bütünlük kimliği |

## İzinli işlem günlüğü

`/paketler/gecmis` rotası kullanıcının kendi paket işlemlerini gösterir. Günlük; kurulum, normal güncelleme, güvenlik güncellemesi ve indirme isteği olaylarını birbirinden ayırır. İndirme isteği, kullanıcının paketin indirilebilir sürümüne yönelik açık talebinin denetim kaydıdır; bu prototip sürümünde sunucudan ikili paket arşivi indirilmez.

| Günlük alanı | Açıklama |
|---|---|
| İşlem türü | `install`, `manual_update`, `security_update` veya `download_intent` |
| Kaynak/hedef sürüm | Kilit değişiminden önceki ve sonraki sürüm |
| İzin kapsamı | `paket.kurulum` eylemi, kayıt/paket kimliği ve kullanıcı etkileşimi onayı |
| Bütünlük | Hedef sürümün kaydedilmiş bütünlük kimliği |

## Nokta dilinde veri kalite kapısı

Nokta diline iki tablo yardımcısı eklendi. `tablo.donustur`, bir alanı `sayi`, `metin`, `mantik` veya `trim` türüne dönüştürür. `tablo.dogrula`, her alan için zorunluluk, tip, sayısal alt/üst sınır ve en az metin uzunluğu denetimini yapar. Hatalar ilk sorunla durmak yerine tek bir raporda toplanır.

```nokta
ham = [{ ad: " Ada ", puan: "92" }, { ad: "", puan: "140" }]
temiz = tablo.donustur(ham, "ad", "trim")
sayisal = tablo.donustur(temiz, "puan", "sayi")

kurallar = {
  ad: { zorunlu: dogru, tip: "metin", min_uzunluk: 2 },
  puan: { zorunlu: dogru, tip: "sayi", min: 0, max: 100 }
}

denetim = tablo.dogrula(sayisal, kurallar)
yaz denetim.hata_sayisi
```

Bu örnekte `denetim`, `gecerli`, `satir_sayisi`, `hata_sayisi` ve her hata için `satir`, `alan`, `deger`, `neden` alanlarını taşır. Mantıksal sabitler Nokta’nın Türkçe-öncelikli sözleşmesine göre `dogru` ve `yanlis` biçiminde yazılır.
