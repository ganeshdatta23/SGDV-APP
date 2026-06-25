import { StyleSheet } from 'react-native';
import { STREAK_CARD_SIZE } from '../constants';

/**
 * Styles for the sunrise-streak UI: the shareable card, the milestone
 * celebration modal, the contextual "share your streak" pill, and the small
 * home-screen badge. Theme-dependent colors are applied inline at render
 * (matching the Walkthrough/Settings pattern); only layout lives here.
 */
export const streakStyles = StyleSheet.create({
  // ---- Share card (captured to PNG) -------------------------------------
  card: {
    width: STREAK_CARD_SIZE,
    height: STREAK_CARD_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  cardAppName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cardPhotoFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  cardCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 64,
    fontWeight: '800',
    marginLeft: 8,
  },
  cardStreakLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
    textAlign: 'center',
  },
  cardDivider: {
    width: 90,
    height: 2,
    borderRadius: 1,
    marginVertical: 12,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ---- Celebration modal -------------------------------------------------
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    width: '82%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalIconBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalCount: {
    fontSize: 52,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  modalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    marginRight: 10,
  },
  modalShareText: {
    color: '#1a1208',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalContinueBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContinueText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ---- Contextual share pill --------------------------------------------
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 9,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 8,
    marginHorizontal: 20,
  },
  pillText: {
    fontSize: 13.5,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 6,
  },
  pillDismiss: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Home badge --------------------------------------------------------
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 5,
  },

  // Absolute host for the home-screen badge (top-right, over the compass).
  badgeHost: {
    position: 'absolute',
    top: 6,
    right: 16,
    zIndex: 20,
    alignItems: 'flex-end',
  },

  // Hidden host for the off-screen capture target.
  hiddenCardHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    zIndex: -1,
  },
});
