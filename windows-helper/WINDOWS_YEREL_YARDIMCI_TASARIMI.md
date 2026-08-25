# Nokta Windows Yerel Yardımcı — Prototip Sözleşmesi

Bu prototip, Nokta IDE’de oluşturulan dosya planlarını Windows kullanıcısının bilgisayarında **dar kapsamlı** biçimde çalıştırır. Yardımcı, genel komut yürütme aracı değildir; yalnızca izinli kök klasör içinde CSV, JSON, Nokta ve metin dosyalarıyla sınırlı eylemleri kabul eder.

## Güvenlik sözleşmesi

| Konu | Prototip kuralı |
|---|---|
| Ağ dinleme noktası | Yalnızca `127.0.0.1` döngüsel adresi; dış ağ dinleme yok. |
| Kimlik doğrulama | Her çağrıda `X-Nokta-Token` başlığı; belirteç ilk başlatmada kullanıcı profilinde üretilir. |
| Yetkili klasör | Kullanıcı, ilk başlatmada tek bir kök klasör seçer; tüm yollar bu kökün içinde kalmalıdır. |
| Dosya türleri | `.csv`, `.json`, `.nokta`, `.txt`; uzantısı belirsiz dosya ve ikili dosya reddedilir. |
| Boyut sınırı | Okuma ve yazma varsayılan olarak 5 MB ile sınırlıdır. |
| Eylemler | `file.list`, `file.read`, `file.write`, `file.mkdir`; silme, taşıma, kabuk komutu ve rastgele program çalıştırma yoktur. |
| Plan süresi | Süresi geçmiş veya yinelenmiş plan yan etki oluşturmadan reddedilir. |
| Denetim | Her kabul/red kararı, içerik saklanmadan JSONL denetim kaydına yazılır. |

## IDE bağlantı sözleşmesi

Yerel yardımcı, prototipte `http://127.0.0.1:8417` üzerinde çalışır. Bu uç nokta yalnızca yerel geliştirme amaçlıdır. GitHub Pages üzerindeki HTTPS IDE ile üretim bağlantısı için sonraki aşamada `https://localhost` sertifikası veya tarayıcı-yerel uygulama köprüsü kullanılmalıdır; HTTPS sayfasından düz HTTP çağrısı tarayıcı güvenlik politikalarına takılabilir.

```text
GET  /v1/health
POST /v1/plans/execute
GET  /v1/audit/recent
```

`POST /v1/plans/execute`, aşağıdaki biçimde bir plan kabul eder:

```json
{
  "taskId": "task_001",
  "idempotencyKey": "benzersiz-anahtar",
  "expiresAt": "2026-08-25T10:00:00Z",
  "actions": [
    { "type": "file.read", "path": "girdi/satislar.csv", "maxBytes": 1048576 }
  ]
}
```

Yardımcı her eylem için bir makbuz döndürür. Makbuzda dosya içeriği yalnızca `file.read` çağrısının istemcide işlenmesi amacıyla yer alır; denetim günlüğüne dosya içeriği yazılmaz.

## Nokta dil uzantısı

Nokta v0.5’te dosya erişimi iki adımlıdır. Önce izin, ardından planlanmış eylem yazılır.

```nokta
izin dosya "Raporlar/"
veri = dosya.oku("girdi/satislar.csv")
tablo = csv.coz(veri)
tablo.onizle(tablo, "Yerel satışlar")
```

IDE önizleme modunda `dosya.oku` gerçek dosyaya erişmez; açıkça **yerel yardımcı gerekli** planı üretir. Yardımcı bağlantısı etkin ve izin eşleşmişse aynı plan çalıştırılabilir. Bu ayrım, kod yazarken beklenmeyen yerel dosya erişimini önler.
