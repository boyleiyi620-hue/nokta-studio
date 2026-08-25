# Nokta Studio — Tasarım Fikirleri

## Yaklaşım 1: Atölye Defteri

**Tema Adı:** Atölye Defteri  
**Kısa Tanıtım:** Kod yazmayı bir zanaat ve inceleme pratiği gibi ele alan, sıcak kâğıt yüzeyler ile keskin editör kontrastını birleştiren editoryal bir çalışma alanı. Kullanıcıya araç değil, düşünmek için düzenli bir masa hissi verir.  
**Olasılık:** 0.07

## Yaklaşım 2: Aurora Terminal

**Tema Adı:** Aurora Terminal  
**Kısa Tanıtım:** Koyu yüzeyde düşük yoğunluklu kutup ışığı vurguları ve canlı yürütme sinyalleriyle çalışan, teknik bir kontrol odası yaklaşımı. Hız ve canlı işlem hissini öne çıkarır.  
**Olasılık:** 0.04

## Yaklaşım 3: Kamu Panosu

**Tema Adı:** Kamu Panosu  
**Kısa Tanıtım:** Açık, erişilebilir ve belge odaklı bir kamusal bilgi sistemi estetiği; güçlü mavi, net çizgiler ve rahat okunur tipografi kullanır. Karmaşık akışları anlaşılır panolara dönüştürür.  
**Olasılık:** 0.09

---

# Seçilen Yaklaşım: Atölye Defteri

## Tasarım Hareketi

**Çağdaş editoryal tasarım ve Bauhaus işlevciliği.** Nokta Studio, yazılımın endüstriyel kontrol paneli gibi görünmesinden çok; iyi düzenlenmiş bir teknik defter ve ustalıkla hazırlanmış bir masaüstü aracı gibi hissettirecektir. Kullanıcı arayüzü, kodun kendisini ana malzeme kabul eder; dekorasyon hiçbir zaman kodu gölgelemez.

## Temel İlkeler

1. **Kod ana kahramandır:** Editör geniş, sakin ve odaklıdır; yardımcı paneller bağlama göre geri çekilir.
2. **Durum görünürdür:** Çalıştırma, hata, önizleme ve izin bilgisi her zaman bir bakışta ayırt edilir.
3. **Zanaat hissi:** İnce ayırıcılar, mikro ızgara, kâğıt yüzey ve ölçülü vurgu renkleri ile özenli bir çalışma ortamı kurulur.
4. **Öğreten arayüz:** Nokta kavramları, gerektiğinde kısa ve bağlamsal açıklamalarla kullanıcının yanında yer alır.

## Renk Felsefesi

Ana zemin sıcak, çok açık kâğıt tonudur; uzun çalışma oturumlarında agresif beyazın yorgunluğunu azaltır. Kod editörü koyu mürekkep panel olarak ayrışır; böylece metin ve yürütme sonucu güçlü odak yaratır. Yeşil, güvenlik/başarı için genel bir sembol olmaktan öte Nokta'nın karakter rengidir: ölçülü biçimde kullanılan **Nokta Yeşili**, çalıştırma ve güvenli akış hissini taşır. Kiremit vurgu yalnızca dikkat gerektiren hatalarda kullanılır.

## Yerleşim Paradigması

Merkezlenmiş kartlar yerine masaüstü çalışma tezgâhı düzeni kullanılır: sol tarafta dosya ve örnek rafı; ortada geniş kaynak editörü; sağda çalışan akışın canlı günlüğü ve dil yardım kartları bulunur. Üst çubuk, belge kimliği ve kritik eylemleri taşır. Küçük ekranlarda bu üçlü düzen, editör öncelikli sekmeli bir düzene dönüşür.

## İmza Öğeleri

1. Her içerik alanının çevresinde çok ince **mürekkep çizgileri** ve az yoğunluklu kareli kâğıt dokusu bulunur.
2. Çalıştırma çıktısında dikey **akış izi**, adımları kâğıt üzerindeki kenar notları gibi birbirine bağlar.
3. Nokta logosu; iç içe iki noktayı ve bir akış yolunu ima eden, keskin uçlu yeşil bir işaret olarak kullanılır.

## Etkileşim Felsefesi

Kullanıcı eylemleri net geri bildirim verir: Çalıştır düğmesi önce kısa bir basılma hissi yaratır, ardından çıktı panelinde adımlar sırayla belirir. Sık kullanılan eylemler anlıktır; hareket, bilgi taşımadığı yerde kullanılmaz. Başarısızlıklar cezalandırıcı kırmızı duvarlar değil, ilgili satıra giden açıklayıcı onarım notları olarak görünür.

## Animasyon

Başlangıçta yalnızca ana çalışma yüzeyleri 40–80 ms aralıklı, 220 ms'yi aşmayan solma/yukarı kayma ile yerleşir. Yürütme sırasında akış izi bir satırdan diğerine yumuşakça ilerler; kod ve çıktı alanlarında konum değiştiren düzen animasyonu yapılmaz. Düğmeler 140 ms içinde basılır; açılır paneller 180–220 ms özel ease-out eğrisi ile görünür. `prefers-reduced-motion` kullanıcısında tüm gerekli olmayan hareket kapatılır.

## Tipografi Sistemi

Başlıklar için **DM Serif Display**, arayüz metni için **Manrope**, kod için **IBM Plex Mono** kullanılacaktır. Başlıklar 600–700 ağırlığında, kısa ve anlam taşıyan ifade şeklindedir. Arayüz metni 13–15 px aralığında; kod 13 px, satır yüksekliği 1.75 ile rahat okunur. Sayılar ve çalışma kimlikleri tek aralıklı yazı tipinde görünür.

## Marka Özü

**Nokta Studio, veri ve iş otomasyonunu anlaşılır akışlara dönüştürmek isteyenler için güvenli, öğretici ve çalıştırılabilir bir kod atölyesidir.**  
Kişilik: **titiz, sakin, cesaretlendirici.**

## Marka Sesi

Başlıklar doğrudan göreve çağırır; CTA'lar ne yapacağını söyler; mikro metinler kullanıcıyı terimlerle boğmaz.

> “Veriyi içeri al. Akışı görünür kıl.”

> “Önizlemede hiçbir dosya değiştirilmez.”

## Logotype ve Logo

Logotype, klasik bir serif sözcük işareti ile ince aralıklı yardımcı metni birleştirir; logo ise ad içermeyen, iki kesişen nokta ve bunları bağlayan tek rotadan oluşan geometrik simgedir. Sembol favicon ve dar kenar çubuğunda da ayırt edilebilir kalmalıdır.

## İmza Marka Rengi

**Nokta Yeşili — `#276D57`**. Bu renk; çalıştırma eylemi, aktif durum ve kimlik işareti için yüksek kontrastlı, sınırlı kullanımla korunacaktır.

## Uygulama Notları

Bu tasarım kararları, ilgili her bileşen ve stil dosyasının başında kısa yorum olarak tekrar edilecektir. Yeni bir arayüz tercihi yapılmadan önce şu soru sorulur: **“Bu tercih Atölye Defteri yaklaşımını güçlendiriyor mu, yoksa seyreltip sıradanlaştırıyor mu?”**

## Style Decisions

- Yürütme kaydı, adımları kâğıt kenarı notları gibi birbirine bağlayan görünür bir **akış izi** taşır; çalışma kimliği ve satır bağlantıları bu motifin parçasıdır.
- Sol gezinme, standart yönetim paneli yerine ince mürekkep çizgileri, raf etiketleri ve aktif durumdaki akış işaretiyle bir **atölye rafı** gibi davranır.
- İç içe nokta/akış logo işareti; çalışma alanı, aktif örnek ve yürütme durumu çevresinde ölçülü bir kimlik mührü olarak tekrar eder.
- Editörün boş alanı, satır ritmi ve sessiz işlem notlarıyla bir çalışma yüzeyi olarak kalır; siyah bir terminal boşluğu gibi davranmaz.
- Akış izi; aktif örnek, belge kimliği, yürütme kaydı ve ders kartları arasında Nokta’nın ana imza deseni olarak tekrar eder.
- Açıklama kartları, teknik ders notu görünümünü korur; çizgisel, numaralı ve sakin öğretici dille düzenlenir.
- Uzun sayfalarda merkezdeki çalışma masası, sol rafın algılanan kaydırma derinliğiyle dengeli kalır; boş kâğıt alanı yalnızca bilinçli bir çalışma yüzeyi olarak çerçevelendiğinde kullanılır.
- Öğretim alanları SaaS özellik kartı değil, ince mürekkep çizgileri, tek aralıklı kenar notları ve sıralı akış işaretleri taşıyan not defteri folyolarıdır.
- Yükleme ve hazırlık durumları dahi Atölye Defteri sistemini taşır: Nokta sözcük işareti, ince mürekkep çerçevesi, kâğıt dokusu, yeşil etkin sinyal ve kesikli akış izi görünür kalır.
- Kayıt merkezi bir paket rafı, paket ayrıntısı ise bir inceleme föyü gibi çerçevelenir; ikisi ortak kimliği korurken farklı çalışma niyetlerini yansıtır.
