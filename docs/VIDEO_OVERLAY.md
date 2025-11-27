# Video Overlay Documentation

Complete guide to the `DarshanOverlay` component - a full-screen immersive overlay that displays when the compass is aligned, featuring video backgrounds, golden aura effects, audio playback, and interactive animations.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Components](#components)
5. [Installation & Setup](#installation--setup)
6. [Basic Usage](#basic-usage)
7. [Configuration](#configuration)
8. [Animations](#animations)
9. [API Reference](#api-reference)
10. [Integration Examples](#integration-examples)
11. [Customization](#customization)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The `DarshanOverlay` component creates an immersive full-screen experience that appears when the compass detects alignment with the target direction. It combines:

- **Background video**: Looping video backdrop with vignette effects
- **Golden aura**: Pulsing radial gradient glow around the central image
- **Audio playback**: Background audio with mute/unmute controls
- **Interactive animations**: Flower shower and Aarti (lamp) animations
- **Smooth transitions**: Fade-in and scale animations

---

## Features

### Core Features

- ✅ **Full-Screen Overlay**: Immersive experience covering entire screen
- ✅ **Video Background**: Looping video with dimming and vignette effects
- ✅ **Golden Aura Effect**: Multi-layer pulsing radial gradients
- ✅ **Audio Playback**: Background audio with volume control
- ✅ **Interactive Animations**: Trigger flower and Aarti animations
- ✅ **Auto-Play Audio**: Plays once then auto-mutes
- ✅ **Manual Controls**: Audio toggle, Pooja, Aarti buttons
- ✅ **Smooth Animations**: Fade-in, scale, and pulse effects
- ✅ **Close Functionality**: Dismiss overlay and reset alignment

### Visual Elements

- Background video layer
- Dimming overlay
- Multiple vignette gradients (top/bottom and corners)
- Central image with golden aura glow
- Control buttons (audio, pooja, aarti)
- Close button
- Flower animation overlay
- Aarti (lamp) animation overlay

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DarshanOverlay                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │ Background     │     │ Video Player   │                │
│  │ Video Layer    │◀────│ (expo-video)   │                │
│  └─────────────────┘     └─────────────────┘                │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐                                         │
│  │ Dimming &      │                                         │
│  │ Vignette       │                                         │
│  │ Overlays       │                                         │
│  └─────────────────┘                                         │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Golden Aura    │     │ Central Image   │               │
│  │ (SVG Gradients)│────▶│ (Swamiji)       │               │
│  └─────────────────┘     └─────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Control        │     │ Audio Player   │               │
│  │ Buttons        │◀────│ (expo-audio)   │               │
│  └─────────────────┘     └─────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Flower         │     │ Aarti          │               │
│  │ Animation      │     │ Animation      │               │
│  └─────────────────┘     └─────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Layer Stacking Order (bottom to top)

1. Background video (`VideoView`)
2. Dimming overlay (semi-transparent black)
3. Vignette gradients (top/bottom and corners)
4. Golden aura container (SVG radial gradients)
5. Central image (Swamiji)
6. Control buttons
7. Flower animation
8. Aarti animation
9. Close button

---

## Components

### 1. Background Video

Uses `expo-video`'s `VideoView` component:
- Full-screen coverage (`StyleSheet.absoluteFill`)
- Cover fit mode (fills screen, maintains aspect ratio)
- Looping enabled
- Muted by default (audio handled separately)
- No native controls

### 2. Dimming & Vignette Effects

Multiple overlay layers create depth:

**Dimming Overlay:**
- Semi-transparent black (`rgba(0, 0, 0, 0.4)`)
- Reduces video brightness

**Top/Bottom Vignette:**
- Linear gradient from black to transparent
- Darkens top and bottom edges
- Creates focus on center

**Corner Vignettes:**
- Four diagonal linear gradients
- Darkens corners
- Enhances center focus

### 3. Golden Aura

Multi-layer SVG radial gradients create pulsing glow:

**Outer Glow (Layer 1):**
- Large radius (50% of container)
- Amber/orange colors (`#fbbf24`, `#b45309`)
- Slow pulse (3 seconds)
- Low opacity (0.5 max)

**Middle Glow (Layer 2):**
- Medium radius (45% of container)
- Golden colors (`#fbbf24`, `#f59e0b`)
- Medium pulse (2.5 seconds, offset 500ms)
- Medium opacity (0.7 max)

**Inner Glow (Layer 3):**
- Small radius (35-40% of container)
- Bright yellow (`#fcd34d`, `#fbbf24`)
- Fast pulse (2 seconds, offset 1000ms)
- High opacity (0.8 max)

**Animation Pattern:**
```typescript
// Continuous loop with sine easing
Animated.loop(
  Animated.sequence([
    Animated.timing(opacity, { toValue: max, duration: 3000 }),
    Animated.timing(opacity, { toValue: min, duration: 3000 }),
  ])
);
```

### 4. Audio Playback

Uses `expo-audio`'s `AudioPlayer`:

**Behavior:**
- Plays once when overlay becomes visible
- Auto-mutes after completion
- Manual toggle available
- Volume control via prop
- Resets to beginning when overlay reappears

**State Management:**
- `isMuted`: Current mute state
- `hasPlayedOnce`: Tracks if audio has played
- Auto-reset when overlay becomes visible

### 5. Interactive Animations

#### Flower Animation (`FlowerAnimation`)

**Trigger**: Pooja button press

**Features:**
- Physics-based particle system
- 40 flowers with random trajectories
- Gravity simulation
- Rotation and scale animations
- Multiple color variants (red, pink, deep red, coral)
- 10-second animation duration

**Configuration:**
```typescript
<FlowerAnimation
  startX={SCREEN_WIDTH / 2}
  startY={SCREEN_HEIGHT - 128}
  groundY={(SCREEN_HEIGHT + IMAGE_HEIGHT) / 2 - 20}
/>
```

#### Aarti Animation (`AartiAnimation`)

**Trigger**: Aarti button press

**Features:**
- Circular path animation
- Rotating diya (lamp) with flame
- Flickering flame effect
- Radial gradient glow
- 6-second animation (3 rotations)

**Configuration:**
```typescript
<AartiAnimation
  centerX={SCREEN_WIDTH / 2}
  centerY={SCREEN_HEIGHT / 2 - 80}
  flameLength={0.8}
  flickerIntensity={0.8}
  diyaSize={80}
  flameBaseGap={15}
  radius={130}
/>
```

### 6. Control Buttons

Three control buttons at bottom:

1. **Audio Toggle**: Mute/unmute audio
2. **Pooja Button**: Trigger flower animation
3. **Aarti Button**: Trigger Aarti animation

**Styling:**
- Circular buttons (56x56px)
- Dark background with amber border
- Golden icon color
- Shadow effects
- Positioned at bottom (100px from bottom)

---

## Installation & Setup

### Dependencies

```json
{
  "expo-video": "^1.x.x",
  "expo-audio": "^1.x.x",
  "expo-linear-gradient": "^12.x.x",
  "react-native-svg": "^13.x.x",
  "react-native-reanimated": "^3.x.x",
  "@expo/vector-icons": "^13.x.x"
}
```

### Assets Required

1. **Video File**: Background video (e.g., `darshan-background.mp4`)
   - Recommended: 720p or 1080p
   - Format: MP4 (H.264)
   - Duration: Any (will loop)

2. **Audio File**: Background audio (e.g., `background-music.mp3`)
   - Format: MP3 or AAC
   - Duration: Any

3. **Image File**: Central image (e.g., `swamiji-darshan.png`)
   - Size: 288x384px (3:4 aspect ratio)
   - Format: PNG (transparent background recommended)

### File Structure

```
assets/
  videos/
    darshan-background.mp4
  audio/
    background-music.mp3
  images/
    swamiji-darshan.png
```

---

## Basic Usage

### Simple Integration

```tsx
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import DarshanOverlay from './components/DarshanOverlay';

function App() {
  const [isAligned, setIsAligned] = useState(false);
  
  // Initialize video player
  const videoPlayer = useVideoPlayer(
    require('./assets/videos/darshan-background.mp4')
  );
  
  // Initialize audio player
  const audioPlayer = useAudioPlayer(
    require('./assets/audio/background-music.mp3')
  );
  
  return (
    <>
      <CompassView 
        onAlignmentChange={setIsAligned}
        targetHeading={45}
      />
      
      <DarshanOverlay
        visible={isAligned}
        videoPlayer={videoPlayer}
        audioPlayer={audioPlayer}
        onClose={() => setIsAligned(false)}
      />
    </>
  );
}
```

### With Compass Integration

```tsx
const [isAligned, setIsAligned] = useState(false);
const [isClosedManually, setIsClosedManually] = useState(false);

<>
  <CompassView 
    targetLocation={targetLocation}
    onAlignmentChange={(aligned) => {
      if (!isClosedManually) {
        setIsAligned(aligned);
      }
    }}
    hideStatusWhenAligned={true}
  />
  
  <DarshanOverlay
    visible={isAligned}
    videoPlayer={videoPlayer}
    audioPlayer={audioPlayer}
    audioEnabled={audioEnabled}
    audioVolume={audioVolume}
    onClose={() => {
      setIsAligned(false);
      setIsClosedManually(true);
      // Reset after delay to allow re-alignment
      setTimeout(() => setIsClosedManually(false), 2000);
    }}
  />
</>
```

---

## Configuration

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls overlay visibility |
| `videoPlayer` | `VideoPlayer` | **required** | Video player instance from `useVideoPlayer` |
| `audioPlayer` | `AudioPlayer` | **required** | Audio player instance from `useAudioPlayer` |
| `onClose` | `() => void` | **required** | Callback when close button is pressed |
| `audioEnabled` | `boolean` | `true` | Enable/disable audio playback |
| `audioVolume` | `number` | `1.0` | Audio volume (0.0 to 1.0) |

### Video Player Setup

```tsx
import { useVideoPlayer } from 'expo-video';

const videoPlayer = useVideoPlayer(
  require('./assets/videos/darshan-background.mp4'),
  {
    // Optional: Configure player
    loop: true,
    muted: true,
  }
);

// Control playback
useEffect(() => {
  if (isAligned && appStateVisible === 'active') {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.currentTime = 0;
    videoPlayer.play();
  } else {
    videoPlayer.pause();
  }
}, [isAligned, appStateVisible, videoPlayer]);
```

### Audio Player Setup

```tsx
import { useAudioPlayer } from 'expo-audio';

const audioPlayer = useAudioPlayer(
  require('./assets/audio/background-music.mp3')
);

// Audio is automatically managed by DarshanOverlay
// No manual control needed unless customizing behavior
```

---

## Animations

### Fade-In Animation

When overlay becomes visible:
- Opacity: 0 → 1 (1 second)
- Scale: 0.9 → 1.0 (spring animation)
- Duration: 1000ms

### Golden Aura Pulse

Three independent pulse animations:
- **Outer**: 0.5 ↔ 0.8 opacity, 3s duration
- **Middle**: 0.3 ↔ 0.6 opacity, 2.5s duration (offset 500ms)
- **Inner**: 0.4 ↔ 0.7 opacity, 2s duration (offset 1000ms)

All use sine easing for smooth transitions.

### Flower Animation

**Physics Properties:**
- Gravity: 0.7
- Initial velocity Y: -20 to -30
- Initial velocity X: ±8
- Rotation: Random
- Scale: Random (0.8 to 1.2)
- Duration: 10 seconds

**Color Variants:**
- Red (`#dc2626`)
- Pink (`#ec4899`)
- Deep Red (`#991b1b`)
- Coral (`#f87171`)

### Aarti Animation

**Properties:**
- Circular path radius: 130px
- Rotations: 3 complete rotations
- Duration: 6 seconds
- Flame flicker: Random intensity variation
- Diya size: 80px

**Flame Effect:**
- Radial gradient glow
- Flickering animation
- Configurable length and intensity

---

## API Reference

### Interface

```typescript
interface DarshanOverlayProps {
  visible: boolean;
  videoPlayer: VideoPlayer;
  audioPlayer: AudioPlayer;
  onClose: () => void;
  audioEnabled?: boolean;
  audioVolume?: number;
}
```

### VideoPlayer (expo-video)

```typescript
interface VideoPlayer {
  play(): Promise<void>;
  pause(): void;
  seekTo(time: number): Promise<void>;
  loop: boolean;
  muted: boolean;
  currentTime: number;
  playing: boolean;
}
```

### AudioPlayer (expo-audio)

```typescript
interface AudioPlayer {
  play(): Promise<void>;
  pause(): void;
  seekTo(time: number): Promise<void>;
  loop: boolean;
  volume: number;
  playing: boolean;
}
```

---

## Integration Examples

### Full App Integration

```tsx
import React, { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import CompassView from './components/CompassView';
import DarshanOverlay from './components/DarshanOverlay';

function App() {
  const [isAligned, setIsAligned] = useState(false);
  const [isClosedManually, setIsClosedManually] = useState(false);
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);
  
  const videoPlayer = useVideoPlayer(
    require('./assets/videos/darshan-background.mp4')
  );
  
  const audioPlayer = useAudioPlayer(
    require('./assets/audio/background-music.mp3')
  );
  
  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppStateVisible(nextAppState);
    });
    return () => subscription.remove();
  }, []);
  
  // Control video playback based on alignment
  useEffect(() => {
    if (!videoPlayer) return;
    
    if (isAligned && appStateVisible === 'active') {
      videoPlayer.loop = true;
      videoPlayer.muted = true;
      videoPlayer.currentTime = 0;
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [isAligned, appStateVisible, videoPlayer]);
  
  return (
    <>
      <CompassView 
        targetLocation={targetLocation}
        onAlignmentChange={(aligned) => {
          if (!isClosedManually) {
            setIsAligned(aligned);
          }
        }}
        hideStatusWhenAligned={true}
      />
      
      <DarshanOverlay
        visible={isAligned}
        videoPlayer={videoPlayer}
        audioPlayer={audioPlayer}
        audioEnabled={true}
        audioVolume={1.0}
        onClose={() => {
          setIsAligned(false);
          setIsClosedManually(true);
          if (audioPlayer) {
            audioPlayer.pause();
          }
          setTimeout(() => setIsClosedManually(false), 2000);
        }}
      />
    </>
  );
}
```

### Custom Audio Behavior

```tsx
// Override default audio behavior
const [audioEnabled, setAudioEnabled] = useState(true);
const [audioVolume, setAudioVolume] = useState(1.0);

<DarshanOverlay
  visible={isAligned}
  videoPlayer={videoPlayer}
  audioPlayer={audioPlayer}
  audioEnabled={audioEnabled}
  audioVolume={audioVolume}
  onClose={() => {
    setIsAligned(false);
    setAudioEnabled(false); // Disable audio on close
  }}
/>
```

---

## Customization

### Custom Image Size

The central image size is defined as constants:

```typescript
const IMAGE_WIDTH = 288;  // 18rem = 288px
const IMAGE_HEIGHT = 384; // 3:4 aspect ratio
```

To customize, modify these constants in `DarshanOverlay.tsx`.

### Custom Aura Colors

Modify the radial gradient stops in the golden aura section:

```tsx
// Outer glow
<Stop offset="0.2" stopColor="#fbbf24" stopOpacity="0.5" />
<Stop offset="0.7" stopColor="#b45309" stopOpacity="0.4" />
<Stop offset="1" stopColor="transparent" stopOpacity="0" />

// Middle glow
<Stop offset="0.1" stopColor="#fbbf24" stopOpacity="0.7" />
<Stop offset="0.6" stopColor="#f59e0b" stopOpacity="0.5" />
<Stop offset="1" stopColor="transparent" stopOpacity="0" />

// Inner glow
<Stop offset="0.1" stopColor="#fcd34d" stopOpacity="0.8" />
<Stop offset="0.6" stopColor="#fbbf24" stopOpacity="0.4" />
<Stop offset="1" stopColor="transparent" stopOpacity="0" />
```

### Custom Animation Timing

Modify pulse animation durations:

```tsx
// Outer pulse: 3000ms → 3000ms
Animated.timing(pulseAnim1, {
  toValue: 0.8,
  duration: 3000, // Change this
  easing: Easing.inOut(Easing.sin),
});

// Middle pulse: 2500ms → 2500ms
Animated.timing(pulseAnim2, {
  toValue: 0.6,
  duration: 2500, // Change this
  easing: Easing.inOut(Easing.sin),
});

// Inner pulse: 2000ms → 2000ms
Animated.timing(pulseAnim3, {
  toValue: 0.7,
  duration: 2000, // Change this
  easing: Easing.inOut(Easing.sin),
});
```

### Custom Button Positions

Modify control button container styles:

```tsx
controlButtonsContainer: {
  position: 'absolute',
  bottom: 100, // Change vertical position
  flexDirection: 'row',
  alignSelf: 'center',
  gap: 20, // Change spacing between buttons
},
```

---

## Troubleshooting

### Video Not Playing

**Symptoms**: Black screen or no video visible

**Solutions**:
1. Verify video file path is correct
2. Check video format (MP4 H.264 recommended)
3. Ensure `videoPlayer` is initialized before rendering overlay
4. Check video file is included in app bundle
5. Verify video player is playing: `videoPlayer.playing === true`
6. Check console for video loading errors

### Audio Not Playing

**Symptoms**: No sound when overlay appears

**Solutions**:
1. Verify audio file path is correct
2. Check `audioEnabled` prop is `true`
3. Verify `audioVolume` is greater than 0
4. Check device volume is not muted
5. Ensure audio file is included in app bundle
6. Check console for audio loading errors
7. Verify `audioPlayer` is initialized

### Overlay Not Appearing

**Symptoms**: Overlay doesn't show when `visible={true}`

**Solutions**:
1. Verify `visible` prop is actually `true` (check state)
2. Ensure overlay is rendered in component tree
3. Check z-index conflicts with other components
4. Verify no conditional rendering is hiding overlay
5. Check console for React Native errors

### Animations Not Triggering

**Symptoms**: Flower/Aarti animations don't play

**Solutions**:
1. Verify animation refs are properly connected
2. Check button press handlers are firing
3. Ensure animation components are rendered
4. Check console for animation errors
5. Verify Reanimated is properly configured

### Performance Issues

**Symptoms**: Laggy animations or high battery usage

**Solutions**:
1. Reduce video resolution (720p instead of 1080p)
2. Optimize video file size (lower bitrate)
3. Reduce number of flower particles
4. Disable unnecessary animations
5. Check device performance capabilities
6. Monitor memory usage

### Audio Auto-Muting Too Early

**Symptoms**: Audio stops before finishing

**Solutions**:
1. Check audio file duration
2. Verify `hasPlayedOnce` state logic
3. Check audio completion detection logic
4. Ensure audio isn't being paused elsewhere
5. Verify audio player status polling interval

### Golden Aura Not Visible

**Symptoms**: No glow effect around image

**Solutions**:
1. Check SVG rendering is enabled
2. Verify radial gradient definitions
3. Check opacity values aren't too low
4. Ensure aura container is properly sized
5. Verify animation values are updating
6. Check for z-index issues

---

## Summary

The `DarshanOverlay` component provides a complete immersive experience that:

1. **Displays full-screen overlay** when compass is aligned
2. **Plays background video** with professional effects
3. **Creates golden aura** with multi-layer pulsing gradients
4. **Manages audio playback** with auto-mute functionality
5. **Provides interactive animations** for user engagement
6. **Handles state management** for smooth transitions
7. **Integrates seamlessly** with compass alignment detection

For complete integration examples, see the main `App.tsx` file.

