export type KapCategory =
  | "BILANCO"
  | "TEMETTU"
  | "SERMAYE"
  | "HAK"
  | "YONETIM"
  | "DIGER";

export interface KapClassification {
  category: KapCategory;
  priority: boolean;
  label: string;
}

const RULES: { category: KapCategory; label: string; patterns: RegExp[] }[] = [
  {
    category: "BILANCO",
    label: "Finansal tablo",
    patterns: [
      /finansal tablo/i,
      /bilanço/i,
      /gelir tablosu/i,
      /nakit ak/i,
      /faaliyet raporu/i,
      /mali tablo/i,
      /konsolide/i,
    ],
  },
  {
    category: "TEMETTU",
    label: "Temettü / kar payı",
    patterns: [
      /temettü/i,
      /kar pay/i,
      /kâr pay/i,
      /temettu/i,
    ],
  },
  {
    category: "SERMAYE",
    label: "Sermaye / birleşme",
    patterns: [
      /bedelsiz/i,
      /bedelli/i,
      /sermaye art/i,
      /birleşme/i,
      /bölünme/i,
      /halka arz/i,
      /pay geri al/i,
      /ihraç/i,
    ],
  },
  {
    category: "HAK",
    label: "Rüçhan / hak kullanım",
    patterns: [/rüçhan/i, /ruchan/i, /hak kullan/i, /kupon/i],
  },
  {
    category: "YONETIM",
    label: "Yönetim / genel kurul",
    patterns: [
      /genel kurul/i,
      /yönetim kurulu/i,
      /bağımsız denet/i,
      /politika/i,
    ],
  },
];

export function classifyKapTitle(title: string): KapClassification {
  const normalized = title.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        category: rule.category,
        priority: rule.category !== "YONETIM",
        label: rule.label,
      };
    }
  }

  return {
    category: "DIGER",
    priority: false,
    label: "Genel bildirim",
  };
}

export function isPriorityKapTitle(title: string): boolean {
  return classifyKapTitle(title).priority;
}
