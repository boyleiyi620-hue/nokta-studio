# Nokta Studio ve Nokta v0.1 Kullanım–Kod Rehberi

**Durum:** Çalışan tarayıcı tabanlı prototip  
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

## 7. Doğrulama kaydı

Masaüstü görünümde üç bölmeli atölye düzeni; kaynak editörü, yürütme kaydı ve dil kartlarını aynı çalışma bağlamında sunacak biçimde doğrulandı. Küçük ekran görünümünde kenar çubuğu geri çekilir; kod editörü, yürütme kaydı ve dil kartları tek sütunda editör öncelikli bir sıraya geçer. Otomatik testler yerleşik örnekleri, Türkçe değişken adlarını, kayıt alanlarını, akış/adım kaydını ve tanımsız ad hatasını kapsar.
