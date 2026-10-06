import { LOKA_DAILY_FEED_FRAME } from "./feedFrame";
import { LOKA_WEEKLY_STORY_FRAME } from "./weeklyStoryFrame";

/**
 * Shared Instagram-safe vertical frame.
 *
 * The weekly Story is the spacing reference: it places the 1440 px feed
 * composition inside a 1920 px canvas, with 120 px reserved at both ends.
 * Daily Story renderers consume these resolved coordinates so their header,
 * first/last content boxes and signature use the exact same vertical anchors.
 */
const publication = LOKA_WEEKLY_STORY_FRAME.publication;
const storyY = (sourceY: number): number => publication.y + sourceY * publication.verticalScale;
const storyHeight = (sourceHeight: number): number => sourceHeight * publication.verticalScale;

const comparisonSource = { top: 306, bottom: 1682 } as const;
const comparisonTarget = {
  top: storyY(LOKA_DAILY_FEED_FRAME.title.y),
  bottom: storyY(LOKA_DAILY_FEED_FRAME.lowerBox.bottom)
} as const;
const comparisonScale =
  (comparisonTarget.bottom - comparisonTarget.top) /
  (comparisonSource.bottom - comparisonSource.top);
const comparisonY = (sourceY: number): number =>
  comparisonTarget.top + (sourceY - comparisonSource.top) * comparisonScale;
const comparisonHeight = (sourceHeight: number): number => sourceHeight * comparisonScale;

export const LOKA_INSTAGRAM_STORY_SAFE_FRAME = {
  width: LOKA_WEEKLY_STORY_FRAME.width,
  height: LOKA_WEEKLY_STORY_FRAME.height,
  safeArea: LOKA_WEEKLY_STORY_FRAME.safeArea,
  header: {
    logoX: LOKA_DAILY_FEED_FRAME.header.logoX,
    logoCenterY: storyY(LOKA_DAILY_FEED_FRAME.header.logoCenterY),
    logoWidth: 190,
    logoHeight: 64,
    cityX: LOKA_DAILY_FEED_FRAME.header.cityX,
    cityBaseline: storyY(LOKA_DAILY_FEED_FRAME.header.cityBaseline),
    dateX: LOKA_DAILY_FEED_FRAME.header.dateX,
    dateBaseline: storyY(LOKA_DAILY_FEED_FRAME.header.dateBaseline)
  },
  content: {
    general: {
      x: 44,
      y: storyY(LOKA_DAILY_FEED_FRAME.title.y),
      width: 992,
      height: storyHeight(LOKA_DAILY_FEED_FRAME.title.height)
    },
    hours: {
      x: 44,
      y: storyY(336),
      width: 992,
      height: storyHeight(500)
    },
    editorial: {
      x: 44,
      y: storyY(865),
      width: 992,
      height: storyHeight(210)
    },
    solar: {
      x: 44,
      y: storyY(LOKA_DAILY_FEED_FRAME.lowerBox.y),
      width: 992,
      height: storyHeight(LOKA_DAILY_FEED_FRAME.lowerBox.height)
    }
  },
  deck: {
    title: {
      x: 44,
      y: storyY(LOKA_DAILY_FEED_FRAME.title.y),
      width: 992,
      height: storyHeight(LOKA_DAILY_FEED_FRAME.title.height)
    },
    body: {
      x: 44,
      y: storyY(336),
      width: 992,
      height: storyY(LOKA_DAILY_FEED_FRAME.lowerBox.bottom) - storyY(336)
    }
  },
  comparison: {
    title: {
      x: 44,
      y: comparisonY(306),
      width: 992,
      height: comparisonHeight(176)
    },
    hero: {
      x: 44,
      y: comparisonY(523),
      width: 992,
      height: comparisonHeight(655)
    },
    editorial: {
      x: 44,
      y: comparisonY(1220),
      width: 992,
      height: comparisonHeight(462)
    }
  },
  legend: {
    x: 44,
    y: storyY(LOKA_DAILY_FEED_FRAME.title.y),
    width: 992,
    height: storyY(LOKA_DAILY_FEED_FRAME.lowerBox.bottom) - storyY(LOKA_DAILY_FEED_FRAME.title.y)
  },
  signature: {
    x: LOKA_DAILY_FEED_FRAME.signature.x,
    baseline: storyY(LOKA_DAILY_FEED_FRAME.signature.baseline),
    underlineStartX: LOKA_DAILY_FEED_FRAME.signature.underlineStartX,
    underlineEndX: LOKA_DAILY_FEED_FRAME.signature.underlineEndX,
    underlineY: storyY(LOKA_DAILY_FEED_FRAME.signature.underlineY)
  }
} as const;
