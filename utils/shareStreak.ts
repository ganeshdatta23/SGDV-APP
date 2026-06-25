/**
 * Capture the off-screen StreakShareCard to a PNG and open the native share
 * sheet with a prefilled caption (app blurb + download link), so the user can
 * post the image to WhatsApp / Instagram / etc. Everything is best-effort: if
 * the capture fails we fall back to a text-only share, and a cancelled share
 * sheet is not treated as an error.
 */
import React from 'react';
import { InteractionManager, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { buildStreakShareMessage } from '../constants';

/** Resolve after the next interaction/frame so layout is committed before capture. */
const waitForFrame = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

const ensureFileUri = (path: string): string =>
  path.startsWith('file://') || path.startsWith('content://') ? path : `file://${path}`;

/**
 * Share the streak card image + caption. `cardRef` must point at the mounted
 * (but hidden) StreakShareCard's root view.
 */
export const shareStreakCard = async (
  cardRef: React.RefObject<View | null>,
  currentStreak: number,
): Promise<void> => {
  const message = buildStreakShareMessage(currentStreak);

  try {
    await waitForFrame();
    if (!cardRef.current) throw new Error('share card not mounted');

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    await Share.open({
      url: ensureFileUri(uri),
      type: 'image/png',
      message,
      failOnCancel: false,
    });
  } catch (error) {
    // User-cancelled shares reject too; only log, never crash the celebration.
    console.log('shareStreakCard: image share unavailable, trying text only:', error);
    try {
      await Share.open({ message, failOnCancel: false });
    } catch (textError) {
      console.log('shareStreakCard: text share also failed (ignored):', textError);
    }
  }
};
