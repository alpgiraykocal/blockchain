import type { Dictionary } from "../../types";

/**
 * Turkish UI copy.
 *
 * Typed against the English dictionary, so a key that is added there and not
 * here fails the build. Domain terms that Turkish compliance practice uses in
 * English - OFAC, SDN, tipoloji, hot wallet - are kept in the form an analyst
 * would actually read, rather than translated into coinages nobody uses.
 */
export const ui: Dictionary["ui"] = {
  meta: {
    title: "Blockchain Analysis — kripto varlık graf analitiği",
    titleTemplate: "%s · Blockchain Analysis",
    description:
      "Bitcoin ve Ethereum için adres, varlık ve işlem akışı analizi; açık blok gezgini verileri üzerine kurulu.",
  },

  nav: {
    brand: "Blockchain Analysis",
    dashboard: "Panel",
    investigate: "Soruşturma",
    explorer: "Gezgin",
    tags: "Etiket ve risk",
    primaryLabel: "Ana menü",
    skipToContent: "İçeriğe geç",
    liveDataTitle: "Canlı açık veri",
    liveDataBody:
      "Bitcoin mempool.space, Ethereum Blockscout üzerinden. Kümeleme ve risk puanlaması sınırlı bir işlem penceresi üzerinde yerel olarak çalışır.",
  },

  theme: {
    groupLabel: "Renk teması",
    light: "Açık",
    dark: "Koyu",
    system: "Sistem",
    cycle: (current: string, next: string) =>
      `Renk teması: ${current}. ${next} temasına geç.`,
  },

  language: {
    label: "Dil",
    switchTo: (name: string) => `Dili ${name} olarak değiştir`,
  },

  search: {
    placeholder: "BTC veya ETH adresi ya da ENS adı ara",
    placeholderShort: "Adres ara",
    srLabel: "Adres ara",
    clear: "Aramayı temizle",
    recent: "Son aramalar",
    noMatch: "Eşleşme yok. Tam bir BTC adresi, ETH adresi veya ENS adı gir.",
    failed: "Arama başarısız — bağlantını kontrol edip tekrar dene.",
  },

  common: {
    /** İndirgeme kuralları ve aktör kategorileri veride ve denetim kaydında sabit
     *  birer slug; bunlar onların okunabilir karşılıkları. Eşleşmeyen bir slug
     *  kaybolmak yerine kendisi olarak görünür. */
    reductionRules: {
      "time-window": "zaman penceresi",
      "min-value": "asgari değer",
      direction: "yön",
      "service-hub-suppression": "hizmet merkezleri bastırıldı",
      "top-k": "ilk-K",
      "hop-2-expansion-cap": "ikinci adım sınırı",
      "hard-cap": "kesin tavan",
      "source-window": "kaynak penceresi",
    } as Record<string, string>,
    actorCategories: {
      exchange: "borsa",
      "mining-pool": "madencilik havuzu",
      gambling: "kumar",
      mixer: "karıştırıcı",
      defi: "DeFi",
      bridge: "köprü",
      merchant: "satıcı",
      "wallet-service": "cüzdan hizmeti",
      token: "token",
      individual: "birey",
      unknown: "bilinmiyor",
    } as Record<string, string>,
    riskLevels: {
      clear: "Temiz",
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      severe: "Ağır",
    },
    riskBadgeTitle: (level: string, score: number) => `Risk ${level} — skor ${score}/100`,
    retry: "Tekrar dene",
    couldNotLoad: "Veri yüklenemedi",
    loading: "Yükleniyor…",
    copy: "Kopyala",
    copied: "Kopyalandı",
    copyAddress: "Adresi kopyala",
    table: "Tablo",
    chart: "Grafik",
    showMore: "Daha fazla göster",
    showLess: "Daha az göster",
    of: "/",
    all: "Tümü",
    none: "Yok",
    unknown: "Bilinmiyor",
    openOn: (explorer: string) => `${explorer} üzerinde aç`,
  },

  home: {
    heading: "Kripto varlık graf analitiği",
    lede: "Herhangi bir Bitcoin veya Ethereum adresini ara; bakiyesini, karşı taraflarını, birlikte harcama kümesini ve atıf temelli riskini gör — sonra işlem akışını grafik gezgininde adım adım izle.",
    tagsLoaded: (count: string) => `${count} atıf etiketi yüklü`,
    sanctionsFlagged: (count: string) => `${count} yaptırım işaretli`,
    howTitle: "İnceleme nasıl yürür",
    howDescription: "Bir adres ara, sonra üç mercekten geçir",
    step: (n: number) => `Adım ${n}`,
    steps: {
      investigateTitle: "Soruştur",
      investigateBody:
        "Değerlendirmeyi çalıştır: karşı argümanlarıyla birlikte tipoloji bulguları, bir triyaj kararı ve denetim izi taşıyan taslak dosya.",
      traceTitle: "Akışı izle",
      traceBody:
        "Gönderen ve alanları adım adım aç, iki adres arasındaki en kısa yolu vurgula.",
      attributionTitle: "Atfı kontrol et",
      attributionBody:
        "Bir etiketi hangi yaptırım ve aktör kaynağının ürettiğini, ne kadar güncel olduğunu gör ve kendi etiketlerini ekle.",
    },
    workedExampleBefore: "Her adres önce raporuyla açılır; soruşturma ve grafik aynı konu çubuğunda tek tık uzaklıktadır. Örnek inceleme: ",
    workedExampleLink: "yaptırım listesindeki bir borsa",
    disclaimerLead: "Kararı değil, puanı oku.",
    disclaimerBody:
      " Kümeleme ve risk, açık blok gezginlerinden alınan sınırlı bir işlem penceresi üzerinde hesaplanan sezgisel yöntemlerdir. Her sonucu doğrulanacak bir ipucu olarak ele al, uyum kararı olarak değil.",
    recentTitle: "Son bakılanlar",
    recentDescription: "Yalnızca bu tarayıcıda saklanır",
    recentEmptyTitle: "Henüz kayıt yok",
    recentEmptyBody:
      "İncelediğin adresler burada görünür. Liste yalnızca bu tarayıcıda saklanır ve cihazından çıkmaz.",
    recentClear: "Temizle",
  },

  dashboard: {
    liveFrom: (explorer: string) => `Canlı: ${explorer}`,
    price: "Fiyat",
    change24h: "24s",
    change24hNone: "24s değişim yok",
    blockHeight: "Blok yüksekliği",
    mempool: "Mempool",
    txsToday: "Bugünkü işlem",
    unconfirmedTxs: "onaylanmamış işlem",
    last24h: "son 24 saat",
    avgFee: "Ort. ücret",
    avgFeeHintBtc: "Mempool'daki onaylanmamış işlem başına ortalama ücret",
    avgFeeHintEth: "Ortalama gas fiyatıyla 21.000 gas'lık bir transferin maliyeti",
    seriesBtc: "Medyan ücret oranı (1h)",
    seriesEth: "Günlük işlem sayısı",
    unitBtc: "sat/vB",
    unitEth: "işlem",
    statsFailed: "Zincir istatistikleri yüklenemedi.",
    chainUnavailable: (chain: string, reason: string) => `${chain} kullanılamıyor: ${reason}`,
  },

  address: {
    unknownChain: "Bilinmeyen zincir",
    metaDescription: (chain: string, addr: string) =>
      `${chain} adresi ${addr} için bakiye, karşı taraflar, küme ve risk değerlendirmesi.`,
    notValidTitle: "Geçerli bir adres değil",
    notValidDetail: (value: string, chain: string) =>
      `"${value}" tanınan bir ${chain} adresi değil.`,
    loadFailedTitle: "Bu adres yüklenemedi",
    timeout: (explorer: string) =>
      `${explorer} zamanında yanıt vermedi. Çok büyük işlem geçmişi olan adresler, açık API'nin sunabileceğini düzenli olarak aşar; doğrudan gezginden dene.`,
    upstreamStatus: (explorer: string, status: number) => `${explorer} ${status} yanıtı verdi.`,
    unknownError: "Bilinmeyen hata.",
    openOnExplorer: (addr: string, explorer: string) => `${addr}... adresini ${explorer} üzerinde aç`,
    contract: "Kontrat",
    untagged: "Etiketsiz adres",
    openInvestigation: "Soruşturmayı aç",
    balance: "Bakiye",
    totalReceived: "Toplam alınan",
    totalSent: "Toplam gönderilen",
    windowOnly: "Yalnızca incelenen pencere üzerinden hesaplandı",
    transactions: "İşlemler",
    countersUnavailable: "karşı taraflar kullanılamıyor",
    degrees: (senders: number, receivers: number) =>
      `${senders} gönderen · ${receivers} alan`,
    txListUnavailableTitle: "İşlem listesi kullanılamıyor",
    txListUnavailableBody: (explorer: string, reason: string) =>
      `${explorer} bu adresin işlemlerini sunamadı (${reason}). Yukarıdaki bakiye, ömür boyu toplamlar ve atıf eksiksizdir; karşı taraflar, kümeleme ve derece sayıları bu yükleme için kullanılamıyor. Tekrar denemek için sayfayı yenile veya adresi ${explorer} üzerinde aç.`,
    riskSummary: "Risk özeti",
    riskSummaryDescription: (signals: number, hops: number) =>
      `${signals} sinyal · maruziyet derinliği ${hops} adım`,
    noSignal: "Sinyal yok",
    noSignalDetail: "İncelenen pencerede hiçbir etiket eşleşmedi ve hiçbir yapısal sezgisel tetiklenmedi.",
    furtherSignals: (n: number) => `Bu puana ${n} sinyal daha katkı verdi.`,
    investigationLink: "Soruşturmayı aç",
    investigationLinkAfter:
      " — bu puanın arkasındaki tipoloji bulguları, her birine karşı argümanlar ve önerilen karar için.",
    entityTitle: "Varlık / küme",
    addressCount: (n: string) => `${n} adres`,
    entityId: "Varlık kimliği",
    firstLastSeen: "İlk / son görülme",
    coSpendingMembers: "Birlikte harcama üyeleri",
    accountIdentityNote:
      "Hesap modelli zincirler birlikte harcama sinyali vermez; bir analist birleştirene kadar bir adres bir varlık sayılır.",
    noCoSpendNote:
      "İncelenen pencerede birlikte harcama yapan bir eş görülmedi, bu adres kendi başına bir varlık olarak duruyor.",
    clusterMultiInput: "İncelenen pencere üzerinde çok girdili (birlikte harcama) sezgiseliyle türetildi.",
    clusterAccount: "Hesap modeli — bir adres, bir varlık.",
    clusterNone: "Bu adres için hiçbir kümeleme kuralı birleştirme üretmedi.",
    concentrationTitle: "Karşı taraf yoğunlaşması",
    concentrationDescription: "İncelenen pencerede değere göre en büyük akışlar",
    inbound: "Gelen",
    outbound: "Giden",
    txPanelDescription: (n: number) => `İncelenen pencerede ${n} işlem`,
    windowTitle: "Sınırlı inceleme penceresi",
    windowPulled: (analysed: number, total: string, explorer: string) =>
      `${total} işlemin ${analysed} tanesi ${explorer} üzerinden alındı.`,
    windowTotalsWindowed: " Alınan ve gönderilen toplamlar tüm geçmiş üzerinden değil, bu pencere üzerinden hesaplanır.",
    windowTotalsFull: " Bakiye ve ömür boyu toplamlar gezginden gelir ve tüm geçmişi kapsar.",
    windowClusterPartial: " Kümeleme yalnızca pencere içindeki birlikte harcamaları görür, dolayısıyla varlık tüm zincirde daha büyük olabilir.",
  },

  investigate: {
    metaTitle: "Soruşturma",
    metaDescription:
      "Bir Bitcoin veya Ethereum adresi üzerinde AML/CTF soruşturması aç: ego ağı analizi, tipoloji bulguları, triyaj kararı ve taslak dosya.",
    heading: "Soruşturma",
    lede: "Tek bir konu etrafında ego ağı çıkarımı yapar, etkinliği adlandırılmış kara para aklama tipolojilerine karşı sınar ve kanıtlarla birlikte karşı argümanları içeren bir dosya taslağı hazırlar.",
    chooseSubject: "Bir konu seç",
    chooseSubjectBody:
      "İncelenecek adresi gir. Değerlendirme, blok gezgininin sunduğu işlem penceresini kapsar ve sonuç çıkardığı her yerde bunu belirtir.",
    workedExamples: "Ya da hazır bir örnek aç",
    exampleLazarusHint: "Konunun kendisi yaptırım listesinde. Yükseltme ve kesin durdurma beklenir.",
    exampleSuexHint: "Büyük bir birlikte harcama kümesi olan, yaptırım listesindeki borsa.",
    exampleBinanceHint: "Atfı yapılmış hizmet. Yapısal bulgular beklenir ve ağırlığı düşürülür.",
    disclaimer:
      "Çıktı insan incelemesini destekler. Tipoloji eşleşmeleri “ile tutarlı” bulgulardır, öncelik puanları bir kuyruğu sıralar ve buradaki hiçbir şey birinin suç işlediğini ortaya koymaz. Bildirim kararları ve müşteriye yönelik işlemler nitelikli bir uyum uzmanına aittir.",
  },

  investigation: {
    headline: (addr: string) => `Soruşturma · ${addr}`,
    assessmentFailed: "Değerlendirme çalıştırılamadı",
    running: "Ego ağı çıkarılıyor ve tipoloji seti çalıştırılıyor…",
    contract: "Kontrat",
    untagged: "Etiketsiz adres",
    noTxTitle: "İşlem verisi yok — aşağıdaki değerlendirme eksiktir",
    noTxBody: (explorer: string, reason: string) =>
      `${explorer} bu adresin işlemlerini sunamadı (${reason}). Bakiye ve atıf hâlâ doğrudur; ancak ego ağı, tüm metrikler ve tüm davranışsal dedektörler üzerinde çalışacak veri bulamadı. Buradaki bir bulgunun yokluğu, temiz bir sonuç değil, veri yokluğu anlamına gelir.`,
    triagePriority: (priority: number) =>
      `Triyaj önceliği ${priority}/100. Bu, analistin kuyruğunu sıralar; şüpheli işlem tespiti değildir ve bildirim tetiklemez.`,
    drivers: "Etkenler",
    mitigants: "Hafifletici unsurlar",
    nextSteps: "Önerilen sonraki adımlar",
    noneRecorded: "Kayıt yok.",
    wouldChange: "Bu öneriyi ne değiştirir",
    counterparties: "Karşı taraflar",
    inOut: (inn: number, out: number) => `${inn} gelen · ${out} giden`,
    received: "Alınan",
    sent: "Gönderilen",
    retained: "Tutulan",
    passedOn: (share: string) => `${share} aktarıldı`,
    retainedHint: "Alınan her şeyin hâlâ elde tutulan payı",
    medianDwell: "Medyan bekleme",
    dwellSecondary: "gelenden sonraki gidene kadar",
    riskProximity: "Risk yakınlığı",
    riskProximityValue: (count: number) => `${count} karşı taraf`,
    riskProximitySecondary: (share: string) => `gözlenen akışın ${share}`,
    riskProximityHint:
      "Yaptırım listesinde olan ya da karıştırıcı olarak sınıflanan doğrudan karşı taraflar ve incelenen pencerede hareket eden değerdeki payları. Borsa, token ya da kumar etiketi bir kategoridir, kaygı değil; sayılmaz. Yakınlık maruziyettir, davranış değil: böyle bir taraftan gelen değer talep edilmemiş olabilir.",
    burst: "Yoğunluk",
    activeDays: (n: number) => `${n} etkin gün`,
    burstHint: "En yoğun günün, günlük ortalama işlem sayısına oranı",
    findingsTitle: "Tipoloji bulguları",
    findingsDescription: (matched: number, context: number, clear: number) =>
      `${matched} eşleşti · ${context} bağlamsal · ${clear} eşleşmedi`,
    notMatched: (n: number) => `Sınanan ve eşleşmeyen ${n} tipoloji`,
    egoNetwork: "Ego ağı",
    networkDescription: (nodes: number, edges: number, hop: number) =>
      `${nodes} düğüm · ${edges} bağlantı · ${hop} adım`,
    nothingTimeWindow: (days: number, removed: number) =>
      `Son ${days} günde etkin karşı taraf yok; pencere ${removed} tanesini düşürdü. Yukarıdaki bulgular ve metrikler yine tam dilimi kapsıyor — çizdirmek için pencereyi genişlet.`,
    assetLabel: "Varlık",
    assetNative: "yerel coin",
    assetToken: "token",
    assetNote: (symbol: string) =>
      `Bu sayfadaki her rakam ${symbol} cinsindendir. Varlık değiştirmek dedektörleri yalnız o varlığın transferleri üzerinde yeniden çalıştırır.`,
    windowLabel: "Pencere",
    windowFull: "Tam dilim",
    windowDays: (days: number) => `Son ${days}g`,
    windowNarrowed: (days: number) =>
      `Çizilen ağ, son ${days} günde etkin olan karşı taraflara daraltıldı. Metrikler tam dilim üzerinde kalır.`,
    hop1: "1 adım",
    hop2: "2 adım",
    dirBoth: "İkisi",
    dirIn: "Gelen",
    dirOut: "Giden",
    topK: "İlk-K",
    hubsShown: "Merkezler açık",
    hubsDamped: "Merkezler bastırılmış",
    nothingToDraw: "Çizilecek karşı taraf yok",
    nothingUpstream: (explorer: string) =>
      `${explorer} işlem listesini sunamadı, bu yüzden konunun etrafına yerleştirilecek karşı taraf yok. Yukarıdan tekrar dene.`,
    nothingDirection: (direction: string) =>
      `İncelenen pencerede ${direction} karşı taraf yok. Yön filtresini "İkisi" konumuna geri al.`,
    directionSending: "gönderen",
    directionReceiving: "alan",
    nothingEmptyWindow: (analysed: number) =>
      `Gezginin döndürdüğü ${analysed} işlemde konunun hiç karşı tarafı yok. Bu boş bir penceredir, temizlenmiş bir adres değil.`,
    rerunning: "Yeniden çalışıyor…",
    nodeSummary: (ring: number, priority: number, risk: number, value: string, tx: number) =>
      `Halka ${ring} · öncelik ${priority} · risk ${risk} · ${tx} işlemde ${value}`,
    legendSubject: "Konu",
    legendRing1: "Halka 1 = doğrudan karşı taraflar",
    legendRing2: "Halka 2 = bir adım ötesi",
    legendHub: "Hizmet merkezi, bastırılmış",
    legendHighRisk: "Yüksek risk",
    reductionApplied: (steps: string) =>
      `Uygulanan indirgeme: ${steps}. Çizilen ağ filtrelenmiş bir görünümdür; yukarıdaki metrikler indirgenmemiş küme üzerinde hesaplanır.`,
    expansionsFailed: (n: number) => `${n} genişletme başarısız oldu ve ağda yer almıyor.`,
    counterpartiesDescription: "Ağın metin karşılığı, triyaj önceliğine göre sıralı",
    colPriority: "Öncelik",
    colPriorityHint: "Risk, değer payı ve güncelliğin bileşimi. Yalnızca triyaj yardımcısı.",
    colRing: "Halka",
    colCounterparty: "Karşı taraf",
    colDirection: "Yön",
    colValue: "Değer",
    colTxs: "İşlem",
    colRisk: "Risk",
    badgeService: "hizmet",
    badgeIn: "gelen",
    badgeOut: "giden",
    badgeBoth: "iki yönlü",
    badgeSelf: "konu",
    tableCaption: "Çıkarılan ego ağındaki karşı taraflar",
  },

  tags: {
    metaTitle: "Etiket ve risk",
    metaDescription:
      "Yüklü atıf TagPack'lerine göz at, kendi yerel etiketlerini yönet ve risk puanının nasıl türetildiğini oku.",
    heading: "Etiket ve risk",
    lede: "Atıf, anonim bir adresi bir aktöre dönüştüren şeydir. Blockchain Analysis açık TagPack'lerle gelir ve üzerine kendi etiketlerini katmanlamana izin verir — ikisi de aynı risk modelini besler.",
    packsTitle: "Yüklü TagPack'ler",
    packsDescription: (tags: string, packs: number) => `${packs} pakette ${tags} etiket`,
    by: (creator: string) => `${creator} tarafından`,
    autoSynced: "otomatik eşitlenen",
    daysOld: (days: number) => `${days} gün önce`,
    tagCount: (n: string) => `${n} etiket`,
    abuseCount: (n: string) => `${n} kötüye kullanım`,
    lastModified: (date: string) => `Son değişiklik ${date}`,
    source: "kaynak",
    scoreTitle: "Risk puanı nasıl çalışır",
    scoreDescription: "Belirlenimci, açıklanabilir ve her zaman sinyalleriyle birlikte gösterilir",
    step1Lead: "1. Doğrudan atıf.",
    step1Body:
      " Adresin kendisindeki bir etiket, kötüye kullanım ağırlığını etiketin güveniyle ölçeklenmiş olarak katar. Yaptırımlar puanı 100'de doyurur.",
    step2Lead: "2. Adım bazlı maruziyet.",
    step2Body:
      " Etiketli bir karşı taraf aynı ağırlığı adım başına 0,55 ile azaltılmış olarak katar; sonra o karşı tarafın gözlenen akıştaki payıyla ölçeklenir.",
    step3Lead: "3. Yapısal sezgiseller.",
    step3Body:
      " İçe toplanma, dışa dağılım ve tekrarlamayan karşı taraf örüntüleri temiz bir adresi orta banda taşır — tek başlarına asla yüksek banda itmez.",
    step4Lead: "4. En büyük olan kazanır.",
    step4Body:
      " Sinyaller toplanarak birikmez; böylece güçlü tek bir bulgu, çok sayıda zayıf bulguyla sulandırılamaz.",
    bandsCaption: "Risk puanı bantları",
    colScore: "Puan",
    colLevel: "Seviye",
    colMeaning: "Anlamı",
    levelClear: "Temiz",
    levelLow: "Düşük",
    levelMedium: "Orta",
    levelHigh: "Yüksek",
    levelSevere: "Ağır",
    bandClear: "Hiçbir atıf eşleşmedi ve hiçbir yapısal sezgisel tetiklenmedi.",
    bandLow: "Zayıf veya uzak sinyal — not etmeye değer, işlem yapmaya değil.",
    bandMedium: "Yapısal örüntü ya da azaltılmış çok adımlı maruziyet.",
    bandHigh: "Güçlü doğrudan atıf ya da bir kötüye kullanım kategorisine yakın maruziyet.",
    bandSevere: "Yaptırım eşleşmesi veya eşdeğeri — puan değil, kesin durdurma.",
    staleTitle: (days: number) => `Yaptırım anlık görüntüsü ${days} günlük`,
    staleBodyBefore: "OFAC iş günlerinde yayımlar. Temiz bir sonuca güvenmeden önce ",
    staleBodyAfter:
      " komutunu yeniden çalıştır — eski bir anlık görüntüde listeye alınmamış olmak aklama değildir.",
    ofacTitle: "OFAC yaptırım anlık görüntüsü",
    ofacDescription:
      "Doğrudan OFAC Sanctions List Service'ten alındı — elle tutulan yaptırım verisi yok",
    screenable: (n: string) => `${n} taranabilir`,
    fieldSource: "Kaynak",
    fieldIssued: "Liste yayım tarihi",
    fieldRetrieved: "Alınma",
    fieldAddresses: "Dosyadaki adres",
    fileLine: (mb: string, addresses: string) => `${mb} MB · ${addresses} adres`,
    byCurrency: "Para birimine göre",
    currencyScreened: "Blockchain Analysis tarafından taranıyor",
    currencyStored: "Anlık görüntüde saklanıyor; bu zincir için henüz adaptör yok",
    topProgrammes: "Öne çıkan programlar",
    hitNote:
      "Eşleşme, yayımlanmış bir adres üzerinde birebir tanımlayıcı eşleşmesidir. Listeye alınmış bir tarafın kontrol ettiği ancak hiç yayımlanmamış adresleri ya da %50 Kuralı uyarınca türev olarak bloke olan varlıkları kapsamaz — ikisi de bu dosyadan türetilemez.",
    ofacDesignated: "Listedeki taraf",
    ofacColProgramme: "Program",
    ofacColType: "Tür",
    ofacColDesignated: "Listeye alınma",
    ofacShowing: (shown: number, total: number) =>
      `Taranabilir ${total} adresin ${shown} tanesi gösteriliyor`,
    ofacFilteredFrom: (all: number) => ` (${all} adres arasından süzüldü).`,
    ofacFilter: "Tarafa, adrese, programa veya zincire göre filtrele",
    ofacCaption: "Desteklenen zincirlerdeki OFAC listesindeki dijital para adresleri",
    ofacNoMatch: "Eşleşme yok",
    ofacNoMatchBody:
      "Mevcut anlık görüntüde bu filtreyle eşleşen bir şey yok. Buradaki bir boşluk aklama değildir — işlem yapmadan önce adresi canlı listeye karşı tara.",
    feedsTitle: "Açık etiket kaynakları",
    feedsDescription: "Açık kaynaklardan aktör atfı",
    feedsPanelDescription:
      "Açık depolardan yeniden oluşturulmuş borsa, madencilik havuzu, DeFi ve hizmet atfı",
    feedsNoSnapshot: "Diskte etiket anlık görüntüsü yok",
    feedsNoSnapshotBefore: ". Oluşturmak için ",
    feedsNoSnapshotAfter:
      " komutunu çalıştır. Yaptırım taraması etkilenmez — o kaynak ayrı paketlenir.",
    feedsProfile: (profile: string) => `profil: ${profile}`,
    feedsAddresses: (n: string) => `${n} adres`,
    feedsAddressesLabel: "adres",
    feedsRevision: "revizyon",
    feedsUnknown: "bilinmiyor",
    feedsCoverage: "Kapsam",
    feedsTotals: (chains: string, labels: string, actors: string, built: string) =>
      `${chains} · ${labels} ayrı etiket · ${actors} adlandırılmış aktör · ${built} tarihinde oluşturuldu`,
    feedsExcluded: (title: string) => `Hariç tutuldu: ${title}`,
    feedsLicence: (licence: string) => `(lisans: ${licence})`,
    feedsTopActors: "En çok etiketlenen aktörler",
    feedsNote:
      "Aktör etiketleri bir adresin kime ait olduğunu tanımlar. Yayımlayan kaynaktan bir güven ağırlığı taşır ve tek başlarına asla bir kötüye kullanım kategorisi atamaz — bir hizmetin büyük ya da şeffaf olmaması tek başına bir risk bulgusu değildir. Yaptırımlar yalnızca OFAC'tan gelir.",
    yourTags: "Etiketlerin",
    yourTagsDescription: "Yalnızca bu tarayıcıda saklanır — hiçbir yere yüklenmez.",
    exportName: "Blockchain Analysis yerel analist etiketleri",
    allRemoved: "Tüm yerel etiketler kaldırıldı.",
    confirmDeleteAll: "Tümünü silmeyi onayla",
    deleteAll: "Tümünü sil",
    localTagsCaption: "Yerel olarak saklanan analist etiketleri",
    noLocalTags: "Henüz yerel etiket yok",
    noLocalTagsBody:
      "Aşağıdan bir atıf ekle veya bir TagPack JSON dışa aktarımını içe aktar. Yerel etiketler hiçbir şeyi geçersiz kılmaz — yüklü paketlerin yanında durur.",
    colTag: "Etiket",
    colAddress: "Adres",
    colChain: "Zincir",
    colAbuse: "Kötüye kullanım",
    colConfidence: "Güven",
    colAdded: "Eklendi",
    deleteTag: (label: string) => `${label} etiketini sil`,
    deleted: (label: string) => `"${label}" silindi.`,
    imported: (n: number) => `${n} etiket içe aktarıldı.`,
    importFailed: (reason: string) => `İçe aktarma başarısız: ${reason} Dosyayı düzeltip tekrar dene.`,
    importUnreadable: "dosya okunamadı.",
    importAction: "İçe aktar",
    exportAction: "Dışa aktar",
    addTag: "Etiket ekle",
    addTagDescription: "Bir dosyayı işlerken kaydettiğin atıf",
    formChain: "Zincir",
    formLabel: "Ad",
    formLabelPlaceholder: "örn. Acme Exchange yatırma",
    formAddress: "Adres",
    formActorCategory: "Aktör kategorisi",
    formConfidence: (pctValue: number) => `Güven — %${pctValue}`,
    formNotes: "Notlar",
    formNotesHelper: "Dosya için isteğe bağlı bağlam.",
    formNotesPlaceholder: "Atfın nereden geldiği, kayıt numarası, …",
    formSubmit: "Etiket ekle",
    formSaved: "Etiket bu tarayıcıya kaydedildi",
    formAddressRequired: "Bu etiketin uygulanacağı adresi gir.",
    formLabelRequired: "Etikete bir analistin tanıyacağı bir ad ver.",
    formLabelHint: "Grafik düğümünde ve her tabloda gösterilir.",
    formAddressHint: "Bu atfın ait olduğu adres veya varlık.",
    formAbuseType: "Kötüye kullanım türü",
    formAbuseHint: "Risk puanını belirler.",
    formConfidenceHint: "Etiketin puanı ne kadar güçlü hareket ettireceğini ölçekler.",
  },

  graph: {
    metaTitle: "Grafik gezgini",
    metaDescription:
      "Adres ve varlık karşı taraflarını adım adım genişlet, Bitcoin ve Ethereum genelinde işlem akışını izle.",
    heading: "Grafik gezgini",
    headingHint:
      "Seçmek için tıkla, genişletmek için çift tıkla. Her genişletme, canlı gezgin verisinden bir adım karşı taraf çeker.",
    exampleExchangeHint: "Borsa merkezi - etiketli karşı taraflara yoğun dağılım.",
    exampleDefiHint: "DeFi yönlendirici - açık kaynaklardan kontrat atfı.",
    exampleSanctionedHint: "OFAC yaptırımlı - ağır risk ve büyük bir birlikte harcama kümesi.",
    inspector: "İnceleyici",
    flowDescription: (nodes: number, links: number, expanded: number) =>
      `${nodes} düğüm · ${links} bağlantı · ${expanded} genişletildi`,
    dismiss: "Kapat",
    flowTitle: "İşlem akışı",
    adjacencyTitle: "Komşuluk listesi",
    adjacencyDescription: "Tuvalin metin karşılığı — sıralanabilir ve ekran okuyucu dostu.",
    canvasLabel: "İşlem akışı grafiği. Metin karşılığı için aşağıdaki komşuluk tablosunu kullan.",
    radialLabel: "Radyal ego ağı. Aşağıdaki karşı taraf tablosu aynı veriyi metin olarak taşır.",
    noNodeSelected: "Düğüm seçilmedi",
    noNodeSelectedBody:
      "Atfını, bakiyesini ve risk sinyallerini incelemek için tuvalde bir düğüme tıkla. Genişletmek için çift tıkla.",
    pathAnchorSet: "Yol çıpası kuruldu",
    setPathAnchor: "Yol çıpası kur",
    inOutDegree: "Gelen / giden derece",
    inOutDegreeHint: "İncelenen penceredeki ayrı karşı taraflar",
    lastActivity: "Son etkinlik",
    counterpartyRisk: "Karşı taraf riski",
    adjacencyCaption: "Grafik tuvalindeki her kenarın komşuluk listesi",
    noLinks: "Tuvalde henüz bağlantı yok",
    noLinksBody:
      "Grafiği başlatmak için bir adres ara, sonra karşı taraflarını çekmek için bir düğümü genişlet.",
    legendAddress: "Adres",
    legendExchange: "Borsa",
    legendUntagged: "Etiketsiz",
    legendHighRiskRing: "Yüksek risk halkası",
    legendFocus: "Odak düğümü",
    investigationMetaDescription:
      "AML/CTF soruşturma çalışma alanı: ego ağı analizi, tipoloji bulguları, triyaj kararı ve taslak dosya.",
    investigationMetaTitle: (ticker: string, addr: string) => `Soruşturma · ${ticker} ${addr}`,
    legendEntity: "Varlık (küme)",
    legendMixer: "Karıştırıcı / yaptırımlı",
    legendService: "Hizmet / DeFi",
    expansionFailed: "Genişletme başarısız.",

    seedTitle: "Grafiği bir adresle başlat",
    seedBody:
      "Tuvale ilk düğümü koy, sonra karşı taraflarını adım adım genişletip akışı izle.",
    orStartFromExample: "Ya da bir örnekten başla",
    fanOut: "Dağılım",
    fit: "Sığdır",
    relayout: "Yeniden diz",
    clear: "Temizle",
    expanding: (count: number) => `${count} düğüm genişletiliyor\u2026`,
    anchor: (address: string) => `Çıpa: ${address}`,
    pathFound: (hops: number) => ` \u00b7 yol bulundu (${hops} adım)`,
    noPathInGraph: " \u00b7 mevcut grafikte yol yok",
    selectSecondNode: " \u00b7 ikinci bir düğüm seç",
    truncatedNodes: (count: number) => `${count} düğüm en büyük karşı taraflara kırpıldı`,
    attribution: "Atıf",
    noTagMatch: "Bu adresle eşleşen bir TagPack kaydı yok.",
    riskSignals: "Risk sinyalleri",
    openFullReport: "Tam adres raporunu aç",
    viewOn: (explorer: string) => `${explorer} üzerinde gör`,
  },

  transactions: {
    netEffect: "Net etki",
    txVolume: "İşlem hacmi",
    txVolumeHint: "İşlemin tüm çıktıları üzerinden taşıdığı toplam değer",
    ioHint: "İşlemdeki girdi ve çıktı sayısı",
    caption: "İncelenen penceredeki işlemler",
    empty: "İncelenen pencerede işlem yok",
    emptyBody: "Bu adresin, üst kaynak gezginin döndürebileceği bir işlem geçmişi yok.",
  },

  subject: {
    reportHint: "Bakiyeler, küme, işlemler",
    investigationHint: "Tipolojiler, karar, dosya",
    graphHint: "Serbest genişletme",
    viewsLabel: "Konu görünümleri",
    report: "Rapor",
    investigation: "Soruşturma",
    graph: "Grafik",
  },

  flow: {
    noSenders: "Gönderen gözlenmedi",
    noReceivers: "Alan gözlenmedi",
    noneBody: "İncelenen işlem penceresinde bu yönde hiçbir karşı taraf görünmedi.",
  },

  chart: {
    noSeries: "Seri verisi yok",
    noSeriesBody: "Üst kaynak gezgin bu metrik için bir geçmiş döndürmedi.",
  },

  packs: {
    /** Uygulamanın kendi paketleri hakkında yazdığı başlık ve açıklamalar.
     *  Üstlerindeki kaynak adları - "OFAC SDN", "GraphSense public TagPacks" -
     *  yayıncıların kendilerine verdiği addır ve her dilde yayınlandığı gibi kalır. */
    ofacDescription: (addresses: number, currencies: number, screenable: number) =>
      `OFAC'ın yaptırım listelerinde yayımlanan her dijital para adresi, doğrudan kaynak dosyalardan alınmıştır. ${currencies} para biriminde ${addresses} adres; bunların ${screenable} tanesi Blockchain Analysis'in tarayabildiği bir zincirde.`,
    generatedDescription: (revision: string) =>
      `Aktör atfı, kaynak deponun ${revision} sürümünden yeniden derlendi.`,
    unknownRevision: "bilinmeyen",
    curated: {
      "public-exchanges": {
        title: "Halka açık borsa sıcak cüzdanları",
        description:
          "Yaygın olarak yayımlanmış saklamalı sıcak cüzdan adresleri. Akışın bittiği nokta olarak işe yarar — buralara ulaşan fonlar kendi saklamasından çıkmıştır.",
      },
      "l1-bridges": {
        title: "L1 köprü kontratları",
        description:
          "Rollup ve zincirler arası köprülerin Ethereum ana ağ giriş noktaları. Her adres Blockscout üzerinde kendi Bridge etiketini taşıyor, yani atıfın ikinci bir kaynağı var; o etiketi taşımayan adaylar dışarıda bırakıldı.",
      },
      "known-services": {
        title: "Bilinen hizmetler ve protokoller",
        description: "Grafikte sıkça merkez olarak beliren köprüler, DeFi yönlendiricileri ve madencilik havuzları.",
      },
    } as Record<string, { title: string; description: string }>,
  },

  errors: {
    notFound: "Üst kaynak gezginde bulunamadı.",
    rateLimited: "Üst kaynak hız sınırına ulaşıldı. Birkaç saniye bekleyip tekrar dene.",
    upstreamFailed: "Üst kaynak gezgin isteği başarısız oldu.",
    timeout: "Üst kaynak isteği zaman aşımına uğradı.",
    unexpected: "Beklenmeyen sunucu hatası.",
    rateLimitTitle: "Hız sınırına ulaşıldı.",
    rateLimitDetail: (limit: number, retryAfter: number) =>
      `Bu dağıtım ücretsiz açık blok gezginlerini vekiller ve çağıranları dakikada ${limit} istekle sınırlar. ${retryAfter} saniye sonra tekrar dene.`,
    unknownChain: "Bilinmeyen veya eksik `chain`. btc ya da eth kullan.",
    notJsonObject: "Dosya bir JSON nesnesi değil.",
  },

  notFound: {
    title: "Sayfa bulunamadı",
    bodyBefore: "Böyle bir yol yok. Adresler şurada: ",
    bodyAfter: ".",
    back: "Panele dön",
  },
};
