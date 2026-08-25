# Nokta Studio Kullanım Kılavuzu

## Cover

Nokta Studio

**Koddan görünür akışa**

Türkçe-öncelikli veri ve otomasyon atölyesi

## Slide 1

### Nokta’nın odağı: anlaşılır iş akışları

- Veri hazırlama, raporlama ve otomasyon niyetini tek bir okunabilir dilde birleştirir.
- Girinti, işin yapısını görünür kılar; `akis` ve `adim` her işlemi izlenebilir parçalara ayırır.
- IDE, yalnızca sonucu değil yürütme yolunu, tablo önizlemesini ve hata bağlamını da gösterir.

## Slide 2

### Üç yüzey, tek çalışma bağlamı

- Sol raf: dosyalar, veri kümeleri, örnekler ve Windows yardımcı bağlantısı.
- Orta editör: canlı söz dizimi vurgulamasıyla Nokta kaynak kodu.
- Sağ akış izi: adımlar, sonuçlar, veri önizlemeleri ve onarım notları.

## Slide 3

### Kod, bir akış kaydına dönüşür

```nokta
akis "Günlük satış özeti":
  adim "Ciroyu hesapla":
    yaz "Toplam: " + toplam
```

- `akis`, işin adını; `adim`, denetlenebilir aşamasını tanımlar.
- `yaz`, sonucu yürütme kaydına ekler.
- Hata oluşursa IDE ilgili satırı ve çözüm önerisini gösterir.

## Slide 4

### CSV ve JSON, doğrudan tablodur

```nokta
satislar = csv.coz(ham_csv)
tamamlanan = tablo.filtrele(satislar, "durum", "==", "tamam")
tablo.onizle(tamamlanan, "Tamamlanan siparişler")
yaz tablo.topla(tamamlanan, "tutar")
```

- `csv.coz` ve `json.coz`, metni kayıt listesine dönüştürür.
- `tablo.filtrele`, `sirala`, `grupla` ve `topla` rapor akışını kurar.
- Yüklenen CSV/JSON dosyaları tarayıcıda yerel olarak işlenir.

## Slide 5

### Aynı tablo, dört analiz görünümü

- Çubuk grafik kategoriler arası büyüklüğü karşılaştırır.
- Pasta grafik bileşimi, çizgi grafik eğilimi, dağılım grafik ise değer yayılımını açıklar.
- Her tablo önizlemesi toplam, ortalama, en düşük ve en yüksek değerlerle özetlenir.
- Kullanıcı kategori ve sayısal sütunları IDE’den seçer.

## Slide 6

### Büyük listeler kontrollü işlenir

```nokta
essiz = liste.essiz(satirlar)
parcalar = liste.parcala(essiz, 500)
sayfa = liste.sayfala(essiz, 2, 100)
ozet = tablo.ozet(satislar, "tutar")
```

- `essiz`, yinelenen değerleri azaltır.
- `parcala` ve `sayfala`, büyük veriyi adım adım işler.
- `tablo.ozet`, sayısal verinin toplamını, ortalamasını ve uç değerlerini verir.

## Slide 7

### Modüller, özel işlevleri düzenler

```nokta
modul finans:
  islev net_kar(gelir, gider):
    dondur gelir - gider

yaz finans.net_kar(4500, 1750)
```

- `modul`, ilgili özel işlevler için bir ad alanı oluşturur.
- `islev`, tekrar kullanılan davranışı tanımlar; `dondur` sonucunu geri verir.
- Çağrı biçimi `modul.islev(...)` olup isim çakışmasını azaltır.

## Slide 8

### Yerel dosya eylemleri, açık izne bağlıdır

```nokta
izin dosya "girdi/"
dosya.oku("girdi/satislar.csv")
```

- Kod önce güvenli eylem planı üretir; önizleme tek başına dosya değiştirmez.
- Windows yardımcı, yalnızca izinli kök klasörde ve onaylı uzantılarla çalışır.
- HTTPS localhost köprüsü; kaynak doğrulaması, eşleştirme kodu ve süreli oturum kullanır.

## Slide 9

### İlk raporu beş adımda oluşturun

- CSV veya JSON dosyasını Veri Kümeleri rafından yükleyin.
- `veri.al`, `csv.coz` veya `json.coz` ile veriyi bağlayın.
- `tablo.filtrele` ve `tablo.onizle` ile dönüşümü gözlemleyin.
- Grafik türünü ve sütunları seçerek sonucu inceleyin.
- Akış izindeki çıktıyı kontrol edin; gerekirse tanı kartından hata satırına dönün.

## Slide 10

Nokta ile sonraki adım

**Veriyi içeri al. Akışı görünür kıl.**
