import { StyleSheet } from 'react-native';

// Styles for the first-run walkthrough (components/Walkthrough.tsx).
// Colors are applied inline from the active theme (APP_BACKGROUNDS[theme]); the
// values here are layout/typography only so the overlay matches whichever theme
// is active when it first appears.
export const walkthroughStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  // Top row holds the Skip button, right-aligned.
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 32,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  // Center area: icon badge + title + body.
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 18,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 4,
  },
  // Bottom: progress dots above the Back / Next row.
  footer: {
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  dotActive: {
    width: 22,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backBtn: {
    minWidth: 72,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    borderWidth: 1,
    minWidth: 140,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#1a1208',
  },
});
