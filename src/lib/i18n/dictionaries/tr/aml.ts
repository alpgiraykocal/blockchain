import type { Dictionary } from "../../types";

/**
 * Turkish copy for the AML/CTF engine.
 *
 * Register matches how a Turkish compliance team writes: hedged where the
 * English hedges ("ile tutarlı", "gösterge niteliğinde"), never asserting an
 * offence. Terms that Turkish practice keeps in English - OFAC, mixer, peel
 * chain, mempool - are kept, because translating them would make the finding
 * harder to match against the source material an analyst cross-checks.
 */
export const aml: Dictionary["aml"] = {
  dispositionLabel: {
    escalate: "Yükselt",
    "enhanced-review": "Genişletilmiş inceleme",
    monitor: "İzle",
    "no-action": "İşlem gerekmiyor",
  },

  stage: {
    placement: "Yerleştirme",
    layering: "Katmanlama",
    integration: "Bütünleştirme",
    unclear: "Aşama belirsiz",
  },

  strength: {
    indicative: "gösterge niteliğinde",
    supporting: "destekleyici",
    weak: "zayıf",
  },

  basis: {
    observed: "gözlemlenen",
    derived: "türetilen",
    attribution: "atıf",
  },

  finding: {
    context: "bağlam",
    noMatch: "eşleşme yok",
    weight: (n: number) => `ağırlık ${n}`,
    evidence: "Kanıt",
    argumentsAgainst: "Karşı argümanlar",
  },

  caseFile: {
    title: "Dosya",
    description: "Taslak anlatı, denetim izi ve dışa aktarma",
    assessmentId: "Değerlendirme kimliği",
    engineLayout: "Motor / yerleşim",
    sanctionsList: "Yaptırım listesi",
    labelSnapshot: "Etiket anlık görüntüsü",
    hopTopK: "Adım derinliği / ilk-K",
    reductionApplied: "Uygulanan indirgeme",
    caseFileHeading: (subject: string) => `Dosya - ${subject}`,
    chronology: "Kronoloji",
    dataLimitations: "Veri sınırlamaları",
    audit: "Denetim",
    generated: "Üretildi",
    explorer: "Gezgin",
    sanctionsIssued: (source: string, date: string) => `${source}, yayım ${date}`,
    hopTopKValue: (hop: number, topK: number) => `${hop} adım · ilk ${topK}`,
    reductionNone: "yok",
    sourceVersion: (id: string, version: string) => `${id} @ ${version}`,
    versionUnknown: "bilinmiyor",
    markdown: "Markdown",
    json: "JSON",
    copyNarrative: "Anlatıyı kopyala",
    downloadJson: "JSON indir",
  },

  disposition: {
    driver: (title: string, summary: string) => `${title}: ${summary}`,
    noTypology: "İncelenen pencerede hiçbir tipoloji eşleşmedi.",
    mitigantService:
      "Konu, atfı yapılmış bir hizmettir. Yüksek devir, yoğunlaşma ve dağıtım onun beklenen çalışma biçimidir; yapısal bulguların ağırlığı buna göre düşürülmüştür.",
    mitigantNoSanctions:
      "Yüklü OFAC anlık görüntüsüne karşı doğrudan veya bir adımlık eşleşme yok; anlık görüntünün kendi kapsam sınırları saklıdır.",
    mitigantAttributed: (share: string) =>
      `Karşı tarafların ${share} kadarı bilinmeyen adresler yerine adı konmuş aktörlere atfedilmiştir; bu, açıklanamayan yüzeyi daraltır.`,
    mitigantRetains: (amount: string) =>
      `Adres ${amount} tutuyor; bu, saf aktarım kanalı davranışıyla bağdaşmaz.`,
    changeWindow:
      "Tüm işlem geçmişi incelenirse. İnceleme penceresi blok gezgininden alınan sınırlı bir dilimdir ve bu dilimin dışındaki bir örüntü hiçbir dedektörü tetikleyemez.",
    changeSnapshot:
      "Yaptırım anlık görüntüsü yenilenirse. Şu anda inceleme eşiğinden eski olduğu için yeni bir listeye alma kaçırılmış olabilir.",
    changeCustomerInfo:
      "Müşteri bilgisi elde edilirse. Buradaki her yapısal bulgu yalnızca biçimi tanımlar; ancak beyan edilmiş bir iş profili ve beklenen faaliyetle karşılaştırıldığında anlam kazanır.",
    changeCustodian:
      "Saklayıcıya çıkan değer için alıcı kurum sonraki kaydı sağlarsa.",
    stepSanctionsHit:
      "Yaptırım eşleşmesi olarak ele al: faaliyeti durdur, eşleşmeyi güncel OFAC listesiyle doğrula ve bloke veya ret kararı için yaptırım hukuku birimine yönlendir.",
    stepEscalate: "Bu dosyayı ekleyerek kıdemli analiste yükselt.",
    stepPreserve:
      "Kanıtı koru: değerlendirmeyi dışa aktar ve hangi liste ile etiket anlık görüntüsü sürümlerine karşı üretildiğini kaydet.",
    stepEdd:
      "Genişletilmiş durum tespiti uygula: adresi kimin kontrol ettiğini ve gözlenen faaliyetin beyan edilmiş bir amaçla örtüşüp örtüşmediğini belirle.",
    stepExpand:
      "Karar vermeden önce en yüksek öncelikli karşı taraflar üzerinde ağı bir adım genişlet.",
    stepMonitorRecord:
      "Şimdi dosya açmak yerine gözlemi kaydet ve belirlenmiş aralıklarla yeniden kontrol et.",
    stepMonitorTrigger:
      "Karşı taraf bileşiminde veya işlem büyüklüğünde esaslı bir değişiklik için tetikleyici tanımla.",
    stepNoAction:
      "Bu penceredeki kanıtlar bir işlem gerektirmiyor. Olumsuz sonucun denetlenebilir olması için incelemeyi belgele.",
    headlineSanctions: "Konu adreste yaptırım listesi eşleşmesi",
    headlineEscalate: "Bulgular kıdemli analiste yükseltmeyi gerektiriyor",
    headlineEdd: "Bulgular karardan önce genişletilmiş durum tespiti gerektiriyor",
    headlineMonitor: "Yalnızca zayıf sinyal; dosya açmak yerine izle",
    headlineNoAction: "İncelenen pencerede endişe verici bir örüntü yok",
  },

  risk: {
    abuse: {
      sanctions: "Yaptırım uygulanan taraf",
      "terrorism-financing": "Terörizmin finansmanı",
      ransomware: "Fidye yazılımı",
      theft: "Hırsızlık / hack geliri",
      "darknet-market": "Darknet pazarı",
      mixer: "Karıştırma hizmeti",
      scam: "Dolandırıcılık",
      none: "Kötüye kullanım kategorisi yok",
    },
    directLabel: (abuse: string) => `Doğrudan: ${abuse}`,
    directDetailNotes: (label: string, pack: string, notes: string) =>
      `${pack} tarafından "${label}" olarak etiketlendi. ${notes}`,
    directDetail: (label: string, pack: string, confidence: number) =>
      `${pack} tarafından "${label}" olarak etiketlendi (güven %${confidence}).`,
    indirectLabel: (hops: number, abuse: string) => `${hops} adımlık maruziyet: ${abuse}`,
    indirectDetail: (label: string, share: number) =>
      `"${label}" etiketli karşı taraf, gözlenen akışın %${share} kadarını tutuyor.`,
    fanOutLabel: "Dışa dağılım",
    fanOutDetail: (out: number, inn: number) =>
      `${inn} gönderene karşılık ${out} alan karşı taraf — dağıtım veya soyma ile tutarlı.`,
    fanInLabel: "İçe toplanma",
    fanInDetail: (inn: number, out: number) =>
      `${inn} gönderen ${out} çıktıya hunileniyor — toplama veya kurye birikimi ile tutarlı.`,
    oneShotLabel: "Tekrarlamayan karşı taraflar",
    oneShotDetail: (share: number) => `Karşı tarafların %${share} kadarı tam olarak bir kez görünüyor.`,
    knownServiceLabel: "Bilinen hizmet — yapısal sezgiseller bastırıldı",
    knownServiceDetail:
      "Yüksek içe toplanma ve dışa dağılımın şüpheli değil beklenen olduğu, bilinen bir hizmet olarak etiketlendi.",
    noSignalLabel: "Atıf veya yapısal sinyal yok",
    noSignalDetail:
      "İncelenen pencerede hiçbir etiket eşleşmedi ve hiçbir yapısal sezgisel tetiklenmedi.",
  },

  narrative: {
    disclaimer:
      "Bu anlatı, açık blok zinciri verisi ve açık atıf kaynaklarından üretilmiştir. İnsan incelemesini destekler; şüpheli işlem tespiti değildir ve hiçbir hukuki sonuç taşımaz. Rakamlar yalnızca incelenen işlem penceresini kapsar. Atıf ve yaptırım eşleşmeleri, denetim bloğunda kayıtlı anlık görüntü sürümlerini yansıtır. Nihai inceleme, bildirim kararları ve müşteriye yönelik her türlü işlem nitelikli bir uyum uzmanına aittir.",
    attributedTo: (label: string) => `"${label}" olarak atfedilmiş`,
    noAttribution: "yüklü etiket kümelerinde atfı bulunmayan",
    subjectPhrase: (chain: string, address: string, label: string) =>
      `${label} ${chain} adresi ${address}`,
    firstTx: "İncelenen pencere içindeki ilk işlem.",
    lastTx: "İncelenen pencere içindeki en son işlem.",
    largestMovement: (direction: string, amount: string, usd: string, hash: string) =>
      `En büyük tekil hareket: ${hash} işleminde ${amount}${usd} ${direction}.`,
    directionIn: "alındı",
    directionOut: "gönderildi",
    atCurrentRate: (usd: string) => ` (güncel kurla ${usd})`,
    dormantObserved: (detail: string) => `Atıl dönem gözlendi: ${detail}`,
    undated: "Tarihsiz",
    reviewCovers: (subject: string) => `Bu inceleme ${subject} adresini kapsıyor.`,
    coSpend: (n: number) =>
      `Birlikte harcama analizi, adresi ortak kontrol altında ${n} başka adresle gruplandırıyor.`,
    noCoSpend:
      "Pencerede birlikte harcama yapan bir eş görülmedi, bu yüzden adres kendi başına bir varlık olarak duruyor.",
    consistentWith: (count: number, list: string) =>
      `Faaliyet, tanınan ${count === 1 ? "bir örüntüyle" : `${count} örüntüyle`} tutarlı: ${list}.`,
    noTypologyMatched: "Tespit setindeki hiçbir tipoloji bu penceredeki faaliyetle eşleşmedi.",
    volumeLine: (
      windowSize: string,
      windowTotal: string,
      explorer: string,
      received: string,
      inDegree: number,
      sent: string,
      outDegree: number,
    ) =>
      `${explorer} üzerinden erişilebilen ${windowTotal} işlemin ${windowSize} tanesinde adres, ${inDegree} ayrı karşı taraftan ${received} aldı ve ${outDegree} karşı tarafa ${sent} gönderdi.`,
    headingScope: "Konu ve kapsam",
    subjectLine: (address: string, chain: string) => `Konu: ${chain} üzerinde ${address}.`,
    isContract: "Adres bir kontrattır.",
    lifetimeFigures: (
      explorer: string,
      received: string,
      sent: string,
      balance: string,
      txCount: string,
    ) =>
      `${explorer} tarafından bildirilen ömür boyu rakamlar: alınan ${received}, gönderilen ${sent}, güncel bakiye ${balance}, toplam ${txCount} işlem.`,
    windowLine: (from: string, to: string, size: string) =>
      `İnceleme penceresi: ${from} – ${to}, ${size} işlemi kapsıyor.`,
    headingActivity: "Gözlenen faaliyet",
    counterpartiesLine: (degree: number, inn: number, out: number, oneShot: string) =>
      `Karşı taraflar: ${degree} ayrı (${inn} gönderen, ${out} alan). ${oneShot} kadarı tam olarak bir kez görünüyor.`,
    concentrationLine: (share: string) =>
      `Değer yoğunlaşması: en büyük tekil karşı taraf, gözlenen akışın ${share} kadarını oluşturuyor.`,
    retentionLine: (share: string) =>
      `Elde tutma: alınan her şeyin ${share} kadarı aktarılmış.`,
    dwellLine: (hours: string) =>
      `Gelen bir işlemle sonraki giden işlem arasındaki medyan süre ${hours} saat.`,
    activityLine: (days: number, burst: string) =>
      `Faaliyet ${days} ayrı güne yayılıyor; en yoğun gün, günlük ortalama işlem sayısının ${burst} katını taşıyor.`,
    attributionLine: (share: string, services: number) =>
      `Karşı tarafların ${share} kadarı atıf taşıyor; bunların ${services} tanesi bilinen hizmettir.`,
    headingWhy: "Bu neden dikkat gerektiriyor",
    findingLine: (title: string, family: string, stage: string, summary: string, facts: string) =>
      `${title} (${family}, ${stage} aşaması). ${summary} ${facts}`,
    factLine: (label: string, detail: string) => `${label}: ${detail}`,
    headingAlternatives: "Değerlendirilen alternatif açıklamalar",
    counterLine: (title: string, counter: string) => `${title}: ${counter}`,
    headingNoPattern: "Neden bir örüntü öne çıkarılmadı",
    noPatternBody:
      "Setteki hiçbir dedektör bu penceredeki faaliyetle eşleşmedi. Bu, geçmişin sınırlı bir dilimi ve inceleme anında yüklü atıf üzerinden alınmış olumsuz bir sonuçtur; aklama değildir.",
    headingDisposition: "Önerilen karar",
    driversLine: (items: string) => `Etkenler: ${items}`,
    mitigantsLine: (items: string) => `Hafifletici unsurlar: ${items}`,
    nextStepsLine: (items: string) => `Sonraki adımlar: ${items}`,
    headingUncertainty: "Kalan belirsizlik",
    mdChronology: "Kronoloji",
    mdAudit: "Denetim",
  },

  explorerLabelNote: "Blok gezgininin sağladığı açık etiket.",

  /** Çizilen ağın ölçülen ağdan neden küçük olduğu. İndirgeme neyin çizildiğini
   *  belirler ve attığı her adım raporlanır; bunlar analist tarafından okunur ve
   *  değerlendirme yanıtında taşınır. */
  reduction: {
    timeWindow: (start: string | null, end: string | null) =>
      `${start ?? "pencerenin başlangıcı"} ile ${end ?? "şimdi"} arasında etkinliği olmayan karşı taraflar.`,
    minValue: (amount: number, ticker: string) =>
      `Gözlenen akışı ${amount} ${ticker} altında kalan karşı taraflar.`,
    direction: (direction: "in" | "out") =>
      `Yalnızca ${direction === "in" ? "gönderenler" : "alıcılar"} gösteriliyor.`,
    serviceHubs:
      "Atfı yapılmış hizmetler yapıları gereği merkezdir. Değerce en büyük üçü tutulur; kalanı görünümden çıkarılır ama metriklerde kalır.",
    topK: (kept: number, total: number) =>
      `Halka 1, ${total} karşı taraftan önceliği en yüksek ${kept} tanesiyle sınırlandı.`,
    hopTwoCap: (expanded: number, total: number) =>
      `İkinci adım, ${total} halka-1 düğümünün ${expanded} tanesini genişletti. Her genişletme bir gezgin isteğidir ve atfı yapılmış hizmetler, komşulukları sınırsız olduğu için genişletilmez.`,
    hardCap: (maxNodes: number, maxEdges: number) =>
      `Çıkarım ${maxNodes} düğüm / ${maxEdges} kenar tavanında durdu.`,
    sourceWindow: (analysed: number, total: number) =>
      `Karşı taraflar ${total} işlemin ${analysed} tanesinden türetilir - gezginin sayfası, tüm geçmiş değil.`,
  },

  limitations: {
    window: (analysed: number, total: number, explorer: string) =>
      `Karşı taraflar ve zamanlama, ${explorer} tarafından sağlanan ${total} işlemin ${analysed} tanesinden türetilmiştir. Bu pencerenin dışındaki bir örüntü hiçbir dedektörü tetikleyemez.`,
    clusterPartial:
      "Birlikte harcama kümelemesi yalnızca penceredeki işlemleri görür, dolayısıyla varlık tüm zincirde daha büyük olabilir.",
    totalsWindowed:
      "Bu zincirde alınan ve gönderilen toplamlar tüm geçmiş yerine pencere üzerinden hesaplanır.",
    txsUnavailable: (reason: string) =>
      `Gezgin işlem listesini sunamadı (${reason}); davranışsal dedektörlerin çalışacağı veri olmadı.`,
    snapshotStale:
      "Yaptırım anlık görüntüsü yedi günlük inceleme eşiğinden eski; yeni bir listeye alma kaçırılmış olabilir.",
    expansionsFailed: (n: number) =>
      `${n} ikinci adım genişletmesi başarısız oldu ve ağda yer almıyor.`,
    noCustomerInfo:
      "Müşteri bilgisi kapsam dışıdır. Her yapısal bulgu yalnızca biçimi tanımlar ve ancak beyan edilmiş bir iş profiline karşı anlam kazanır.",
  },

  typology: {
    sanctions: {
      title: "Yaptırım maruziyeti",
      family: "Yasaklı karşı taraf",
      evSubjectListed: "Konu listede",
      evSentTo: (label: string) => `Konu, listedeki bir tarafa değer gönderdi: ${label}`,
      evReceivedFrom: (label: string) => `Konu, listedeki bir taraftan değer aldı: ${label}`,
      evSentDetail: (amount: string) => `${amount} konu tarafından o adrese gönderildi.`,
      evReceivedDetail: (amount: string) => `${amount} konu tarafından o adresten alındı.`,
      amount: (coin: string, txCount: number) => `${txCount} işlemde ${coin}`,
      summaryDirect:
        "Konu adresin kendisi bir OFAC yaptırım listesinde görünüyor. Bu, yayımlanmış bir tanımlayıcı üzerinde liste eşleşmesidir, davranışsal bir çıkarım değil.",
      summaryOutbound: (n: number) =>
        `Konu, OFAC yaptırım listesindeki ${n} adrese değer gönderdi. Listedeki bir tarafa giden değer, potansiyel olarak yasaklı bir işlemdir ve daha ağır yön olarak ele alınır.`,
      summaryInboundDust: (n: number) =>
        `Konu, listedeki ${n} adresten ihmal edilebilir bir tutar aldı. Bu büyüklükteki tutarlar, listedeki bir adresin ilgisiz alıcılara küçük miktarlar serptiği "dusting" davranışının tipik göstergesidir ve konunun bunda payı olmayabilir.`,
      summaryInbound: (n: number) =>
        `Konu, OFAC yaptırım listesindeki ${n} adresten değer aldı.`,
      summaryNone: "Yüklü OFAC anlık görüntüsüne karşı doğrudan veya bir adımlık eşleşme yok.",
      counterInbound:
        "Açık bir blok zincirinde gelen değer reddedilemez. Listedeki bir adresten alım, tek başına konunun bir eylemi değildir.",
      counterDust:
        "Alınan tutar ihmal edilebilir düzeydedir; bu, bir fon transferinden çok dusting kampanyasının imzasıdır.",
      counterIdentifier:
        "Liste eşleşmesi, yayımlanmış bir adres üzerinde tanımlayıcı eşleşmesidir. Tek başına konunun bilgisini veya kastını ortaya koymaz.",
      counterCoverage:
        "Yaptırım taraması yalnızca yayımlanmış adresleri kapsar. Listeye alınmış bir tarafın kontrol ettiği ancak hiç yayımlanmamış adresleri, ne de %50 Kuralı uyarınca türev olarak bloke olan varlıkları göremez.",
      counterClear:
        "Temiz bir tarama sonucu aklama değildir: anlık görüntü yalnızca yayımlanmış adresleri kapsar ve son eşitlenme tarihi kadar günceldir.",
    },

    mixer: {
      title: "Karıştırıcı veya gizlilik hizmeti maruziyeti",
      family: "Zincir üstü katmanlama",
      evSubjectIsMixer: "Konu bir karıştırma hizmeti",
      evReceivedFrom: (label: string) => `${label} kaynağından alındı`,
      evSentTo: (label: string) => `${label} hedefine gönderildi`,
      fallbackLabel: "bir karıştırma hizmeti",
      evDetail: (coin: string, txCount: number) => `${txCount} işlemde ${coin}.`,
      summaryMatched:
        "Değer, kaynakla hedef arasındaki bağı koparmak için var olan bir hizmete gitti veya oradan geldi; bu, zincir üstü katmanlamanın tanımlayıcı adımıdır.",
      summaryNone:
        "İncelenen pencerede hiçbir karşı taraf karıştırma veya gizlilik hizmeti olarak etiketli değil.",
      counterLawful:
        "Gizlilik araçlarının meşru kullanımları vardır ve çoğu yargı alanında bunları kullanmak tek başına suç değildir.",
      counterAttribution:
        "Yaptırım bulgusu da tetiklenmediyse, karıştırıcı atfı hukuki bir listeye alma değil, üçüncü taraf araştırmasıdır.",
    },

    peelChain: {
      title: "Soyma zinciri",
      family: "Zincir üstü katmanlama",
      summaryNotUtxo:
        "Soyma zinciri tespiti UTXO para üstü yapısını okur ve hesap modelli bir zincire uygulanmaz.",
      summaryMatched: (n: number) =>
        `Penceredeki ${n} giden işlem, biri değerin en az %80'ini taşıyan iki çıktıya bölünmüş; bu, soyma zincirinin ürettiği yapıdır.`,
      summaryNone:
        "İncelenen pencerede soyma ile tutarlı, tekrarlayan iki çıktılı harcama örüntüsü yok.",
      evRepeated: "Tekrarlayan asimetrik iki çıktılı harcamalar",
      evRepeatedDetail: (peels: number, total: number) =>
        `İncelenen ${total} işlemin ${peels} tanesi.`,
      evExample: "Örnek",
      evExampleDetail: (hash: string, date: string) => `${date} tarihinde ${hash}.`,
      counterOrdinary:
        "Sıradan cüzdan harcaması da, ödeme harcanan girdiden küçük olduğunda aynı iki çıktılı biçimi üretir; tek başına para üstü yapısı ikisini ayırt etmez.",
      counterBatching:
        "Ödemeleri toplu işleyen veya sabit para üstü politikası kullanan cüzdanlar, hiçbir katmanlama kastı olmadan bu örüntüyü sürekli üretebilir.",
    },

    passThrough: {
      title: "Hızlı aktarım",
      family: "Kurye / aktarım kanalı davranışı",
      evNothingRetained: "Neredeyse hiçbir şey tutulmamış",
      evNothingRetainedDetail: (share: string, balance: string) =>
        `Alınan her şeyin ${share} kadarı aktarılmış; bakiye şu anda ${balance}.`,
      evShortDwell: "Kısa bekleme süresi",
      evShortDwellDetail: (hours: string) =>
        `Gelen bir işlemle sonraki giden işlem arasında medyan ${hours} saat.`,
      evTurnover: "Devir",
      evTurnoverDetail: (n: string) => `Adres üzerinde ${n} işlem.`,
      summaryMatched:
        "Fonlar gelip neredeyse anında yeniden çıkıyor ve çok azı tutuluyor; bir aktarım kanalı veya kurye adresi böyle davranır.",
      summaryNone:
        "İncelenen pencerede elde tutma ve zamanlama bir aktarım kanalına uymuyor.",
      counterCustodial:
        "Saklayıcı süpürme cüzdanları, ödeme kuruluşları ve birleştirme adresleri tam olarak böyle davranmak üzere tasarlanmıştır.",
      counterWindow:
        "Bekleme süresi yalnızca incelenen pencere üzerinden ölçülür; daha uzun bir geçmiş, bu dilimin göremediği bir elde tutmayı gösterebilir.",
    },

    funnel: {
      title: "Huni toplaması",
      family: "Kurye / toplama ağı",
      summaryMatched: (inDegree: number, outDegree: number) =>
        `${outDegree} alıcıya karşılık ${inDegree} ayrı gönderen bu adreste toplanıyor; bu bir toplama noktasının biçimidir.`,
      summaryNone: "İncelenen pencerede karşı taraf yapısı toplanmıyor.",
      evConvergent: "Toplanan karşı taraf yapısı",
      evConvergentDetail: (ratio: string, degree: number) =>
        `${degree} karşı taraf üzerinde içe toplanma oranı ${ratio}.`,
      evNonRepeating: "Tekrarlamayan gönderenler",
      evNonRepeatingDetail: (share: string) =>
        `Karşı tarafların ${share} kadarı tam olarak bir kez görünüyor.`,
      counterByDesign:
        "Üye iş yeri tahsilatı, bağış adresleri, madencilik ödemeleri ve borsa yatırma adreslerinin hepsi tasarımı gereği toplanır.",
      counterProfile:
        "Toplanma yalnızca bir müşteri profiline karşı anlamlıdır; profil olmadan kastı değil yapıyı tanımlar.",
    },

    dispersal: {
      title: "Dağıtım",
      family: "Katmanlama",
      summaryMatched: (outDegree: number, inDegree: number) =>
        `${inDegree} gönderene karşılık değer ${outDegree} ayrı alıcıya çıkıyor; bu, bir tutarın daha küçük çok sayıda transfere bölünmesiyle tutarlıdır.`,
      summaryNone: "İncelenen pencerede karşı taraf yapısı dağılmıyor.",
      evDivergent: "Dağılan karşı taraf yapısı",
      evDivergentDetail: (ratio: string, degree: number) =>
        `${degree} karşı taraf üzerinde dışa dağılım oranı ${ratio}.`,
      counterByDesign:
        "Bordro, airdrop, madencilik havuzu ödemeleri ve borsa çekim cüzdanları tasarımı gereği dağıtır.",
    },

    uniform: {
      title: "Tekdüze tutarlı katmanlama",
      family: "Katmanlama",
      summaryTooFew:
        "Pencerede tekrarlayan tutarları sınamak için yeterli değerli işlem yok.",
      summaryMatched: (count: number, total: number, amount: string) =>
        `${total} değerli işlemin ${count} tanesi yaklaşık aynı tutarı (${amount}) taşıyor; bu, bir tutarın tekdüze dilimlere bölünmesiyle tutarlıdır.`,
      summaryNone: "İncelenen pencerede baskın bir tekrarlayan işlem tutarı yok.",
      evRepeatedSize: "Tekrarlayan transfer büyüklüğü",
      evRepeatedSizeDetail: (count: number, amount: string, ticker: string, share: string) =>
        `Yaklaşık ${amount} ${ticker} tutarında ${count} işlem; penceredeki değerli işlemlerin ${share} kadarı.`,
      counterRecurring:
        "Abonelik ödemeleri, sabit fiyatlı satışlar, madencilik ödemeleri ve otomatik yeniden dengeleme aynı tutarları tekrar tekrar üretir.",
      counterNoThreshold:
        "Zincir üstü transferlerde etrafından dolaşılacak bir bildirim eşiği yoktur; buradaki tekdüzelik eşik kaçınması değil, katmanlama sinyalidir.",
    },

    dormant: {
      title: "Atıllık sonrası patlama",
      family: "Davranış değişikliği",
      summaryTooFew:
        "Pencerede atıllık kırılmasını sınamak için yeterli zaman damgalı işlem yok.",
      summaryMatched: (days: number, burst: number) =>
        `Adres ${days} gün hareketsiz kaldı, sonra uyanışının bir haftası içinde ${burst} işlem üretti.`,
      summaryNone:
        "İncelenen pencerede uzun atıllığı izleyen yoğunlaşmış faaliyet yok.",
      evDormant: "Atıl dönem",
      evDormantDetail: (from: string, to: string, days: number) =>
        `${from} – ${to}, ${days} gün.`,
      evWaking: "Uyanıştaki faaliyet",
      evWakingDetail: (n: number) => `Yedi gün içinde ${n} işlem.`,
      counterHolders:
        "Pozisyonunu taşıyan uzun vadeli yatırımcılar, kurtarılmış cüzdanlar ve miras devirleri de böyle görünür.",
      counterWindow: "Pencere, daha uzun bir örüntünün ortasından başlıyor olabilir.",
    },

    roundTripping: {
      title: "Çevrim (round-tripping)",
      family: "Katmanlama",
      summaryMatched: (n: number) =>
        `Değer, konunun kendi kümesine geri dönen ${n} karşı taraf yolu üzerinden çıkarılmış; bu, gerçek kontrolü değiştirmeden adım eklemektir.`,
      summaryNone: "Çıkarılan ağdaki hiçbir yol konunun kümesine geri dönmüyor.",
      evReturnPath: "Dönüş yolu",
      evReturnPathDetail: (via: string, back: string) =>
        `${via} üzerinden çıkış, küme üyesi ${back} adresine dönüş.`,
      counterWalletOps:
        "Cüzdan yönetimi, birleştirme ve borsa yatırma-çekme döngüleri hiçbir katmanlama amacı olmadan halka üretir.",
      counterLimited:
        "Tespit yalnızca çıkarılan ağla sınırlıdır; genişletilmemiş bir düğümden geçen halka görünmez.",
    },

    offGraph: {
      title: "İzleme graf dışında sürüyor",
      family: "Soruşturma sınırı",
      summaryMatched: (share: string) =>
        `Gözlenen çıkışın ${share} kadarı bir saklayıcıya veya köprüye ulaşıyor; zincir üstü izleme burada durur ve yalnızca alıcı kurum sürdürebilir.`,
      summaryNone:
        "İncelenen pencerede çıkışın kayda değer bir kısmı etiketli bir saklayıcıya veya köprüye ulaşmıyor.",
      evExit: (label: string) => `Çıkış noktası: ${label}`,
      fallbackLabel: "saklama hizmeti",
      evExitDetail: (coin: string, txCount: number) => `${txCount} işlemde ${coin}.`,
      counterNotRedFlag:
        "Bu bir kırmızı bayrak değil, verinin sınırıdır. Bir borsaya ulaşmak olağan ve beklenendir.",
      counterRequest:
        "Bu noktadan öteye gitmek, daha fazla zincir üstü analiz değil, alıcı kuruma yapılacak bir talep gerektirir.",
    },

    dusting: {
      title: "Gelen toz serpme",
      family: "Atıf saldırısı / gizlilik yoklaması",
      summaryMatched: (count: number, share: string) =>
        `${count} gönderen, harcamanın maliyetinden daha düşük değerde tutarlar gönderdi; bu adrese gönderenlerin ${share} kadarı. Bu örüntü adrese yapılır, adres tarafından değil.`,
      summaryNone: "İncelenen pencerede harcanamayacak küçüklükte bir gelen serpme yok.",
      summaryNoPrice:
        "İncelenen pencere için fiyat bulunamadı; gelen tutarlar ekonomik toz eşiğine karşı sınanamadı.",
      evSpray: "Harcanamayacak tutarlarda serpme",
      evSprayDetail: (dust: number, inbound: number, share: string) =>
        `${inbound} gelen karşı taraftan ${dust} tanesi bir kez 1 USD altında gönderdi ve bir daha görünmedi (${share}).`,
      evNegligible: "Değer taşımıyor",
      evNegligibleDetail: (share: string) =>
        `Bu transferler gelen değerin ${share} kadarını oluşturuyor; toz serpmeyi küçük ödeme işleyen bir hizmetten ayıran da bu.`,
      counterNotConduct:
        "Toz almak, adres sahibinin davranışı değildir. Gönderenin izne ihtiyacı yoktur ve alıcı hiç fark etmemiş olabilir.",
      counterInflates:
        "Toz, bu konunun karşı taraf sayısını ve gelen dağılımını şişirir; yukarıdaki derece ve maruziyet okumaları bundan arındırılarak okunmalıdır.",
      counterFaucet:
        "Musluklar, airdrop'lar, iadeler ve test trafiği hiçbir atıf amacı olmadan aynı şekli üretir.",
    },
    serviceDeweighted:
      "Konu, bu yapının anormallik değil beklenen çalışma biçimi olduğu, atfı yapılmış bir hizmettir.",
  },
};
