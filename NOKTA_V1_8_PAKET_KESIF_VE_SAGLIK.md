# Nokta v1.8 — Paket Keşfi ve Sağlık Görünürlüğü

Nokta Studio v1.8, kayıt merkezindeki paket keşfini hızlandırır ve kurulu bağımlılıkların güncelleme ya da güvenlik durumunu görünür hale getirir. Tüm sağlık işaretleri, paket yayıncısının kayıt merkezinde oluşturduğu uyarılardan ve kullanıcının kendi kilitli kurulumlarından üretilir; örnek veya tahmini uyarı verisi kullanılmaz.

## Gelişmiş katalog keşfi

Paket kataloğundaki arama alanı; paket adı, kısa açıklama, kayıt adı ve kayıt kimliği üzerinde çalışır. Aynı yüzey, birden fazla filtre ve sıralama seçeneğini birlikte uygular.

| Denetim | İşlevi |
|---|---|
| Metin araması | Paket, kayıt veya açıklama içindeki metni eşleştirir. |
| Kayıt filtresi | Sadece seçilen özel veya kurumsal kaydın paketlerini gösterir. |
| Sağlık filtresi | Açık uyarısı olan paketleri ya da belirli önem düzeyini öne çıkarır. |
| Kurulum filtresi | Kurulu, kurulu olmayan veya güncelleme bekleyen paketleri ayırır. |
| Sıralama | Güncellik, ad, uyarı önceliği veya kurulum durumuna göre sıralar. |

## Sağlık rozetleri ve bağımlılık grafiği

Bir paket için açık uyarı kaydı varsa katalogta renkli bir önem rozeti görünür. **Düşük**, **orta**, **yüksek** ve **kritik** düzeyleri, yalnızca yayıncının bildirdiği etkilenen SemVer aralığı kullanıcının kilitli sürümünü kapsadığında bağımlılık grafiğine de yansır. Güncelleme bekleyen düğümler yeşil yukarı okla; güvenlik etkisi bulunan düğümler ise ünlem işaretiyle belirtilir.

> Sağlık işareti, bağımlılık grafiğinde gerçek kilitli sürüm için hesaplanır. Paket yalnızca daha yeni sürümünde etkileniyorsa eski, etkilenmeyen kilitli kurulum uyarı almaz.

## Paket inceleme föyü

Katalogtaki **İncele** bağlantısı, erişim denetimli `/paketler/:packageId` sayfasını açar. Sayfa paketin README belgesini, sürüm geçmişini, sürüm notlarını, bütünlük kimliklerini, dışa aktarımlarını, bağımlılıklarını ve gerçek kurulum sayısını bir inceleme föyünde toplar.

| Alan | Veri kaynağı | Anlamı |
|---|---|---|
| Aktif kurulum | Kalıcı kurulum kayıtları | Paketin erişilebilir kayıtlarda kaç kez kilitlendiği |
| Güncelleme bekliyor | Kurulum güncelleme işareti | Uyumlu yeni sürüm için kullanıcı aksiyonu bekleyen kurulumlar |
| Sürüm geçmişi | Değiştirilemez yayın kayıtları | Yayımlanan sürüm, sürüm notu ve bütünlük kimliği |
| Açık uyarı | Güvenlik uyarısı kayıtları | Çözülmemiş, yayımlanmış sağlık bildirimleri |

## Güvenlik bildirimi yetkisi

Kayıt sahibi ve yayıncı, paket inceleme sayfasından bir sağlık bildirimi ekleyebilir. Bildirim; etkilenen sürüm aralığı, önem seviyesi, kısa açıklama ve giderme önerisi içerir. Okuyucular bildirimi inceleyebilir ancak oluşturamaz. Bu sürümde bildirimin çözülmesi için arayüz eklenmemiştir; açık uyarılar değiştirilemez denetim kaydı olarak kalır.

## Çalıştırma sınırı

Kayıt merkezindeki README, sürüm geçmişi ve uyarılar paket yönetimi bilgisidir. Kurumsal paket kaynakları v1.8’de otomatik olarak Nokta yorumlayıcısında yürütülmez. Yürütme, v1.6’daki güvenilir yerleşik katalog ile sınırlıdır; haricî paket çalıştırma için ayrı izin ve imza doğrulama katmanı gerekir.
