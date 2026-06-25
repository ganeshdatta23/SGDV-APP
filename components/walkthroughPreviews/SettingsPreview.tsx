import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode } from '../../types';
import {
  SETTINGS_THEMES,
  THEME_INFO,
  TEXT_APPEARANCE,
  TEXT_CHOOSE_THEME,
} from '../../constants';

/**
 * Mirrors the SettingsView "Appearance" section with the theme selector and the
 * three theme options (overlapping color swatches from THEME_INFO + a checkmark
 * on the active theme), themed via the real SETTINGS_THEMES palette.
 */
const SettingsPreview: React.FC<{ theme: ThemeMode }> = ({ theme }) => {
  const s = SETTINGS_THEMES[theme];
  const themeKeys = Object.keys(THEME_INFO) as ThemeMode[];

  return (
    <View style={[styles.section, { backgroundColor: s.sectionBg, borderColor: s.sectionBorder }]}>
      <Text style={[styles.header, { color: s.sectionTitle }]}>{TEXT_APPEARANCE}</Text>

      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: s.accent + '20' }]}>
          <Ionicons name="color-palette" size={18} color={s.accent} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { color: s.itemText }]}>{TEXT_CHOOSE_THEME}</Text>
          <Text style={[styles.rowSub, { color: s.itemSubtext }]}>{THEME_INFO[theme].name}</Text>
        </View>
        <Ionicons name="chevron-up" size={18} color={s.chevron} />
      </View>

      {themeKeys.map((k) => {
        const info = THEME_INFO[k];
        const selected = k === theme;
        return (
          <View
            key={k}
            style={[
              styles.option,
              {
                borderColor: selected ? s.accent : s.sectionBorder,
                backgroundColor: selected ? s.selectedBg : 'transparent',
              },
            ]}
          >
            <View style={styles.swatches}>
              {info.colors.map((color, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[styles.optionName, { color: selected ? s.accent : s.itemText }]}
              numberOfLines={1}
            >
              {info.name}
            </Text>
            {selected && <Ionicons name="checkmark-circle" size={18} color={s.accent} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: 290,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  swatches: {
    flexDirection: 'row',
    width: 54,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  optionName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SettingsPreview;
