import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../types';
import {
  APP_BACKGROUNDS,
  COMPASS_THEME,
  TEXT_SYNC_PROMPT_TITLE,
  TEXT_SYNC_PROMPT_FIRST_RUN,
  TEXT_SYNC_PROMPT_STALE,
  TEXT_SYNC_PROMPT_DISMISS,
  TEXT_SYNC_PROMPT_RETRY,
} from '../constants';
import type { SyncPromptReason } from '../utils/locationSync';

interface ConnectivityPromptProps {
  /** Why we're prompting; renders nothing when null. */
  reason: SyncPromptReason;
  theme?: ThemeMode;
  /** Nudge the user toward the OS connectivity settings. */
  onOpenSettings: () => void;
  /** Dismiss the prompt for this session. */
  onDismiss: () => void;
}

/**
 * "Turn on internet" prompt. Presentation only — the decision of whether/why to
 * show it lives in utils/locationSync (decideSyncPrompt), so this can later be
 * swapped for a local notification without touching the trigger logic.
 *
 *  - 'first-install' -> a one-time blocking-ish modal (the app still works
 *    offline; the modal is dismissable).
 *  - 'stale-week'    -> a non-blocking banner pinned to the top.
 */
const ConnectivityPrompt: React.FC<ConnectivityPromptProps> = ({
  reason,
  theme = COMPASS_THEME,
  onOpenSettings,
  onDismiss,
}) => {
  if (!reason) return null;

  const bg = APP_BACKGROUNDS[theme];

  if (reason === 'first-install') {
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <View style={styles.modalScrim}>
          <View
            testID="sync-prompt-modal"
            style={[
              styles.modalCard,
              { backgroundColor: bg.modalBg, borderColor: bg.modalBorder },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                { borderColor: bg.modalBorder, backgroundColor: bg.buttonBg },
              ]}
            >
              <Ionicons name="wifi" size={40} color={bg.modalTitle} />
            </View>
            <Text style={[styles.title, { color: bg.modalTitle }]}>
              {TEXT_SYNC_PROMPT_TITLE}
            </Text>
            <Text style={[styles.body, { color: bg.modalText }]}>
              {TEXT_SYNC_PROMPT_FIRST_RUN}
            </Text>
            <TouchableOpacity
              testID="sync-prompt-open-settings"
              accessibilityRole="button"
              accessibilityLabel={TEXT_SYNC_PROMPT_RETRY}
              onPress={onOpenSettings}
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                { backgroundColor: bg.modalTitle, borderColor: bg.modalBorder },
              ]}
            >
              <Text style={styles.primaryText}>{TEXT_SYNC_PROMPT_RETRY}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="sync-prompt-dismiss"
              accessibilityRole="button"
              accessibilityLabel={TEXT_SYNC_PROMPT_DISMISS}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.dismissText, { color: bg.subtitleColor }]}>
                {TEXT_SYNC_PROMPT_DISMISS}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // 'stale-week' -> non-blocking top banner.
  return (
    <View
      testID="sync-prompt-banner"
      style={[
        styles.banner,
        { backgroundColor: bg.modalBg, borderColor: bg.modalBorder },
      ]}
    >
      <Ionicons
        name="cloud-offline"
        size={20}
        color={bg.modalTitle}
        style={styles.bannerIcon}
      />
      <Text style={[styles.bannerText, { color: bg.modalText }]} numberOfLines={2}>
        {TEXT_SYNC_PROMPT_STALE}
      </Text>
      <TouchableOpacity
        testID="sync-prompt-open-settings"
        accessibilityRole="button"
        accessibilityLabel={TEXT_SYNC_PROMPT_RETRY}
        onPress={onOpenSettings}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.bannerAction, { color: bg.modalTitle }]}>
          {TEXT_SYNC_PROMPT_RETRY}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="sync-prompt-dismiss"
        accessibilityRole="button"
        accessibilityLabel={TEXT_SYNC_PROMPT_DISMISS}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={20} color={bg.subtitleColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  primaryText: {
    color: '#1a1208',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 50) + 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginRight: 12,
  },
  bannerAction: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 14,
  },
});

export default ConnectivityPrompt;
