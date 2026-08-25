# GitHub Pages Yayın Notu

Nokta Studio, GitHub Pages üzerinde proje alt yolunda çalışacak şekilde hazırlanmıştır. Dağıtım iş akışı `main` dalına yapılan her gönderimde Vite derlemesini, depo adı temel yol olacak şekilde üretir. Örneğin depo adı `nokta-studio` olduğunda uygulama `https://boyleiyi620-hue.github.io/nokta-studio/` adresinden sunulur.

Görsel varlıklar, Manus önizlemesinde yönetilen dosya adresleriyle; GitHub Pages üretiminde ise `client/public/nokta-assets/` altındaki dışa aktarılmış kopyalarla kullanılır. Bu iki yol arasındaki seçim, Vite’ın temel adresine göre otomatik yapılır.
