export const WEEKLY_EVENT_THRESHOLDS = {
  rain: {
    minTotalMm: 5,
    minWetHours: 6,
    minWetBlockHours: 4
  },
  wind: {
    minStrongHours: 2,
    extremeGustKmh: 90
  },
  trend: {
    minCloudDeltaPct: 25
  },
  bestWindow: {
    minConsecutiveHours: 3,
    maxCloudPct: 45
  },
  thunder: {
    minHours: 2,
    minPeakSupport: 0.55
  }
} as const;
