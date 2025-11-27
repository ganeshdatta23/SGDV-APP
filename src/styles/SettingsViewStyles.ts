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
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
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
    },
    themeName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    themeDescription: {
        fontSize: 13,
    },
    sliderContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingBottom: 60, // Space for bottom nav
    },
    versionText: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
});
