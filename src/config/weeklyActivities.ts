export const WEEKLY_ACTIVITY_RULES = {
  minFavorableWindowHours: 3,
  beach: {
    favorableMinTemperatureC: 20,
    favorableMaxTemperatureC: 32,
    hardMinTemperatureC: 15,
    hardMaxTemperatureC: 35,
    favorableMaxCloudPct: 50,
    mixedMaxCloudPct: 75
  },
  outdoorWalk: {
    favorableMinTemperatureC: 10,
    favorableMaxTemperatureC: 32,
    hardMinTemperatureC: 5,
    hardMaxTemperatureC: 35,
    favorableMaxCloudPct: 75,
    mixedMaxCloudPct: 90
  },
  outdoorSport: {
    favorableMinTemperatureC: 10,
    favorableMaxTemperatureC: 28,
    hardMinTemperatureC: 5,
    hardMaxTemperatureC: 33,
    favorableMaxCloudPct: 75,
    mixedMaxCloudPct: 90
  }
} as const;
