import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WalkthroughProps } from '../types';
import {
  APP_BACKGROUNDS,
  COMPASS_THEME,
  WALKTHROUGH_STEPS,
  TEXT_WALKTHROUGH_SKIP,
  TEXT_WALKTHROUGH_NEXT,
  TEXT_WALKTHROUGH_BACK,
  TEXT_WALKTHROUGH_GET_STARTED,
} from '../constants';
import { walkthroughStyles as s } from '../styles/WalkthroughStyles';

/**
 * First-run onboarding overlay. Shown once (gated by an AsyncStorage flag in
 * App.tsx), it steps the user through the app's four capabilities. Driven by an
 * internal `step` index with Back / Next buttons (no swipe) so every action has
 * a stable, tappable target — this also makes it deterministic to drive from
 * uiautomator in automated tests via the testIDs / accessibilityLabels below.
 */
const Walkthrough: React.FC<WalkthroughProps> = ({
  visible,
  theme = COMPASS_THEME,
  onComplete,
}) => {
  const [step, setStep] = useState(0);

  const bg = APP_BACKGROUNDS[theme];
  const total = WALKTHROUGH_STEPS.length;
  const isLast = step === total - 1;
  const current = WALKTHROUGH_STEPS[step];

  // The cosmic theme exposes radialColorList but every theme also carries a
  // linear gradientColors array, which we use for the full-screen backdrop.
  const gradientColors = bg.gradientColors as unknown as string[];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((prev) => Math.min(prev + 1, total - 1));
    }
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 0));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onComplete}
      statusBarTranslucent
    >
      <LinearGradient
        colors={gradientColors as any}
        style={s.overlay}
        testID="walkthrough-overlay"
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Skip (hidden on the last step, where the primary CTA is enough). */}
          <View style={s.skipRow}>
            {!isLast ? (
              <TouchableOpacity
                testID="walkthrough-skip"
                accessibilityRole="button"
                accessibilityLabel="Skip walkthrough"
                onPress={onComplete}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[s.skipText, { color: bg.subtitleColor }]}>
                  {TEXT_WALKTHROUGH_SKIP}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
          </View>

          {/* Icon badge + title + body for the current step. */}
          <View style={s.content}>
            <View
              style={[
                s.iconBadge,
                { borderColor: bg.modalBorder, backgroundColor: bg.buttonBg },
              ]}
            >
              <Ionicons name={current.icon} size={64} color={bg.modalTitle} />
            </View>
            <Text style={[s.title, { color: bg.headerTextColor }]}>
              {current.title}
            </Text>
            <Text style={[s.body, { color: bg.modalText }]}>{current.body}</Text>
          </View>

          {/* Progress dots + Back / Next (or Get Started). */}
          <View style={s.footer}>
            <View style={s.dots}>
              {WALKTHROUGH_STEPS.map((stepItem, i) => (
                <View
                  key={stepItem.title}
                  style={[
                    s.dot,
                    i === step && s.dotActive,
                    {
                      backgroundColor:
                        i === step ? bg.modalTitle : bg.buttonBorder,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={s.navRow}>
              {step > 0 ? (
                <TouchableOpacity
                  testID="walkthrough-back"
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={handleBack}
                  style={s.backBtn}
                >
                  <Text style={[s.backText, { color: bg.subtitleColor }]}>
                    {TEXT_WALKTHROUGH_BACK}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={s.backBtn} />
              )}

              <TouchableOpacity
                testID={isLast ? 'walkthrough-get-started' : 'walkthrough-next'}
                accessibilityRole="button"
                accessibilityLabel={
                  isLast ? TEXT_WALKTHROUGH_GET_STARTED : TEXT_WALKTHROUGH_NEXT
                }
                onPress={handleNext}
                activeOpacity={0.85}
                style={[
                  s.nextBtn,
                  { backgroundColor: bg.modalTitle, borderColor: bg.modalBorder },
                ]}
              >
                <Text style={s.nextText}>
                  {isLast ? TEXT_WALKTHROUGH_GET_STARTED : TEXT_WALKTHROUGH_NEXT}
                </Text>
                {!isLast && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#1a1208"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

export default Walkthrough;
