# Nokta Studio ve Nokta v0.1 Kullanım–Kod Rehberi

**Durum:** Çalışan tarayıcı tabanlı prototip, v0.2  
**Amaç:** Nokta ile kod yazmak, çalıştırmak ve kaynak dosyalarının ne yaptığını anlamak.

> Nokta v0.1, veri ve iş otomasyonunu öğrenilebilir akışlara dönüştürmeyi hedefleyen Türkçe-öncelikli bir dildir. Bu projedeki IDE ve yorumlayıcı, tarayıcıda çalışır; çalıştırılan kod kullanıcının dosya sistemine veya ağına erişmez.

## 1. IDE’yi kullanma

Nokta Studio açıldığında ortadaki koyu panel kaynak kod düzenleyicisidir. Soldaki **Örnekler** alanından çalışan programları seçebilir, kodu değiştirebilir ve sağ üstteki **Çalıştır** düğmesiyle veya `Ctrl/⌘ + Enter` kısayoluyla programı çalıştırabilirsiniz. Sağdaki **Yürütme Kaydı**; akışların, adımların, çıktının ve hataların görünür izini sunar. Bir hata kaydına tıklamak, ilgili satırı düzenleyicide işaretler.

| Alan | Ne işe yarar? |
|---|---|
| Sol kenar çubuğu | Açık dosyayı ve hazır Nokta örneklerini seçtirir. |
| Kod düzenleyicisi | Nokta v0.1 kaynak kodunun yazıldığı alandır. |
| Çalıştır | Mevcut kodu yorumlayıcıya verir ve yürütme kaydını yeniler. |
| Yürütme Kaydı | `akis`, `adim`, `yaz` ve hata sonuçlarını sıralı biçimde gösterir. |
| Dil Kartları | Sık kullanılan sözdizimini açıklar; **Tüm sözdizimi** ayrıntılı kısa kartları açar. |

## 2. Nokta v0.1 ile yazılabilen kodlar

Nokta blokları süslü parantezle değil, **girintiyle** tanımlar. Bir bloktan sonra iki boşlukla içeri girin. Sekme karakteri kullanmayın.

### Değişken ve çıktı

```nokta
isim = "Dünya"
mesaj = "Merhaba, " + isim + "!"
yaz mesaj
```

`=` bir değeri isimle saklar. `yaz`, değeri sağdaki yürütme kaydına ekler. Metinler çift veya tek tırnak içinde yazılabilir. Sayılar, `dogru`, `yanlis`, `bos`, listeler ve kayıtlar da değer olabilir.

### Liste ve kayıt

```nokta
notlar = [82, 91, 67]
ogrenci = { ad: "Ada", puan: 91 }

yaz liste.ortalama(notlar)
yaz ogrenci.ad
```

Köşeli parantez bir liste oluşturur. Süslü parantez, ad–değer çiftlerinden oluşan bir kayıt oluşturur. Kayıt alanına nokta ile erişilir. Kullanılabilir liste yardımcıları `liste.uzunluk`, `liste.toplam`, `liste.ortalama`, `liste.ters_cevir` ve `liste.sirala`dır.

### Koşul

```nokta
eger puan >= 80:
  yaz "Başarılı"
degilse:
  yaz "Tekrar dene"
```

`eger` bir koşulu sınar. Doğruysa ilk girintili blok, değilse `degilse` bloğu çalışır. Karşılaştırmalarda `==`, `!=`, `>`, `>=`, `<` ve `<=`; mantıkta `ve`, `veya`, `degil` kullanılabilir.

### Döngü

```nokta
her not icin notlar:
  yaz not
```

`her … icin …` ifadesi bir listenin her değeri için iç bloğu çalıştırır. Bu sürümde döngüler liste üzerinde çalışır ve güvenlik için yürütme adımı sınırına sahiptir.

### İşlev

```nokta
islev iki_kat(sayi):
  dondur sayi * 2

yaz iki_kat(12)
```

`islev`, tekrar kullanılan bir işlem tanımlar. `dondur` sonucu çağıran ifadeye gönderir. `dur` ise mevcut işlevi veya en üst akışı kontrollü olarak sonlandırır.

### Akış ve adım

```nokta
akis "Günlük satış özeti":
  adim "Siparişleri say":
    tamamlanan = 3

  adim "Raporu göster":
    yaz "Tamamlanan: " + tamamlanan
```

`akis`, bir iş sürecinin başlığını; `adim`, sürecin görünür bir bölümünü tanımlar. Nokta Studio bu başlıkları yürütme kaydına otomatik olarak ekler. Böylece kodun sadece sonucu değil, izlediği yol da görünür olur.

## 3. Hazır örneklerin amacı

| Örnek | Gösterdiği kavramlar | Beklenen sonuç |
|---|---|---|
| İlk Nokta | Değişken, metin birleştirme, `yaz` | İki selamlama satırı |
| Hesap ve işlev | `islev`, `eger`, `dondur`, matematik | İndirimli fiyat |
| Liste akışı | Liste, `her`, koşul, `liste` modülü | Ortalama ve öne çıkan not |
| Satış özeti | `akis`, `adim`, kayıt alanı, döngü | Tamamlanan sipariş sayısı ve ciro |

Satış özeti örneğindeki `ornek_satislar`, yorumlayıcının yalnızca eğitim amaçlı sağladığı hazır listedir. Gerçek dosya/HTTP erişimi bu web prototipinin dışında tutulmuştur; bu bilinçli sınır, kodu güvenli ve tamamen tarayıcı içinde çalışır hâlde tutar.

## 4. Projedeki kodlar ne işe yarıyor?

| Dosya | Sorumluluk | Önemli parçalar |
|---|---|---|
| `client/src/lib/noktaInterpreter.ts` | Nokta dilinin tamamıyla tarayıcıda çalışan çekirdeği | `Lexer`, `ExpressionParser`, `ProgramParser`, `Runtime`, `runNokta` |
| `client/src/lib/noktaInterpreter.test.ts` | Dil davranışını doğrulayan otomatik testler | Örnekler, Türkçe adlar, akış, hata testi |
| `client/src/pages/Home.tsx` | IDE arayüzü ve kullanıcı etkileşimleri | Kod düzenleme, örnek seçme, çalıştırma, hata satırına gitme |
| `client/src/index.css` | Atölye Defteri tasarım sistemi | Kâğıt/mürekkep renkleri, responsive düzen, erişilebilir odak stili |
| `client/index.html` | Sayfanın HTML kabuğu ve yazı tipleri | Türkçe belge dili, sayfa başlığı, DM Serif Display / Manrope / IBM Plex Mono |
| `ideas.md` | Tasarım kararlarının sözleşmesi | Atölye Defteri yaklaşımı, marka ve etkileşim ilkeleri |

### `noktaInterpreter.ts` içindeki temel bölümler

`Lexer`, yazılan ifadeyi küçük parçalara ayırır. Örneğin `puan >= 80` metni; `puan`, `>=` ve `80` parçalarına dönüşür. `ExpressionParser`, bu parçaları matematiksel ve mantıksal önceliklere uyarak anlamlı bir ifade ağacına çevirir.

`ProgramParser`, satır girintisini okuyarak `eger`, `her`, `akis`, `adim` ve `islev` bloklarını oluşturur. Böylece Nokta’nın girintili yapısı doğrudan programın yapısına dönüşür.

`Runtime`, oluşan program yapısını yürütür. Değişkenleri `Environment` içinde tutar; `yaz` ile çıktı üretir; `akis` ve `adim` başlıklarını izleme kaydına ekler. Ayrıca 12.000 yürütme adımında programı durduran bir güvenlik sınırı uygular.

`runNokta`, IDE’nin çağırdığı tek ana fonksiyondur. Kaynak metni alır, ayrıştırır, çalıştırır ve arayüzün kullanacağı `ok`, `entries` ve `duration` verisini döndürür.

## 5. Teknik olarak çalıştırma ve denetleme

Proje kökünde aşağıdaki komutlar kullanılabilir.

```bash
pnpm dev       # Yerel geliştirme sunucusu
pnpm check     # TypeScript tür denetimi
pnpm exec vitest run  # Yorumlayıcı testleri
pnpm build     # Üretim derlemesi
```

## 6. Bu sürümün sınırları ve sonraki genişletmeler

Nokta v0.1, bilinçli olarak küçük bir dildir. Sınıflar, paketler, dosya sistemi erişimi, HTTP, tablo/CSV okuyucu, tür sözleşmeleri ve kalıcı proje dosyaları henüz bu çalışan prototipe dahil değildir. Bir sonraki sürümde öncelik sırası; satır içi sözdizimi renklendirmesi, gerçek dosya içe aktarma için kullanıcı onaylı tarayıcı arayüzü, kayıt/tablo işlemleri ve tasarım belgesindeki izin modelidir.

Bu kapsam, Nokta’nın mevcut prototipinin kullanılamaz olduğu anlamına gelmez. Şu anki sürüm; dilin okunabilirlik, girinti, akış, hata açıklama ve Türkçe-öncelikli sözdizimi kararlarını gerçek kod çalıştırarak doğrulamak için tasarlanmıştır.

## 7. v0.2 — İzinli otomasyon, zamanlama ve olaylar

Nokta v0.2, Python benzeri kısa ifadeleri korurken otomasyon niyetini açık hâle getirir. `izin` dış eylemin hangi hedefe yönelik olduğunu bildirir; `zamanla` periyodik işi kaynak kodda görünür kılar; `olay` ise ileride gerçek bildirime veya API olayına bağlanabilecek bir dinleyici tanımlar. Bu sürümde bunların tamamı **güvenli önizleme** olarak yürütülür: IDE planı ve çalışma kaydını üretir, ancak bilgisayarında uygulama başlatmaz veya bildirimlerini okumaz.

```nokta
izin uygulama "Tarayıcı"
izin bildirim "Takvim"

zamanla "Her iş günü 09:00":
  akis "Gün başlangıcı":
    bildirim.izle("Takvim")
    uygulama.ac("Tarayıcı")
    uyari.gonder("Akış hazır.")

olay "bildirim:takvim":
  yaz "Takvim olayı bekleniyor."
```

Yukarıdaki kodda ilk iki satır çalıştırıcının yapabileceği dış eylemleri sınırlar. `zamanla` bloğu bir zamanlama planı üretir; içindeki `akis`, işlem kaydını gruplar. `bildirim.izle`, izleme niyetini; `uygulama.ac`, uygulama başlatma niyetini; `uyari.gonder` ise seçilecek kanala gönderilecek bildirimi planlar. `olay` bloğu tanımlandığında gerçek olay geldiğinde çalışacak akışın sözleşmesini saklar.

| Yeni yapı | Ne işe yarar? | IDE’deki sonucu |
|---|---|---|
| `izin` | Dış eylemi hedefe bağlı olarak yetkilendirir | İzin kaydı oluşturur; eksik izni hata olarak gösterir |
| `zamanla` | Bir akışı zaman ifadesiyle planlar | Zamanlama kartı ve güvenli önizleme oluşturur |
| `olay` | Bildirim veya servis olayını dinlemek için sözleşme tanımlar | Olay dinleyicisi kartı oluşturur |
| `uygulama.ac` / `kapat` | Onaylı bir uygulama eylemini tanımlar | Eylemi planlar; gerçek çalıştırıcıya devretmek üzere kaydeder |
| `bildirim.izle` / `uyari.gonder` | Bildirim kaynağını ve uyarıyı tanımlar | İzleme ve uyarı planını yürütme kaydında gösterir |

Koleksiyon ve veri işlemleri de genişletildi. `liste.ekle`, `liste.ilk`, `liste.son`, `liste.icerir_mi`, `metin.icerir_mi`, `metin.degistir`, `metin.bol`, `sayi.sinirla`, `kayit.anahtarlar` ve `kayit.degerler` doğrudan kullanılabilir. Bunlar, dış otomasyona bağlanmadan önce veriyi hazırlamak için temel araç setini sağlar.

## 8. v0.3 — CSV, JSON ve tablo işlemleri

Nokta v0.3, satır satır veri dönüştürme yerine günlük veri işlerinde doğrudan kullanılabilen bir tablo modeli ekler. `csv.coz` başlıklı CSV metnini kayıtlardan oluşan bir listeye; `json.coz` JSON metnini Nokta listesi veya kaydına dönüştürür. `tablo` modülü ile bu veri filtrelenir, seçilir, sıralanır, gruplanır, toplanır ve IDE içinde örnek satırlarıyla önizlenir. `csv.yaz` ile kayıt listesi CSV’ye, `json.yaz` ile herhangi bir Nokta değeri okunabilir JSON’a dışa aktarılır.

```nokta
ham_csv = "sehir,tutar,durum\\nAnkara,1200,tamam\\nİzmir,850,bekliyor\\nİstanbul,2400,tamam"
satislar = csv.coz(ham_csv)
tamamlanan = tablo.filtrele(satislar, "durum", "==", "tamam")
sirali = tablo.sirala(tamamlanan, "tutar", "azalan")

tablo.onizle(sirali, "Tamamlanan siparişler")
yaz "Toplam ciro: " + tablo.topla(sirali, "tutar")
yaz csv.yaz(tablo.sec(sirali, ["sehir", "tutar"]))
```

Bu örnek, CSV verisini çözer; yalnızca `tamam` durumundaki satırları seçer; tutara göre büyükten küçüğe sıralar ve IDE’nin sağ panelinde ilk satırları tablolandırır. Son iki satır toplamı hesaplar ve yalnızca seçili sütunlarla yeni bir CSV çıktısı üretir. CSV çözücü; çift tırnak, satır sonu, başlık tekrarı ve hücre sayısı hatalarını denetler. Sayı biçimindeki hücreler otomatik olarak sayıya dönüştürülür.

| Yapı | Görevi | Örnek |
|---|---|---|
| `csv.coz` / `csv.yaz` | CSV metnini tabloya çevirir veya tabloyu CSV metni olarak üretir | `csv.coz(ham_csv)` |
| `json.coz` / `json.yaz` | JSON’u Nokta değerine çevirir veya okunabilir JSON üretir | `json.yaz(gruplar)` |
| `tablo.filtrele` | Sütuna göre karşılaştırmalı seçim yapar | `tablo.filtrele(veri, "puan", ">=", 80)` |
| `tablo.sec` | Sadece gerekli sütunları tutar | `tablo.sec(veri, ["ad", "puan"])` |
| `tablo.sirala` | Metin veya sayı sütununa göre sıralar | `tablo.sirala(veri, "puan", "azalan")` |
| `tablo.grupla` | Aynı sütun değerine sahip kayıtları bir kayıtta toplar | `tablo.grupla(veri, "sinif")` |
| `tablo.topla` / `ortalama` | Sayısal bir sütunun özetini hesaplar | `tablo.topla(veri, "tutar")` |
| `tablo.onizle` | IDE’ye satır ve sütun önizlemesi gönderir | `tablo.onizle(veri, "Rapor")` |

## 9. v0.4 — Yerel dosya, grafik ve onarım notları

Nokta v0.4’te sol taraftaki **Veri Kümeleri** rafından `.csv` veya `.json` dosyası yüklenebilir. Dosya tarayıcı içinde okunur; IDE bu dosyayı bir sunucuya göndermez. Yükleme sonrasında **Ekle** düğmesi, dosya adını kullanan `veri.al` başlangıç ifadesini editöre yerleştirir. Böylece gerçek dosyanın satırları, Nokta’nın mevcut `tablo` komutlarıyla işlenebilir.

```nokta
satirlar = veri.al("mart_satislari.csv")
tamamlanan = tablo.filtrele(satirlar, "durum", "==", "tamam")
tablo.onizle(tamamlanan, "Mart tamamlanan siparişler")
yaz "Ciro: " + tablo.topla(tamamlanan, "tutar")
```

`veri.al`, dosya uzantısına göre CSV veya JSON çözümlemesini seçer. `veri.metin("dosya.csv")` ham metni, `veri.dosyalar()` ise bu tarayıcı oturumunda bağlı dosya adlarını döndürür. Yerel veri kümeleri sayfa yenilendiğinde saklanmaz; bu tercih, kişisel verinin tarayıcı dışına çıkmaması ve izin modelinin anlaşılır kalması içindir.

Her `tablo.onizle` çağrısı, sağ paneldeki tablonun altında bir **Görsel Analiz** alanı üretir. Kullanıcı kategori ve sayısal değer sütunlarını seçebilir; çubuk grafik veya pasta grafik arasında geçiş yapabilir. Grafik yalnızca önizlenen satırlardan oluşturulur; veri yükleme sınırı bu yerel önizleme için 1,5 MB’tır.

Kod editörü artık Nokta anahtar sözcüklerini, veri modüllerini, metinleri, sayıları ve yorumları ayrı renklerle vurgular. Hatalar yalnızca bir cümle olarak gösterilmez: Nokta hata kodu, satır bağlamı, açıklama ve onarım önerisi ile bir tanı kartı oluşturur. Örneğin yüklenmemiş bir dosya için `NOKTA_201` tanısı, dosyanın Veri Kümeleri rafından yüklenmesi gerektiğini açıkça belirtir.

## 10. Doğrulama kaydı

Masaüstü görünümde üç bölmeli atölye düzeni; kaynak editörü, yürütme kaydı, otomasyon planı, veri önizlemesi, görsel analiz ve dil kartlarını aynı çalışma bağlamında sunacak biçimde doğrulandı. Küçük ekran görünümünde kenar çubuğu geri çekilir; kod editörü, yürütme kaydı ve dil kartları tek sütunda editör öncelikli bir sıraya geçer. Otomatik testler yerleşik örnekleri, Türkçe değişken adlarını, kayıt alanlarını, akış/adım kaydını, tanımsız ad hatasını, izinli otomasyonu, genişletilmiş veri yardımcılarını, CSV dönüşümünü, tablo önizlemesini, JSON gruplamayı, yüklenmiş veri kümesi bağlamını ve öneri içeren hata tanılarını kapsar.

## 11. v0.5 — Büyük koleksiyonlar ve yerel dosya planı

`liste.essiz`, yinelenen değerleri korumadan ayırır. `liste.parcala(liste, boyut)` büyük listeleri düzenli parçalar hâline getirir. `liste.sayfala(liste, sayfa, sayfa_boyutu)`; `sayfa`, `sayfa_boyutu`, `toplam_oge`, `toplam_sayfa` ve `ogeler` alanlarını içeren bir kayıt üretir. `tablo.essiz`, `tablo.birlestir`, `tablo.sayfala` ve `tablo.ozet` ise büyük kayıt kümelerinde tekrar eden veriyi azaltma, iki tabloyu anahtarla eşleştirme, sayfa bazlı erişim ve sayısal özet alma için eklenmiştir.

Windows hedefi için `izin dosya "Raporlar/"` ile başlayan `dosya.oku`, `dosya.yaz` ve `dosya.listele` çağrıları, IDE’de doğrudan yan etki yaratmaz. Bunlar kullanıcı onaylı yerel yardımcıya gönderilecek eylem planı oluşturur. Yerel yardımcı prototipi yalnızca izinli çalışma klasöründe CSV, JSON, Nokta ve metin dosyalarını; boyut sınırı ve denetim kaydıyla işler.

## 12. v0.6 — Modüller ve zengin görsel analiz

`modul ad:` bloğu, ilgili özel işlevleri ad alanı altında toplar. Blok içindeki `islev` tanımları `ad.islev_adi(...)` biçiminde çağrılır. Bu sayede finans, raporlama ve veri temizleme gibi alanlar tek dosyada dahi isim çakışması oluşturmadan ayrıştırılabilir.

```nokta
modul finans:
  islev net_kar(gelir, gider):
    dondur gelir - gider

yaz finans.net_kar(4500, 1750)
```

Veri önizleme paneli, çubuk ve pasta grafiklerine ek olarak çizgi ve dağılım modlarını sunar. Her önizleme için toplam, ortalama, en küçük ve en büyük değerler otomatik hesaplanır. Kategori ve sayısal sütun seçimleri değiştirildiğinde tüm grafik türleri aynı veri görünümünü kullanır.

## 13. v0.7 — CSV ve PNG dışa aktarma

Her `tablo.onizle` sonucu, **CSV indir** ve **PNG indir** eylemlerini gösterir. CSV dışa aktarma, önizlemede gösterilen ilk satırlarla sınırlı değildir; o önizlemeyi üreten tüm tablo satırlarını UTF-8 biçiminde indirir. Başlıktaki UTF-8 işareti, Türkçe karakterlerin yaygın hesap tablosu uygulamalarında doğru açılmasına yardımcı olur.

PNG dışa aktarma, seçili görünümü — çubuk, pasta, çizgi veya dağılım — yüksek çözünürlüklü beyaz arka planlı bir dosyaya dönüştürür. Grafik türü veya kategori/değer sütunu değiştirildiğinde indirme eylemi o anda ekranda bulunan görünümü alır. Her iki indirme de tarayıcıda üretilir; veri sunucuya gönderilmez.
