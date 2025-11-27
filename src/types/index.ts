import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// THEME TYPES
// ============================================================================
export type ThemeMode = 'light' | 'dark' | 'cosmic';

export interface AppBackgroundConfig {
    gradientColors?: readonly [string, string, ...string[]];
    gradientLocations?: readonly [number, number, ...number[]];
    isRadial?: boolean;
    radialColorList?: { offset: string; color: string; opacity: string }[];
    statusBarStyle: 'light-content' | 'dark-content';
    headerTextColor: string;
    subtitleColor: string;
    buttonBg: string;
    buttonBorder: string;
    buttonText: string;
    modalBg: string;
    modalBorder: string;
    modalTitle: string;
    modalText: string;
}

// ============================================================================
// COMPASS TYPES
// ============================================================================
export interface CompassConfig {
    // Size & Layout
    compassSizeRatio: number;          // Ratio of screen size (0.72 = 72% of screen)
    centerHubSizeRatio: number;        // Ratio of compass radius (0.35 = 35% of radius)

    // Tick Marks
    cardinalTickLength: number;        // Length of N, E, S, W ticks (from edge)
    semiCardinalTickLength: number;    // Length of 30° ticks
    minorTickLength: number;           // Length of 5° ticks
    cardinalTickWidth: number;         // Stroke width for cardinal ticks
    minorTickWidth: number;            // Stroke width for minor ticks

    // Font Sizes
    cardinalNorthFontSize: number;     // North marker font size
    cardinalOtherFontSize: number;     // E, S, W font size
    centerLabelFontSize: number;       // "HEADING" label font size
    centerValueFontSize: number;       // Degree value font size
    targetBearingFontSize: number;     // Target arrow bearing font size
    turnInstructionIconSize: number;   // Turn arrow icon size
    turnInstructionTextSize: number;   // Turn instruction text size
    statusTextSize: number;            // Bottom status text size
    locationTextSize: number;          // Location name text size

    // Spacing & Padding
    turnContainerPaddingH: number;     // Horizontal padding for turn instruction
    turnContainerPaddingV: number;     // Vertical padding for turn instruction
    turnContainerMarginBottom: number; // Space below turn instruction
    compassMarginBottom: number;       // Space below compass
    statusContainerPaddingH: number;   // Horizontal padding for status
    statusContainerPaddingV: number;   // Vertical padding for status
    statusContainerMargin: number;     // Margin from edges
    statusContainerBottom: number;     // Distance from bottom

    // Glow Effects
    glowRingOffset: number;            // Distance of glow ring from compass edge
    glowRingWidth: number;             // Stroke width of glow effect

    // Sensor & Animation
    facingThresholdDegrees: number;    // Degrees to consider "aligned" (20 = ±20°)
    compassRefreshInterval: number;    // Milliseconds between updates
    smoothingAlpha: number;            // 0-1, smoothing factor (0.8 = 80% new, 20% old)
    rotationSpringDamping: number;     // Spring animation damping
    rotationSpringStiffness: number;   // Spring animation stiffness
    magnetometerSpringDamping: number; // Magnetometer spring damping
    magnetometerSpringStiffness: number; // Magnetometer spring stiffness

    // Border Radii
    turnContainerRadius: number;       // Border radius for turn instruction
    statusContainerRadius: number;     // Border radius for status container
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================
export type Tab = 'home' | 'sun' | 'events' | 'settings';

export interface NavItem {
    id: Tab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}
