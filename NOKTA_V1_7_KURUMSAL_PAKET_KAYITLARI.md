# Nokta v1.7 — Özel ve Kurumsal Paket Kayıtları

Nokta Studio v1.7, paketleri yalnızca tarayıcıdaki yerleşik katalog olarak değil, kullanıcı hesabına bağlı **özel** veya **kurumsal** kayıt alanlarında yönetir. Paket kayıt merkezi, Studio içindeki **Paketler → Kayıt merkezini aç** bağlantısından açılır. Kayıt ve yayınlama işlemleri oturum açmış kullanıcılar için erişilebilir; paket kaynak metni, sürüm bilgisi, dışa aktarımları ve bağımlılıkları kalıcı olarak saklanır.

## Erişim modeli

| Rol | Kayıt görünürlüğü | Paket okuma/kurma | Sürüm yayımlama | Üye yetkisi verme |
|---|---|---:|---:|---:|
| Sahip | Sahibi olduğu kayıt | Evet | Evet | Evet |
| Yayıncı | Atandığı kurumsal kayıt | Evet | Evet | Hayır |
| Okuyucu | Atandığı kurumsal kayıt | Evet | Hayır | Hayır |

> **Özel kayıt** yalnızca sahibine açıktır. **Kurumsal kayıt**, sahibin eklediği okuyucu ve yayıncılara açılır. Bir kullanıcı eklenmeden önce en az bir kez Nokta Studio’ya giriş yapmış olmalıdır.

## Kayıt oluşturma ve üyeler

Kayıt kimliği küçük harf, sayı ve tire kullanır; örneğin `finans-ekibi`. Sahip, kayıt oluşturulduğunda otomatik olarak sahibi olur. Kurumsal kayıtta sahip, kullanıcı açık kimliği ile ekip üyesine **okuyucu** veya **yayıncı** yetkisi verir. Yetki değiştirildiğinde aynı üyelik güncellenir.

## Paket yayımlama sözleşmesi

Paket yayınlama alanında paket adı, `MAJOR.MINOR.PATCH` sürümü, giriş dosyası, kaynak, dışa aktarılan işlevler ve bağımlılıklar yazılır. Bağımlılıklar her satırda `paket@aralık` biçimindedir:

```text
istatistik@^1.2
metin-araclari@~1.1
```

Her sürüm değiştirilemez. Yeni sürüm numarası mevcut en güncel sürümden büyük olmalıdır. Studio, aşağıdaki yüzeyin sabit sıralı temsili üzerinden bir **SHA-256 bütünlük kimliği** üretir:

| Dahil edilen alan | Amaç |
|---|---|
| Paket adı ve sürümü | Kimlik ve sürüm tutarlılığı |
| Giriş dosyası ve kaynak | Çalıştırılacak içerik yüzeyi |
| Dışa aktarımlar | Paket API’si |
| Bağımlılıklar | Çözümleme grafiği |

Bu sürümde paket kaynağı kayıt ve denetim yüzeyi olarak saklanır. Tarayıcı yorumlayıcısının yalnızca v1.6 güvenilir yerleşik kayıtla çalıştığı korunur; uzak veya kurumsal paketleri Nokta çalışma alanında otomatik yürütme sonraki, ayrı bir güvenlik aşamasıdır.

## Kurulum, güncelleme ve grafik

Kullanıcı erişebildiği yayımlanmış paketi bir SemVer aralığı ile kurar. Kurulum, seçilen sürümü kilitler. Yayıncı aynı aralığı karşılayan daha yeni bir sürüm yayımladığında sistem kurulum kaydını **güncelleme var** olarak işaretler ve kullanıcı için bir bildirim üretir. Güncelleme, kullanıcı **Güncelle** eylemini açıkça seçene kadar uygulanmaz.

Bağımlılık grafiği, yalnızca kullanıcının kurduğu ve kilitlediği paket sürümlerinden oluşturulur. Bir bağımlılık bildirilmiş ama çalışma alanına kurulmamışsa grafikte kesik uç olarak belirtilir; bu davranış kurulu gerçeklik ile bildirilen ihtiyaç arasındaki farkı görünür kılar.

## Güvenlik sınırları

Kurumsal paket kaydı bir kod yürütme hizmeti değildir. Yayınlama yetkisi, kayıt üyeliği üzerinden sunucuda kontrol edilir. Paket kaynak metni oturum açmamış ziyaretçilere sunulmaz; paketi görüntüleme ve kurma işlemleri de kayıt erişim denetiminden geçer. Bu sürüm, paket sürümlerini geriye dönük değiştirme veya silme arayüzü sağlamaz.
