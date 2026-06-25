import { StyleSheet } from 'react-native';

export const settingsViewStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 10,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  settingSubtitle: {
    fontSize: 13,
    flexWrap: 'wrap',
  },
  themeOptions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  colorPreview: {
    flexDirection: 'row',
    marginRight: 14,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  themeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  themeDescription: {
    fontSize: 13,
    flexWrap: 'wrap',
  },
  sliderContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  loadingRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Wrapping row of auto-width chips, for selectors with several options.
  optionRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Full-width stacked rows for the alarm-sound choices, so a long sound name
  // (e.g. "Sri Natha Charana Dwandvam") fits on one line instead of wrapping
  // inside a cramped half-width chip.
  soundOptionList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  soundOptionText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 8,
  },
  // About popup (modal) — full app image + description behind a tap.
  aboutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aboutModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  aboutModalImage: {
    width: 128,
    height: 128,
    borderRadius: 24,
    marginBottom: 18,
  },
  aboutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  aboutModalVersion: {
    fontSize: 13,
    marginBottom: 16,
  },
  aboutModalDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  aboutModalClose: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  aboutModalCloseText: {
    fontSize: 15,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 60,
  },
  versionText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

