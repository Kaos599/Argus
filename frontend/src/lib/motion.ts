/**
 * Shared motion constants and variant factories for framer-motion.
 * Import these instead of defining inline to keep animations consistent.
 */

import type { Variants, Transition } from "framer-motion";

/** Expo-out easing — snappy entry, smooth settle */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Spring preset — natural, no bounce */
export const SPRING = { type: "spring", duration: 0.3, bounce: 0 } as const satisfies Transition;

/** Stagger delays */
export const STAGGER_CARD = 0.06;
export const STAGGER_ITEM = 0.08;

/**
 * Fade-up entrance variant with optional stagger index.
 * @param i - stagger index (clamped to 10 to avoid excessive delay)
 */
export function enterUp(i = 0): Variants {
  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: EASE_OUT_EXPO,
        delay: Math.min(i, 10) * STAGGER_CARD,
      },
    },
  };
}
