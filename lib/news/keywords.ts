export type KeywordCategory = "RISKY" | "POSITIVE" | "NEGATIVE" | "TOPIC";

export interface WeightedKeyword {
  word: string;
  weight: number;
  category: KeywordCategory;
  tag?: string;
}

/** 1 — Piyasa pozitif (40) */
export const PIYASA_POZITIF: readonly string[] = [
  "Barış anlaşması",
  "diplomatik çözüm",
  "ateşkes ilan edildi",
  "Hürmüz boğazı açıldı",
  "normalleşme süreci",
  "siyasi mutabakat",
  "yatırımcı güveni",
  "dip alımları",
  "teknoloji rallisi",
  "yapay zeka talebi",
  "likidite artışı",
  "sermaye girişi",
  "ekonomik büyüme",
  "istikrar sağlandı",
  "gerginlik azaldı",
  "piyasa iyimserliği",
  "kurumsal alım",
  "yabancı yatırım",
  "teşvik paketi",
  "mali disiplin",
  "vergi indirimi",
  "kredi notu artışı",
  "bilanço başarısı",
  "nakit akışı",
  "temettü verimi",
  "hisse geri alımı",
  "endeks yükselişi",
  "enflasyon düşüşü",
  "faiz indirimi",
  "merkez bankası desteği",
  "küresel ticaret",
  "arz güvenliği",
  "tedarik zinciri",
  "sanayi üretimi",
  "tüketici güveni",
  "perakende artışı",
  "konut sektörü",
  "altyapı yatırımı",
  "enerji anlaşması",
  "ihracat rekoru",
];

/** 2 — Piyasa negatif / risk (40) */
export const PIYASA_NEGATIF: readonly string[] = [
  "Savaş riski",
  "jeopolitik gerilim",
  "saldırı haberi",
  "ambargo kararı",
  "enerji krizi",
  "enflasyonist baskı",
  "faiz artırımı",
  "stagflasyon riski",
  "resesyon korkusu",
  "tedarik darboğazı",
  "döviz dalgalanması",
  "bütçe açığı",
  "kredi notu düşüşü",
  "şirket iflası",
  "işsizlik artışı",
  "sektörel daralma",
  "piyasa paniği",
  "sert satış",
  "yabancı çıkışı",
  "likidite sıkışıklığı",
  "dış ticaret açığı",
  "jeopolitik risk",
  "bölge çatışması",
  "ambargo tehdidi",
  "yaptırım kararı",
  "merkez bankası şahin",
  "nakit sıkıntısı",
  "borç krizi",
  "hisse senedi düşüşü",
  "satış baskısı",
  "marj daralması",
  "hammadde maliyeti",
  "lojistik sorunu",
  "siyasi belirsizlik",
  "seçim riski",
  "protesto eylemi",
  "grev kararı",
  "üretim kaybı",
  "pazar kaybı",
  "karamsar görünüm",
];

/** 3 — Aktörler ve konu başlıkları (58) */
export const AKTOR_KONU: readonly string[] = [
  "Trump",
  "Fed",
  "TCMB",
  "BIST100",
  "Hürmüz",
  "İran",
  "ABD",
  "İsrail",
  "Beyrut",
  "İsviçre",
  "OECD",
  "Euro Bölgesi",
  "Çin ekonomisi",
  "teknoloji",
  "ulaştırma",
  "bankacılık",
  "enerji",
  "petrol",
  "doğalgaz",
  "yenilenebilir",
  "karbon",
  "ihracat",
  "ithalat",
  "döviz",
  "dolar",
  "altın",
  "tahvil",
  "faiz",
  "büyüme",
  "istihdam",
  "üretim",
  "sanayi",
  "perakende",
  "konut",
  "altyapı",
  "teknoloji",
  "yapay zeka",
  "tarım",
  "otomotiv",
  "savunma",
  "sağlık",
  "turizm",
  "lojistik",
  "finans",
  "emtia",
  "borsa",
  "hisse",
  "portföy",
  "risk",
  "getiri",
  "strateji",
  "analiz",
  "beklenti",
  "tahmin",
  "rapor",
  "veri",
  "açıklama",
  "toplantı",
];

/** Tum tarama listesi (138) */
export const KEYWORD_LIST: readonly string[] = [
  ...PIYASA_POZITIF,
  ...PIYASA_NEGATIF,
  ...AKTOR_KONU,
];

const RISKY_NEGATIF = new Set(
  [
    "Savaş riski",
    "jeopolitik gerilim",
    "saldırı haberi",
    "ambargo kararı",
    "enerji krizi",
    "stagflasyon riski",
    "resesyon korkusu",
    "jeopolitik risk",
    "bölge çatışması",
    "ambargo tehdidi",
    "yaptırım kararı",
    "borç krizi",
    "piyasa paniği",
    "sert satış",
  ].map((s) => s.toLowerCase())
);

function toWeightedPositive(phrase: string): WeightedKeyword {
  const strong =
    /barış|anlaşma|ateşkes|faiz indirimi|vergi indirimi|teşvik|ihracat rekoru|yatırımcı güveni/i.test(
      phrase
    );
  return {
    word: phrase,
    weight: strong ? 3 : 2,
    category: "POSITIVE",
    tag: /barış|anlaşma|ateşkes/i.test(phrase) ? "Baris" : undefined,
  };
}

function toWeightedNegative(phrase: string): WeightedKeyword {
  const lower = phrase.toLowerCase();
  if (RISKY_NEGATIF.has(lower)) {
    return {
      word: phrase,
      weight: /savaş|saldırı|ambargo|yaptırım|jeopolitik|bölge çatışması/i.test(
        phrase
      )
        ? 4
        : 3,
      category: "RISKY",
      tag: /savaş|saldırı/i.test(phrase)
        ? "Savas"
        : /jeopolitik|ambargo|yaptırım/i.test(phrase)
          ? "Jeopolitik"
          : "Risk",
    };
  }
  return {
    word: phrase,
    weight: /faiz artırımı|iflas|panik|kriz|resesyon/i.test(phrase) ? 3 : 2,
    category: "NEGATIVE",
  };
}

function toWeightedTopic(phrase: string): WeightedKeyword {
  return {
    word: phrase,
    weight: 0,
    category: "TOPIC",
    tag: ["Trump", "Fed", "TCMB", "BIST100", "Hürmüz", "İran"].includes(phrase)
      ? phrase
      : undefined,
  };
}

export const KEYWORD_BANK: WeightedKeyword[] = [
  ...PIYASA_POZITIF.map(toWeightedPositive),
  ...PIYASA_NEGATIF.map(toWeightedNegative),
  ...AKTOR_KONU.map(toWeightedTopic),
];

export const SORTED_KEYWORDS = [...KEYWORD_BANK].sort(
  (a, b) => b.word.length - a.word.length
);

export const KRITIK_KELIMELER: readonly string[] = KEYWORD_LIST;
