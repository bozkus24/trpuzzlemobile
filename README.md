# TrPuzzle mobile

iOS ve Android için Capacitor 8 uygulaması. **Harfle, Harf500, Bağla, Baklava, Kesme, Tilkile, Arala ve Şehirle** yerel pakette bulunur. Ana ekran, TrPuzzle web anasayfasının özgün kartlarını ve sekiz oyunluk günlük ilerleme göstergesini kullanır. Oyunların sunduğu arşiv, alıştırma, ayarlar ve istatistik ekranları korunur; Şehirle webdeki gibi günlük ve sınırsız mod sunar.

Mobil katman oyunların kutu/tuş köşelerini, boyutlarını, renklerini veya fontlarını değiştirmez. Yalnızca cihazın güvenli ekran alanını, bağlantı durumunu, kalıcı kayıtları ve yerel paylaşımı yönetir. Tarayıcı testleri bu görsel özellikleri mobil CSS açık ve kapalıyken karşılaştırır.

## Çalıştırma

Node.js 22+ ve pnpm 10.11+:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev
# http://127.0.0.1:4173
```

Önizleme `/api/game` isteklerini canlı `https://trpuzzle.com/api/game` servisine iletir. Yerel sunucu kataloğuyla geliştirmek için:

```sh
pnpm dev --local-api ../trpuzzlemain
```

Sunucu anahtarı yalnızca Node sürecinde okunur; anahtar ve şifreli cevap kataloğu repoya veya uygulamaya kopyalanmaz. Yerel ve canlı servis farklı anahtar kullanıyorsa ayrı tarayıcı profilleri kullanın. Bulmaca bulunabilirliği sunucudaki içeriğe bağlıdır. Sabitlenmiş Bağla web kaynağında 3–18 Ekim 2026 tarihli 16 bulmaca vardır; 19 Ekim için hazırlanıyor mesajı ve çalışan arşiv gösterilir.

## Telefon ve test derlemeleri

```sh
pnpm native:sync
pnpm ios
pnpm android
```

Paket kimliği `com.trpuzzle.mobile`, sürüm **0.2.0**, build **2**. Native oyun istekleri CapacitorHttp üzerinden HTTPS API'ye gönderilir; uygulama uzak siteyi `server.url` ile açmaz.

`main` gönderimlerinde ve PR güncellemelerinde **Native test builds** çalışır. Android işi debug APK, iOS işi imzasız simülatör uygulaması üretir; çıktılar Actions'ta 14 gün saklanır. Simülatör uygulaması fiziksel iPhone'a kurulamaz; iPhone/TestFlight için Apple geliştirici hesabıyla imzalama gerekir. Mağazaya otomatik yayın yapılmaz. Gerçek cihaz paylaşımı, geri tuşu ve çentik alanı kontrolleri ayrıca yapılmalıdır.

## Ortak web kaynakları

`vendor/manifest.json`, her dosyanın kaynak commit'ini ve SHA-256 özetini kaydeder. Build, değiştirilmiş vendor dosyalarını reddeder. Kaynaklar repoda bulunduğu için diğer checkout'lar olmadan derlenebilir.

```sh
pnpm sync:games                  # kardeş web repoları
pnpm sync:games /checkout/root   # alternatif kaynak kökü
```

Kaynak eşlemesi: `harfle` → Harfle, `word500turkce` → Harf500, `trpuzzle1` → Bağla, `trpuzzle2` → Kesme, `trpuzzle3` → Şehirle, `trpuzzle4` → Baklava, `trpuzzle6` → Tilkile, `arala` → Arala, `trpuzzlemain` → ana ekran ve ortak varlıklar. Önce ilgili web reposunda değişiklikleri commit edin, sonra eşitleyin.

`tools/package-web.mjs` web HTML/CSS yapısını korur, scriptleri cihaz kayıtları yüklendikten sonra çalıştırır ve ortak taşıma katmanını yerleştirir. Şehirle'nin özgün React kaynağı esbuild ile derlenir. Web reklam/çerez yükleyicileri pakete alınmaz. Harf500'nin artık kullanılmayan yerel cevap indeksleri çıktıda boşaltılır; kabul edilen kelime sözlükleri korunur. Bağla paylaşımı, telefon paylaşım penceresi varken ayrıca panoya yazmaz. Harfle'nin mevcut açılış/arşiv adaptörü `tools/build.mjs` ve `src/bootstrap.js` içindedir.

Web kurallarını veya tasarımını mobil tarafta yeniden yazmayın. Gerekli uyarlamalar vendor yerine `src/` ve `tools/` içinde kalmalıdır.

## Kayıtlar ve gizlilik

Sekiz oyunun özgün localStorage anahtarları korunur. Preferences kayıtları oyun scriptlerinden önce yüklenir; yazmalar sıraya alınır ve uygulama içi gezinmeden önce tamamlanır. iOS UserDefaults gizlilik manifesti projeye eklenmiştir; Android otomatik yedekleme kapalıdır.

Kayıtlar bu cihazdaki uygulamaya aittir; web tarayıcısından otomatik aktarım veya cihazlar arası eşitleme yoktur. Başarısız hamlede son geçerli token korunur. Günlük bulmaca ve hamle kontrolü internet gerektirir. İlk açılış hatası tekrar deneme paneli gösterir. Türkiye günü değiştiğinde kullanıcı bilgilendirilir.

Sonuç metinleri oyunların kendi paylaşım kodundan gelir; native paylaşım penceresi kullanıcı dokunuşuyla açılır. Reklam/analiz SDK'sı yoktur.

## Doğrulama

```sh
pnpm build
pnpm test
# Önizleme açık ve Google Chrome kurulu olmalı:
pnpm test:e2e
```

Birim kontrolleri paket sınırlarını, sekiz oyunun kayıt kapsamını ve bağlantı/token davranışını sınar. Tarayıcı testleri tüm oyunlarda gerçek UI hamlesini, kaydı yeniden açmayı, web tasarımı eşitliğini ve 360/390/430 piksel genişlikleri kontrol eder. Kesme tamamlanan kesimi yerel kayıttan açar; Bağla mevcut arşiv bulmacasıyla sınanır. Harfle ayrıca bağlantı kesintisi, tekrar deneme, sonuç paylaşımı ve tema testlerinden geçer. Ana ekranın sekiz bağlantısı, altı ek arşiv rotası ve 8/8 tamamlanma göstergesi kontrol edilir. Telefon köprüsü taklidiyle Preferences geri yükleme, yedi ek oyunun geri tuşu ve paylaşım iptali de sınanır; bu test fiziksel cihaz testinin yerine geçmez. Görseller ignored `test-results/` dizinine yazılır.
