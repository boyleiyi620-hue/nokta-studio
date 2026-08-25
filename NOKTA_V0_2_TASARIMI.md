# Nokta v0.2 — Güvenli Otomasyon Dili Tasarımı

**Durum:** Uygulanacak çekirdek sözleşme  
**Odak:** Python benzeri okunabilirlik; otomasyon için daha görünür, izinli ve izlenebilir çalışma modeli.

> Nokta'nın amacı Python’ın her kullanım alanında “daha iyi” olduğunu iddia etmek değildir. Bilimsel hesaplama, olgun ekosistem veya ham performans gibi alanlarda Python'ın güçlü yönleri vardır. Nokta, özellikle otomasyon akışlarında **niyet, yetki, zamanlama ve çalışma kaydını kaynak kodun birinci sınıf parçası** yaparak daha güvenli ve anlaşılır bir seçenek olmayı hedefler.

## 1. Tasarım tezi

Python, kısa ve okunabilir kod yazmayı kolaylaştırır; ancak dosya, ağ, uygulama açma veya arka plan işleri çoğunlukla ek paketlerin, çalışma ortamı ayarlarının ve görünmeyen zamanlayıcıların birleşiminden oluşur. Nokta v0.2, bu işlemleri saklamak yerine açık sözleşmelere dönüştürür. Bir otomasyon dosyasına bakan kişi; hangi uygulamaya niyet edildiğini, neyin dinleneceğini, ne zaman çalışacağını ve hangi adımın ne ürettiğini doğrudan görmelidir.

| İlke | Nokta v0.2 kararı | Otomasyondaki etkisi |
|---|---|---|
| Okunabilirlik | Girintili bloklar, kısa Türkçe anahtar sözcükler, az sayıda kavram | Kod iş akışı gibi okunur |
| Yetki | `izin` bildirimi olmadan uygulama/bildirim eylemi yok | Gizli yan etkiler engellenir |
| Zaman | `zamanla` birinci sınıf bloktur | Zamanlama kodda görünür kalır |
| Olay | `olay` dinleyicisi niyeti anlatır | Bildirim veya servis olayı bir iş akışına bağlanır |
| İz | `akis` ve `adim` yürütme kaydı üretir | Hata ve çıktı bağlamı kaybolmaz |
| Taşınabilirlik | Dil niyeti tanımlar, çalıştırıcı ortam eylemi sağlar | Aynı akış tarayıcı, yerel yardımcı veya sunucuya uyarlanabilir |

## 2. v0.2 çekirdek sözleşmesi

Nokta’nın çalışan prototipi aşağıdaki ifadeleri destekleyecektir. Bunlar, dilin ileride yerel uygulama yardımcısı veya sunucu çalıştırıcısı eklenince değişmeden kalacak kullanıcı sözleşmesidir.

```nokta
izin uygulama "Tarayıcı"
izin bildirim "Takvim"

zamanla "her iş günü 09:00":
  akis "Gün başlangıcı":
    adim "Takvimi izle":
      bildirim.izle("Takvim")

    adim "Uygulamayı hazırla":
      uygulama.ac("Tarayıcı")
      uyari.gonder("Gün başlangıcı akışı hazır.")

olay "bildirim:takvim":
  yaz "Yeni bir takvim olayı alındı."
```

Bu örnek IDE içinde **güvenli önizleme** olarak çalışır: izinler doğrulanır, zaman ve olay planı görünür olur, fakat tarayıcı rastgele bir masaüstü uygulamasını açmaya veya işletim sistemi bildirimlerini okumaya çalışmaz. Gerçek çalıştırıcı daha sonra kullanıcının onayladığı yerel yardımcıya veya yapılandırılmış servis bağlantısına atanır.

## 3. İzin modeli

`izin <alan> <hedef>` biçimi, otomasyonun dış dünyaya ilişkin niyetini bildirir. İlk alanlar `uygulama`, `bildirim`, `dosya` ve `ag` olacaktır. Bir komut gerekli izne sahip değilse yorumlayıcı işlemi durdurur ve hangi bildirimin eksik olduğunu satır numarasıyla açıklar.

| İzin | İlgili komut | v0.2 IDE davranışı | Sonraki gerçek çalıştırıcı davranışı |
|---|---|---|---|
| `izin uygulama "Tarayıcı"` | `uygulama.ac("Tarayıcı")` | Eylemi plan olarak kaydeder | Onaylı yerel yardımcı üzerinden uygulama başlatır |
| `izin bildirim "Takvim"` | `bildirim.izle("Takvim")` | Dinleyiciyi plan olarak kaydeder | Onaylı uygulama/API olayını dinler |
| `izin bildirim "Masaüstü"` | `uyari.gonder("…")` | Uyarıyı yürütme kaydına ekler | Kullanıcının seçtiği kanala teslim eder |
| `izin ag "api.ornek.com"` | Gelecek `http.al` komutu | Şimdilik sözleşme olarak kaydeder | Alan adı sınırını uygular |

## 4. Python benzerliği ve ayrışma

Nokta, Python’dan tanıdık gelen atama, fonksiyon, koşul, döngü, liste ve kayıt kavramlarını korur. Bununla birlikte, otomasyon için üç katmanlıdır: saf veri dönüşümü, görünür iş adımı ve izinli dış etki. Bu ayrım, programın “ne hesapladığını” ve “dış dünyada ne değiştirdiğini” birbirinden ayırır.

| Kavram | Python’da yaygın biçim | Nokta’daki yaklaşım |
|---|---|---|
| Veri dönüşümü | İşlevler ve koleksiyon işlemleri | Aynı sade ifade modeli; yerleşik `liste`, `metin`, `sayi` modülleri |
| İş akışı | Genellikle kullanıcı tarafından düzenlenir | `akis` ve `adim` ile yürütme kaydı otomatik oluşur |
| Zamanlama | Harici zamanlayıcı/paket | `zamanla` ile kaynakta tanımlı niyet |
| Olay dinleme | Kütüphane/çatı seçimine bağlı | `olay` ile dil düzeyinde niyet, çalıştırıcıyla bağlama |
| Dış etki | Kodda doğrudan çağrı | Önce açık `izin`, sonra komut |
| Hata bağlamı | Yığın izi odaklı | Satır, adım ve eksik izin odaklı hata iletisi |

## 5. v0.2’de uygulanan ve ertelenen sınırlar

Çalışan prototipte otomasyon komutları ve planlar gerçek işletim sistemi eylemi yerine simüle edilir. Bu, tarayıcı tabanlı IDE’nin güvenlik sınırıdır. Bir sonraki entegrasyon aşamasında, gerçek uygulama açma ve bildirim dinleme; kullanıcının cihazına kurulu ve açıkça yetkilendirilmiş bir yardımcı aracılığıyla yapılacaktır. Uzun süreli izleme ise kullanıcı tarafından seçilecek sunucu veya yerel cihaz çalışma ortamında yürür.

Bu sınır, dilin sözleşmesini zayıflatmaz. Aksine, kullanıcı kodunu önceden yazıp test edebilir; gerçek kaynaklar sağlandığında aynı `izin`, `zamanla`, `olay`, `uygulama` ve `bildirim` ifadeleri gerçek çalıştırıcıya güvenle bağlanır.
