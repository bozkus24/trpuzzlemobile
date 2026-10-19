# TrPuzzle mobile

iOS ve Android için Capacitor 8 uygulaması. İlk sürüm Harfle'yi içerir: günlük oyun, arşiv, istatistik, cihazda kayıt, yerel sonuç paylaşımı ve Android geri tuşu. Diğer yedi oyun henüz taşınmadı.

Oyun tasarımının kaynağı web reposundaki `style.css` dosyasıdır. Mobil katman kutu/tuş köşelerini, boyutları, renkleri, fontları ve oyun içi boşlukları değiştirmez; yalnızca güvenli ekran alanı, kaydırma ve bağlantı durumunu yönetir. Tarayıcı testi, mobil stil katmanı açık ve kapalıyken bu özelliklerin aynı kaldığını karşılaştırır.

## GitHub test derlemeleri

`main` gönderimlerinde **Native test builds** çalışır; Actions ekranından elle de başlatılabilir. Android işi cihaza kurulabilen debug APK, iOS işi imzasız simülatör uygulaması üretir. Başarılı işlerin çıktıları 14 gün boyunca Actions > ilgili çalışma > Artifacts bölümünden indirilir. iOS simülatör dosyası fiziksel iPhone'a kurulamaz; iPhone/TestFlight için Apple geliştirici hesabıyla imzalama ayrıca gerekir. Bu akış mağazaya yayın yapmaz.

## Çalıştırma

Node.js 22+ ve pnpm 10.11+ gerekir.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev
# http://127.0.0.1:4173
```

Tarayıcı önizlemesi `/api/game` isteklerini canlı `https://trpuzzle.com/api/game` servisine iletir. Yalnızca localhost'a bağlanır. Yerel cevap servisiyle geliştirmek için mevcut `trpuzzlemain` checkout'u kullanılabilir:

```sh
pnpm dev --local-api ../trpuzzlemain
```

Bu seçenek sunucu anahtarını yalnızca Node sürecinde okur; anahtar veya cevap kataloğu mobil repoya ve `dist/` içine kopyalanmaz. Yerel ve canlı servis farklı anahtar/katalog kullanıyorsa aynı tarayıcı oturumunu paylaşmayın; ayrı tarayıcı profili kullanın.

## Telefon projeleri

```sh
pnpm native:sync
pnpm ios       # Xcode projesini açar
pnpm android   # Android Studio projesini açar
```

Paket kimliği `com.trpuzzle.mobile`, sürüm `0.1.0`. Xcode'da kendi Signing Team'inizi seçin. Android için Android Studio, JDK ve projenin istediği SDK 36 gerekir. iOS tam Xcode ve iOS SDK gerektirir. Güncel gereksinimler: [Capacitor ortam kurulumu](https://capacitorjs.com/docs/getting-started/environment-setup).

`ios/` ve `android/` gerçek Capacitor projeleridir. Web dosyaları `dist/` içinden yerel olarak paketlenir; uzak siteyi açan `server.url` yoktur. Native oyun istekleri CapacitorHttp ile HTTPS üzerinden gönderilir; sunucunun web CORS politikasını genişletmek gerekmez. API adresi gerekirse build sırasında `TRPUZZLE_API_URL=https://.../api/game` ile değiştirilebilir; gizli anahtar değildir. HTTP adresleri build tarafından reddedilir.

## Ortak oyun kaynağı

`vendor/`, web reposundan alınan, commit ve SHA-256 özetleri `vendor/manifest.json` ile sabitlenmiş kaynak anlık görüntüsüdür. Proje böylece diğer checkout'lar olmadan kurulabilir. Web reposundaki güncellemeler aşağıdaki komut çalıştırılınca alınır; senkronizasyon otomatiktir diye varsayılmamalıdır.

```sh
pnpm sync:games                  # kardeş harfle ve trpuzzlemain klasörleri
pnpm sync:games /checkout/root   # alternatif kaynak kökü
pnpm build
pnpm test
```

Oyun kurallarını `harfle` kaynak reposunda değiştirip commit edin; sonra bu senkronizasyonu çalıştırın. Vendor dosyaları elle değiştirilirse build durur. Senkronizasyon yalnızca izin verilen arayüz dosyalarını alır; `.env`, cevap tabloları ve sunucu kodu dışarıda kalır. Mobil farklar `src/` içindedir. Build, kaynak HTML'den yalnızca oyun bölümünü çıkarır ve kaynak JS'deki tek açılış çağrısına arşiv bağlantısı kontrolü ekler. Böylece arşiv açılışı, arkadan gelen günlük oyun cevabıyla kapanmaz. Kaynağın yapısı değişirse bu dönüşümler hata verir ve elle gözden geçirilir.

## Kayıt ve bağlantı

Web oyununun `trw-*` kayıt biçimi korunur. Native açılışta Preferences kayıtları oyun başlamadan yüklenir; yazmalar sıralanır ve uygulama içi gezinmeden önce tamamlanır. [Preferences](https://capacitorjs.com/docs/apis/preferences) için gereken iOS `PrivacyInfo.xcprivacy` dosyası Xcode Resources'a eklendi. Android otomatik yedekleme kapalıdır.

Kayıtlar bu uygulamanın cihaz alanındadır; web tarayıcısındaki oyunlar otomatik aktarılmaz. Hesap/eşitleme yoktur. Başarısız istekte token ve yazılı tahmin korunur; tekrar denemek aynı token ile yapılır. İlk yükleme hatası kalıcı bir tekrar-dene paneli gösterir. Çevrimdışı yeni bulmaca veya tahmin kontrolü yoktur. Türkiye gün değişimi uygulama geri geldiğinde kontrol edilir.

Sonuç paylaşımı kullanıcı dokunuşuyla açılır; iptal edilirse panoya sessizce kopyalama yapılmaz. AdSense, çerez penceresi, reklam ve analiz SDK'ları bu prototipe dahil değildir.

## Doğrulama

```sh
pnpm build
pnpm test
# Başka terminalde pnpm dev veya yerel API'li önizleme açıkken:
pnpm test:e2e
```

Tarayıcı testleri kurulu Google Chrome'u kullanır: günlük tahmin, yeniden açma, çevrimdışı başarısız hamle ve tekrar, arşiv, koyu tema, 360×640 yerleşim, servis hatasından kurtarma, sonuç paylaşımı ve ana ekran istatistikleri. Sonuç/paylaşım testi gerçek cevaplardan bağımsız bir test verisi kullanır. Ekran görüntüleri ignored `test-results/` dizinine yazılır.

Bu makinede tam Xcode, Android SDK ve Java çalışma ortamı bulunmadığından IPA/APK/AAB derlemesi veya gerçek cihaz testi yapılmadı. `cap sync` ile native proje eşitlemesi doğrulanır; bu bir native derleme testi değildir. Mağaza yayını, imzalama, gerçek cihazda paylaşım/geri tuşu/safe-area testleri ve mağaza metinleri sonraki aşamadır. Bu repo mağazalara otomatik yayın yapmaz.
