# Compass Configuration Guide

The CompassView component now supports extensive customization through a configuration object. This allows you to easily adjust styling, sizing, animation, and behavior parameters without modifying the component code.

## Quick Start

```tsx
import CompassView, { CompassConfig, DEFAULT_COMPASS_CONFIG } from './components/CompassView';

// Use default configuration
<CompassView targetHeading={45} />

// Or customize specific parameters
<CompassView 
  targetHeading={45}
  config={{
    compassSizeRatio: 0.8,        // Make compass larger (80% of screen)
    facingThresholdDegrees: 15,   // Tighter alignment threshold
    turnInstructionTextSize: 20,  // Larger turn instruction text
  }}
/>
```

## Configuration Parameters

### Size & Layout

| Parameter | Default | Description |
|-----------|---------|-------------|
| `compassSizeRatio` | 0.72 | Ratio of screen size (0.72 = 72% of smaller screen dimension) |
| `centerHubSizeRatio` | 0.35 | Size of center hub as ratio of compass radius (0.35 = 35%) |

### Tick Marks

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cardinalTickLength` | 20 | Length of N, E, S, W tick marks (pixels from edge) |
| `semiCardinalTickLength` | 12 | Length of 30° tick marks |
| `minorTickLength` | 6 | Length of 5° tick marks |
| `cardinalTickWidth` | 2.5 | Stroke width for cardinal direction ticks |
| `minorTickWidth` | 0.8 | Stroke width for minor ticks |

### Font Sizes

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cardinalNorthFontSize` | 18 | Font size for North marker |
| `cardinalOtherFontSize` | 14 | Font size for E, S, W markers |
| `centerLabelFontSize` | 8 | Font size for "HEADING" label |
| `centerValueFontSize` | 28 | Font size for degree value in center |
| `targetBearingFontSize` | 12 | Font size for target bearing in center |
| `turnInstructionIconSize` | 25 | Size of turn arrow icons (←/→/↑) |
| `turnInstructionTextSize` | 16 | Font size for "TURN LEFT"/"TURN RIGHT" text |
| `statusTextSize` | 10 | Font size for status text (sunrise time) |
| `locationTextSize` | 15 | Font size for location name |

### Spacing & Padding

| Parameter | Default | Description |
|-----------|---------|-------------|
| `turnContainerPaddingH` | 28 | Horizontal padding for turn instruction container |
| `turnContainerPaddingV` | 14 | Vertical padding for turn instruction container |
| `turnContainerMarginBottom` | 30 | Space below turn instruction |
| `compassMarginBottom` | 80 | Space below compass dial |
| `statusContainerPaddingH` | 20 | Horizontal padding for bottom status container |
| `statusContainerPaddingV` | 16 | Vertical padding for bottom status container |
| `statusContainerMargin` | 20 | Margin from left/right edges |
| `statusContainerBottom` | 40 | Distance from bottom of screen |

### Glow Effects

| Parameter | Default | Description |
|-----------|---------|-------------|
| `glowRingOffset` | 5 | Distance of glow ring from compass edge when aligned |
| `glowRingWidth` | 3 | Stroke width of glow ring effect |

### Sensor & Animation

| Parameter | Default | Description |
|-----------|---------|-------------|
| `facingThresholdDegrees` | 20 | Degrees to consider "aligned" (±20° = 40° total range) |
| `compassRefreshInterval` | 30 | Milliseconds between magnetometer updates |
| `smoothingAlpha` | 0.8 | Smoothing factor 0-1 (0.8 = 80% new data, 20% old) |
| `rotationSpringDamping` | 1000 | Spring animation damping for rotation sensor |
| `rotationSpringStiffness` | 1000 | Spring animation stiffness for rotation sensor |
| `magnetometerSpringDamping` | 20 | Spring animation damping for magnetometer |
| `magnetometerSpringStiffness` | 100 | Spring animation stiffness for magnetometer |

### Border Radii

| Parameter | Default | Description |
|-----------|---------|-------------|
| `turnContainerRadius` | 50 | Border radius for turn instruction pill shape |
| `statusContainerRadius` | 12 | Border radius for status container |

## Usage Examples

### Example 1: Larger Compass with Tighter Alignment

```tsx
<CompassView 
  targetHeading={90}
  config={{
    compassSizeRatio: 0.85,          // Larger compass (85% of screen)
    facingThresholdDegrees: 10,      // More precise alignment needed (±10°)
    centerValueFontSize: 32,         // Larger center heading display
  }}
/>
```

### Example 2: More Responsive Animation

```tsx
<CompassView 
  targetHeading={180}
  sensorType="magnetometer"
  config={{
    compassRefreshInterval: 16,           // ~60fps updates
    smoothingAlpha: 0.9,                  // Less smoothing, more responsive
    magnetometerSpringDamping: 30,        // Quicker damping
    magnetometerSpringStiffness: 150,     // Stiffer spring
  }}
/>
```

### Example 3: Minimal UI for Video Overlay

```tsx
<CompassView 
  targetLocation={destinationCoords}
  hideStatusWhenAligned={true}
  config={{
    turnContainerPaddingH: 20,            // Smaller turn instruction container
    turnContainerPaddingV: 10,
    turnInstructionTextSize: 14,          // Smaller text
    compassSizeRatio: 0.65,               // Smaller compass
    statusContainerBottom: 20,            // Move status closer to bottom
  }}
/>
```

### Example 4: Bold, High-Contrast Design

```tsx
<CompassView 
  targetHeading={270}
  theme="dark"
  config={{
    cardinalTickLength: 25,               // Longer tick marks
    cardinalTickWidth: 3.5,               // Thicker tick marks
    cardinalNorthFontSize: 22,            // Larger cardinal letters
    centerValueFontSize: 34,              // Huge center display
    glowRingWidth: 5,                     // Thicker glow when aligned
    turnInstructionIconSize: 30,          // Larger turn arrows
    turnInstructionTextSize: 18,          // Larger turn text
  }}
/>
```

### Example 5: Relaxed Alignment for Ease of Use

```tsx
<CompassView 
  targetLocation={destinationCoords}
  config={{
    facingThresholdDegrees: 30,           // Very forgiving alignment (±30°)
    smoothingAlpha: 0.7,                  // More smoothing for stability
  }}
/>
```

## Accessing Default Config

You can import and reference the default configuration:

```tsx
import { DEFAULT_COMPASS_CONFIG } from './components/CompassView';

// Create a custom config based on defaults
const myConfig = {
  ...DEFAULT_COMPASS_CONFIG,
  compassSizeRatio: 0.8,
  // Override only what you need
};

<CompassView targetHeading={45} config={myConfig} />
```

## Tips

1. **Start with defaults**: Only override parameters you need to change
2. **Test on device**: Sizes and spacing may look different on actual devices vs simulator
3. **Consider themes**: Some parameters may need adjustment for different themes (light/dark/cosmic)
4. **Animation tuning**: Higher stiffness = faster response, higher damping = less bounce
5. **Alignment threshold**: Smaller values = harder to align but more precise

## Themes

The compass supports three themes that can be combined with custom config:

- `light`: Orange/yellow gradient background (sunrise theme)
- `dark`: Dark stone/black background (night theme)
- `cosmic`: Red-black cosmic gradient

```tsx
<CompassView 
  theme="cosmic"
  config={{
    // Custom config works with any theme
    glowRingWidth: 4,
  }}
/>
```

