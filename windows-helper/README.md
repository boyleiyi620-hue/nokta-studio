# Nokta Windows Yerel Yardımcı Prototipi

Bu yardımcı, Nokta IDE’nin Windows bilgisayarındaki onaylı çalışma klasöründe CSV, JSON, Nokta ve metin dosyalarını okuma, yazma ve listeleme planları yürütmesini sağlar. Prototip yalnızca `127.0.0.1` üzerinde çalışır; dış ağdan bağlantı kabul etmez ve genel kabuk komutu çalıştırmaz.

## Kurulum

Windows’ta Node.js 20 veya üzeri kurulu olmalıdır. `windows-helper` klasöründe PowerShell açıp aşağıdaki komutu çalıştırın:

```powershell
./scripts/install-windows.ps1
```

Ardından aynı klasörde yardımcıyı başlatın:

```powershell
npm start
```

İlk HTTPS kurulumundan sonra varsayılan çalışma klasörü `Belgeler\NoktaWorkspace` olur. Yardımcı penceresi aşağıdakine benzer bir çıktı verir:

```text
Nokta Yardımcı hazır: https://localhost:8417
Çalışma klasörü: C:\Users\Kullanıcı\Documents\NoktaWorkspace
Eşleştirme kodu (5 dakika geçerli): ...
```

Bu kod yalnızca Nokta IDE’deki **Windows Yardımcı** kartına girilmelidir. Kod tarayıcıda kalıcı olarak saklanmaz; oturum en fazla on dakika sürer. Kodu kimseyle paylaşmayın.

## IDE’de bağlantı

IDE’nin sol tarafındaki **Windows Yardımcı** kartına şu bilgileri girin:

| Alan | Değer |
|---|---|
| Adres | `https://localhost:8417` |
| Eşleştirme kodu | Yardımcı başlatılırken görünen beş dakika geçerli değer |
| Dosya eylemi | Okuma, yazma, klasör listeleme veya klasör oluşturma |
| Göreli yol | Örneğin `girdi/satislar.csv` |

Önce **Eşleştir**, sonra **Bağlantıyı dene** ile sağlık denetimi yapılır. Sonra **İzinli planı gönder** düğmesi, süreli ve yinelenmeyen bir dosya planı yollar. Yardımcı; dosya yolu çalışma klasörünün dışına çıkarsa, dosya türü izinli değilse veya içerik boyutu 5 MB sınırını aşarsa isteği reddeder.

## Önemli tarayıcı sınırı

GitHub Pages’deki HTTPS IDE, `https://localhost` üzerindeki güvenilen yerel köprüye bağlanabilir. Yardımcı yalnızca `https://boyleiyi620-hue.github.io` kaynağını kabul eder; başka bir web sayfası eşleştirme kodunu bilse bile kaynak doğrulamasını geçemez.

## Güvenli durdurma

Yardımcı penceresinde `Ctrl+C` tuşlarına basarak servisi durdurabilirsiniz. İzinli çalışma klasörünü kaldırmak veya belirteci yenilemek için `%LOCALAPPDATA%\NoktaHelper\config.json` dosyasını silip yardımcıyı yeniden başlatın.
