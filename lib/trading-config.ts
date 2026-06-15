/** Tek taraf komisyon orani (ornek: 0.001 = %0.1) */
export const COMMISSION_RATE = 0.001;

/** AL sinyali icin minimum net kar potansiyeli (%) */
export const MIN_NET_PROFIT_PERCENT = 1.5;

/** Sinyal basari degerlendirme suresi (saat) */
export const SIGNAL_EVAL_HOURS = 24;

/** AL sinyali basari esigi (%) */
export const SIGNAL_WIN_THRESHOLD = 1.0;

/** AL sinyali basarisizlik esigi (%) */
export const SIGNAL_LOSS_THRESHOLD = -1.5;

/** Dusuk hacimde AL sinyali zayiflatma — gunluk islem adedi alt siniri */
export const MIN_DAILY_VOLUME = 750_000;

/** Dusuk hacim ceza puani (AL -> BEKLE kaydirma) */
export const LOW_VOLUME_SCORE_PENALTY = 2;
