# Nokta v0.5 — Windows HTTPS Yerel Yardımcı Kurulumu

Bu kılavuz, GitHub Pages üzerinde açılan Nokta IDE’nin aynı Windows bilgisayarındaki yerel yardımcıya güvenli biçimde bağlanmasını açıklar. Yardımcı yalnızca `https://localhost:8417` üzerinde çalışır; Nokta’nın izinli çalışma klasöründen dışarı çıkamaz ve yalnızca CSV, JSON, Nokta ve metin dosyalarıyla işlem yapar.

## 1. Çalışma klasörünü belirleyin

Varsayılan klasör `C:\Users\<kullanıcı>\Documents\NoktaWorkspace` olur. Burada `girdi`, `cikti` ve `raporlar` klasörlerini oluşturabilirsiniz. Yerel yardımcı, bu klasörün dışındaki bir yolu kabul etmez.

Manus Desktop ile kaynak kod üzerinde doğrudan çalışmak istiyorsanız, [Manus Desktop](https://manus.im/desktop) uygulamasını kurun; bağlantı ekranında bu çalışma klasörünü seçip bağlayın. Bu seçim yalnızca geliştirme erişimi içindir; Nokta yardımcı servisi bunun dışında kendi izin sınırını korur.

## 2. HTTPS yerel köprüyü hazırlayın

Windows’ta Node.js 20 veya üzeri kurulu olmalıdır. `windows-helper` klasöründe PowerShell açın ve şu betiği çalıştırın:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
./scripts/setup-https.ps1
```

Betik, yalnızca `localhost` için bir geliştirme sertifikası üretir. İstendiğinde sertifikayı **yalnızca geçerli Windows kullanıcısının** güvenilen kök sertifika deposuna eklemeyi onaylayın. Bu işlem, HTTPS GitHub Pages sayfasının aynı bilgisayardaki `https://localhost:8417` hizmetine güvenli bağlantı kurabilmesi için gereklidir.

## 3. Yardımcıyı başlatın

```powershell
npm start
```

Başlatıldığında yardımcı, çalışma klasörünü, izinli GitHub Pages kaynağını ve **beş dakika geçerli eşleştirme kodunu** gösterir. Bu kod geçicidir; bir tarayıcı oturumu oluşturur, kalıcı parola değildir.

## 4. GitHub Pages IDE’sinde eşleştirin

Nokta Studio’yu aynı Windows bilgisayarında açın. Sol kenar çubuğunda **Windows Yardımcı** kartında adresin `https://localhost:8417` olduğunu doğrulayın. Yardımcı penceresindeki eşleştirme kodunu girip **Eşleştir** düğmesine basın. Ardından **Bağlantıyı dene** ile çalışma klasörünün göründüğünü kontrol edin.

| İşlem | Plan örneği | Sonuç |
|---|---|---|
| Dosya okumak | `izin dosya "girdi/"` ve `dosya.oku("girdi/satislar.csv")` | IDE güvenli plan oluşturur; yardımcı eşleştirildiğinde dosya eylemi yürütülebilir. |
| Dosya yazmak | `izin dosya "cikti/"` ve `dosya.yaz("cikti/rapor.json", metin)` | Yardımcı, boyut sınırı içinde atomik metin dosyası yazar. |
| Klasör listelemek | `izin dosya "girdi/"` ve `dosya.listele("girdi/")` | Yalnızca izinli uzantılar görünür. |

> Eşleştirme kodunu paylaşmayın. IDE oturumu on dakika sonra biter; yeniden eşleştirme gerekir. Yardımcı açıksa bile izinli olmayan web siteleri CORS ve kaynak doğrulaması nedeniyle bağlanamaz.

## 5. Güvenli durdurma ve sorun giderme

Yardımcı penceresinde `Ctrl+C` kullanarak servisi durdurun. Sertifikayı veya yapılandırmayı sıfırlamak için `%LOCALAPPDATA%\NoktaHelper` klasörünü kaldırıp kurulum betiğini yeniden çalıştırın. `HTTPS yardımcıya ulaşılamadı` mesajında yardımcı işleminin açık olduğunu, sertifika onayını ve 8417 bağlantı noktasını başka bir uygulamanın kullanmadığını kontrol edin.
