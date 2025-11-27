import { AppBackgroundConfig, CompassConfig, ThemeMode } from '../types';

// ============================================================================
// APP BACKGROUND THEMES (synced with CompassView theme)
// ============================================================================
// Available themes: 'light' | 'dark' | 'cosmic'
// - light: Orange/amber sunrise gradient
// - dark: Dark stone/black night gradient  
// - cosmic: Red-black cosmic gradient (from archive demo_sgvd_ui_5)
// To switch themes, change COMPASS_THEME in components/CompassView.tsx
// Both the compass and app background will automatically update

export const APP_BACKGROUNDS: Record<ThemeMode, AppBackgroundConfig> = {
    light: {
        // Orange/amber gradient (sunrise theme)
        gradientColors: ['#FF6B35', '#F7931E'] as const,
        gradientLocations: [0, 1] as const,
        statusBarStyle: 'light-content' as const,
        headerTextColor: '#FFFFFF',
        subtitleColor: '#FFFFFF',
        buttonBg: 'rgba(255, 255, 255, 0.2)',
        buttonBorder: 'rgba(255, 255, 255, 0.5)',
        buttonText: '#FFFFFF',
        modalBg: 'rgba(0, 30, 60, 0.95)',
        modalBorder: 'rgba(255, 215, 0, 0.6)',
        modalTitle: '#FFD700',
        modalText: '#E6E6FA',
    },
    dark: {
        // Dark stone/black gradient (night theme from archive)
        // Converted from: bg-[radial-gradient(ellipse_at_top)] from-stone-900/80 via-stone-950 to-black
        gradientColors: ['#292524', '#1c1917', '#0c0a09', '#000000'] as const,
        gradientLocations: [0, 0.3, 0.6, 1] as const,
        statusBarStyle: 'light-content' as const,
        headerTextColor: '#e7e5e4',
        subtitleColor: '#a8a29e',
        buttonBg: 'rgba(28, 25, 23, 0.6)',
        buttonBorder: '#44403c',
        buttonText: '#e7e5e4',
        modalBg: 'rgba(12, 10, 9, 0.95)',
        modalBorder: '#44403c',
        modalTitle: '#FCD34D',
        modalText: '#a8a29e',
    },
    cosmic: {
        // Red-black cosmic gradient (from archive demo_sgvd_ui_5)
        // Using REAL radial gradient: bg-[radial-gradient(ellipse_at_top)] from-amber-700/90 via-rose-950 to-slate-950
        // amber-700: #b45309, rose-950: #4c0519, slate-950: #020617
        isRadial: true, // Flag to use RadialGradient instead of LinearGradient
        radialColorList: [
            { offset: '0%', color: '#b45309', opacity: '0.9' },   // amber-700/90 at center
            { offset: '40%', color: '#4c0519', opacity: '1' },    // rose-950
            { offset: '100%', color: '#020617', opacity: '1' },   // slate-950 at edges
        ],
        // Fallback linear gradient colors (not used when isRadial is true)
        gradientColors: ['#b45309', '#4c0519', '#020617'] as const,
        gradientLocations: [0, 0.4, 1] as const,
        statusBarStyle: 'light-content' as const,
        headerTextColor: '#FFFFFF',
        subtitleColor: '#fbbf24', // amber-400 for better contrast
        buttonBg: 'rgba(76, 5, 25, 0.6)', // rose-950 with opacity
        buttonBorder: 'rgba(251, 191, 36, 0.5)', // amber-400 border
        buttonText: '#FFFFFF',
        modalBg: 'rgba(2, 6, 23, 0.95)', // slate-950 with opacity
        modalBorder: 'rgba(251, 191, 36, 0.6)', // amber-400 border
        modalTitle: '#fbbf24', // amber-400
        modalText: '#fef3c7', // amber-100
    },
};

// ============================================================================
// COMPASS CONFIGURATION
// ============================================================================

// Default configuration
export const DEFAULT_COMPASS_CONFIG: CompassConfig = {
    // Size & Layout
    compassSizeRatio: 0.67,
    centerHubSizeRatio: 0.35,

    // Tick Marks
    cardinalTickLength: 20,
    semiCardinalTickLength: 12,
    minorTickLength: 6,
    cardinalTickWidth: 2.5,
    minorTickWidth: 0.8,

    // Font Sizes
    cardinalNorthFontSize: 18,
    cardinalOtherFontSize: 14,
    centerLabelFontSize: 8,
    centerValueFontSize: 28,
    targetBearingFontSize: 12,
    turnInstructionIconSize: 25,
    turnInstructionTextSize: 16,
    statusTextSize: 10,
    locationTextSize: 15,

    // Spacing & Padding
    turnContainerPaddingH: 22,
    turnContainerPaddingV: 12,
    turnContainerMarginBottom: 30,
    compassMarginBottom: 80,
    statusContainerPaddingH: 20,
    statusContainerPaddingV: 16,
    statusContainerMargin: 20,
    statusContainerBottom: 40,

    // Glow Effects
    glowRingOffset: 5,
    glowRingWidth: 3,

    // Sensor & Animation
    facingThresholdDegrees: 20,
    compassRefreshInterval: 30,
    smoothingAlpha: 0.8,
    rotationSpringDamping: 1000,
    rotationSpringStiffness: 1000,
    magnetometerSpringDamping: 20,
    magnetometerSpringStiffness: 100,

    // Border Radii
    turnContainerRadius: 50,
    statusContainerRadius: 30,
};

export const COMPASS_THEME: ThemeMode = 'cosmic'; // Change this to switch themes

// Theme color palettes
export const THEMES = {
    light: {
        // For orange/yellow gradient backgrounds (Sunrise theme)
        // Medium-dark colors for balanced contrast against bright sunrise background
        dialBackground: 'rgba(95, 46, 22, 0.5)',    // Medium brown with moderate opacity
        dialStroke: 'rgba(183, 99, 4, 0.6)',       // Amber-600 border (medium gold)
        tickMajor: '#D97706',                        // Amber-600 cardinal ticks (medium gold)
        tickMinor: 'rgba(180, 83, 9, 0.5)',         // Amber-700 minor ticks (lighter)
        northColor: '#EF4444',                       // Red-500 for North (medium red)
        cardinalColor: '#FDE68A',                    // Amber-200 for E, S, W (lighter amber)
        centerHubBg: 'rgba(60, 30, 15, 0.7)',       // Medium brown-black center
        centerHubStroke: 'rgba(217, 119, 6, 0.5)',   // Amber-600 stroke
        headingLabel: 'rgba(251, 191, 36, 0.95)',   // Amber-400 label (bright gold)
        headingValue: '#FDE68A',                     // Amber-200 value (lighter gold)
        gold: '#F59E0B',                             // Amber-500 for target (medium gold)
        emerald: '#10b981',                          // Emerald-500 for aligned (medium green)
        emeraldGlow: '#34d399',                      // Emerald-400 glow
        turnContainerBg: 'rgba(80, 40, 20, 0.55)',   // Medium brown container
        turnContainerBorder: 'rgba(217, 119, 6, 0.5)',
        turnContainerAlignedBg: 'rgba(6, 78, 59, 0.5)',  // Emerald-800 aligned (lighter)
        turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.6)',
        statusBg: 'rgba(60, 30, 15, 0.65)',         // Medium brown-black status
        statusBorder: 'rgba(217, 119, 6, 0.4)',
        statusText: '#FDE68A',                       // Amber-200 text (readable)
        phoneMarkerFill: '#FDE68A',                  // Amber-200 phone marker (lighter gold)
        phoneMarkerStroke: 'rgba(80, 40, 20, 0.6)', // Medium brown stroke
    },
    dark: {
        // For dark backgrounds (stone/black)
        dialBackground: 'rgba(28, 25, 23, 0.85)',    // Dark stone background
        dialStroke: '#444444',                        // Stone border
        tickMajor: '#FCD34D',                        // Gold cardinal ticks
        tickMinor: '#57534e',                        // Stone minor ticks
        northColor: '#ef4444',                       // Red for North
        cardinalColor: '#a8a29e',                    // Stone gray for E, S, W
        centerHubBg: 'rgba(10, 10, 10, 0.95)',      // Near-black center
        centerHubStroke: '#44403c',
        headingLabel: '#78716c',
        headingValue: '#FFFFFF',
        gold: '#fbbf24',
        emerald: '#34d399',
        emeraldGlow: '#10b981',
        turnContainerBg: 'rgba(28, 25, 23, 0.6)',
        turnContainerBorder: '#44403c',
        turnContainerAlignedBg: 'rgba(6, 78, 59, 0.3)',
        turnContainerAlignedBorder: 'rgba(16, 185, 129, 0.5)',
        statusBg: 'rgba(28, 25, 23, 0.8)',
        statusBorder: '#44403c',
        statusText: '#e7e5e4',
        phoneMarkerFill: '#FFFFFF',
        phoneMarkerStroke: '#78716c',
    },
    cosmic: {
        // For red-black cosmic gradient backgrounds (from archive demo_sgvd_ui_5)
        // Amber-700/90 → rose-950 → slate-950 gradient
        dialBackground: 'rgba(76, 5, 25, 0.7)',      // Rose-950 with transparency
        dialStroke: 'rgba(251, 191, 36, 0.4)',       // Amber-400 border
        tickMajor: '#fbbf24',                        // Amber-400 cardinal ticks
        tickMinor: 'rgba(251, 191, 36, 0.3)',        // Amber with opacity for minor ticks
        northColor: '#ef4444',                       // Red for North
        cardinalColor: '#fef3c7',                    // Amber-100 for E, S, W
        centerHubBg: 'rgba(2, 6, 23, 0.9)',          // Slate-950 center
        centerHubStroke: 'rgba(251, 191, 36, 0.3)',  // Amber border
        headingLabel: '#d97706',                     // Amber-600
        headingValue: '#FFFFFF',
        gold: '#fbbf24',                             // Amber-400
        emerald: '#34d399',
        emeraldGlow: '#10b981',
        turnContainerBg: 'rgba(76, 5, 25, 0.5)',     // Rose-950 bg
        turnContainerBorder: 'rgba(251, 191, 36, 0.4)',
        turnContainerAlignedBg: 'rgba(6, 78, 59, 0.4)',
        turnContainerAlignedBorder: 'rgba(52, 211, 153, 0.5)',
        statusBg: 'rgba(2, 6, 23, 0.8)',             // Slate-950 bg
        statusBorder: 'rgba(251, 191, 36, 0.3)',
        statusText: '#fef3c7',                       // Amber-100
        phoneMarkerFill: '#FFFFFF',
        phoneMarkerStroke: 'rgba(251, 191, 36, 0.5)',
    },
};

// Theme info for settings
export const THEME_INFO: Record<ThemeMode, { name: string; description: string; colors: string[] }> = {
    light: {
        name: 'Sunrise',
        description: 'Bright & energetic orange',
        colors: ['#FF6B35', '#F7931E'],
    },
    dark: {
        name: 'Midnight',
        description: 'Dark stone & elegant',
        colors: ['#292524', '#000000'],
    },
    cosmic: {
        name: 'Cosmic',
        description: 'Deep space & mystery',
        colors: ['#b45309', '#4c0519', '#020617'],
    },
};

export const SETTINGS_THEMES: Record<ThemeMode, any> = {
    light: {
        sectionBg: 'rgba(255, 255, 255, 0.9)',
        sectionBorder: '#fed7aa', // orange-200
        sectionTitle: '#c2410c', // orange-700
        itemText: '#431407', // orange-950
        itemSubtext: '#9a3412', // orange-800
        accent: '#ea580c', // orange-600
        chevron: '#fdba74', // orange-300
        selectedBg: '#fff7ed', // orange-50
    },
    dark: {
        sectionBg: 'rgba(28, 25, 23, 0.95)', // stone-950
        sectionBorder: '#44403c', // stone-700
        sectionTitle: '#e7e5e4', // stone-200
        itemText: '#fafaf9', // stone-50
        itemSubtext: '#a8a29e', // stone-400
        accent: '#fbbf24', // amber-400
        chevron: '#57534e', // stone-600
        selectedBg: 'rgba(251, 191, 36, 0.1)',
    },
    cosmic: {
        sectionBg: 'rgba(2, 6, 23, 0.8)', // slate-950/80
        sectionBorder: 'rgba(251, 191, 36, 0.3)', // amber-400/30
        sectionTitle: '#fbbf24', // amber-400
        itemText: '#fef3c7', // amber-100
        itemSubtext: '#d97706', // amber-600
        accent: '#fbbf24', // amber-400
        chevron: '#78350f', // amber-900
        selectedBg: 'rgba(251, 191, 36, 0.15)',
    },
};

export const EVENTS_THEMES: Record<ThemeMode, any> = {
    light: {
        cardBg: 'rgba(255, 255, 255, 0.9)',
        dateText: '#ea580c', // orange-600
        titleText: '#431407', // orange-950
        timeText: '#9a3412', // orange-800
        locationText: '#9a3412', // orange-800
        descriptionText: '#7c2d12', // orange-900
        divider: '#fed7aa', // orange-200
    },
    dark: {
        cardBg: 'rgba(28, 25, 23, 0.95)', // stone-950
        dateText: '#fbbf24', // amber-400
        titleText: '#fafaf9', // stone-50
        timeText: '#d6d3d1', // stone-300
        locationText: '#a8a29e', // stone-400
        descriptionText: '#d6d3d1', // stone-300
        divider: '#44403c', // stone-700
    },
    cosmic: {
        cardBg: 'rgba(2, 6, 23, 0.8)', // slate-950
        dateText: '#fbbf24', // amber-400
        titleText: '#fef3c7', // amber-100
        timeText: '#e2e8f0', // slate-200
        locationText: '#cbd5e1', // slate-300
        descriptionText: '#cbd5e1', // slate-300
        divider: 'rgba(251, 191, 36, 0.3)', // amber-400/30
    },
};
