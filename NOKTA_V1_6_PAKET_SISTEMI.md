# Nokta v1.6 Paketleme ve Kütüphane Yönetimi

Nokta paketi, yeniden kullanılabilir modülleri ve bağımlılık bildirimlerini tek bir proje sözleşmesinde toplar. Her proje kökünde `nokta.paket.json` bulunur. Dosya; paketin adını, sürümünü, giriş dosyasını, bağımlılık sürüm aralıklarını ve talep edilen izinleri bildirir.

| Alan | Amaç | Örnek |
|---|---|---|
| `ad` | Paket için benzersiz, küçük harfli kimlik | `nokta-veri-atolyesi` |
| `surum` | Paketin yayımlanmış sürümü | `1.6.0` |
| `giris` | Çalıştırılacak ana Nokta dosyası | `akis.nokta` |
| `bagimliliklar` | İstenen kütüphane ve sürüm aralığı | `istatistik: ^1.2.0` |
| `izinler` | Paket düzeyindeki en dar yetki bildirimi | `veri:yerel` |

Nokta kodunda `kullan` sözdizimi, yalnızca güvenilir kayıt içinde bulunan bir paketi çözer. Sürüm aralığı kayıttaki sürümle uyuşmazsa çalışma başlamadan açıklayıcı tanı üretilir. Paketler varsayılan olarak ağ, dosya sistemi veya uygulama yetkisi almaz; bu yetkiler ayrıca proje ve yürütme izinleriyle istenir.

```nokta
kullan "istatistik@^1.2" olarak istatistik
kullan "metin-araclari@~1.1" olarak metin

ortanca = istatistik.medyan([12, 19, 24, 31, 42])
etiket = metin.baslik("nokta paket sistemi")
yaz etiket + ": " + ortanca
```

Bu prototipte kütüphaneler IDE içine gömülü güvenilir bir kayıtla çözülür. `nokta.kilit.json`, iki yerleşik paketin çözülen sürümünü ve uygulama düzeyindeki bütünlük etiketini taşır. Çalıştırıcı; bildirilmemiş paketi, uyumsuz sürüm aralığını, eksik kilit kaydını veya farklı dışa aktarma yüzeyini reddeder. Sonraki yayın katmanı; imzalı paket arşivi, paket kaynağının kriptografik doğrulaması, çevrimdışı önbellek ve özel kurum kaydı eklemelidir.
