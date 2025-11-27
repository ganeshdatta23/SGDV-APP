import React from 'react';
import Svg, { Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';

interface RoseSvgProps {
  size?: number;
  colorVariant?: 'red' | 'pink' | 'deepRed' | 'coral';
}

/**
 * RoseSvg component - A beautiful, detailed SVG rose with gradient petals
 * Designed to replace emoji-based flowers with high-quality vector graphics
 * 
 * @param {RoseSvgProps} props - The props for the component
 * @returns {React.JSX.Element} - The rendered SVG rose
 */
export const RoseSvg: React.FC<RoseSvgProps> = ({ 
  size = 40, 
  colorVariant = 'red' 
}) => {
  // Color schemes for different rose variants
  const colorSchemes = {
    red: {
      outer: '#dc2626',      // Deep red
      middle: '#ef4444',     // Bright red
      inner: '#f87171',      // Light red
      center: '#fca5a5',     // Very light red
      shadow: '#991b1b',     // Dark red for depth
    },
    pink: {
      outer: '#ec4899',      // Deep pink
      middle: '#f472b6',     // Bright pink
      inner: '#f9a8d4',      // Light pink
      center: '#fbcfe8',     // Very light pink
      shadow: '#be185d',     // Dark pink for depth
    },
    deepRed: {
      outer: '#991b1b',      // Very deep red
      middle: '#dc2626',     // Deep red
      inner: '#ef4444',      // Bright red
      center: '#f87171',     // Light red
      shadow: '#7f1d1d',     // Almost black red
    },
    coral: {
      outer: '#f97316',      // Deep coral
      middle: '#fb923c',     // Bright coral
      inner: '#fdba74',      // Light coral
      center: '#fed7aa',     // Very light coral
      shadow: '#c2410c',     // Dark coral
    },
  };

  const colors = colorSchemes[colorVariant];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {/* Gradient for outer petals */}
        <RadialGradient
          id={`outerPetal-${colorVariant}`}
          cx="50%"
          cy="50%"
          r="50%"
          fx="30%"
          fy="30%"
        >
          <Stop offset="0%" stopColor={colors.middle} stopOpacity="1" />
          <Stop offset="70%" stopColor={colors.outer} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.shadow} stopOpacity="0.9" />
        </RadialGradient>

        {/* Gradient for middle petals */}
        <RadialGradient
          id={`middlePetal-${colorVariant}`}
          cx="50%"
          cy="50%"
          r="50%"
          fx="40%"
          fy="40%"
        >
          <Stop offset="0%" stopColor={colors.inner} stopOpacity="1" />
          <Stop offset="60%" stopColor={colors.middle} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.outer} stopOpacity="1" />
        </RadialGradient>

        {/* Gradient for inner petals */}
        <RadialGradient
          id={`innerPetal-${colorVariant}`}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0%" stopColor={colors.center} stopOpacity="1" />
          <Stop offset="50%" stopColor={colors.inner} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.middle} stopOpacity="1" />
        </RadialGradient>

        {/* Gradient for center */}
        <RadialGradient
          id={`center-${colorVariant}`}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <Stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
          <Stop offset="50%" stopColor={colors.center} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.inner} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      <G>
        {/* Outer layer - 5 large petals */}
        {/* Petal 1 - Top */}
        <Path
          d="M 50 15 Q 35 10, 30 25 Q 28 35, 40 40 Q 45 35, 50 30 Z"
          fill={`url(#outerPetal-${colorVariant})`}
          opacity="0.95"
        />
        
        {/* Petal 2 - Top Right */}
        <Path
          d="M 50 30 Q 55 25, 65 25 Q 75 28, 70 40 Q 60 45, 55 40 Z"
          fill={`url(#outerPetal-${colorVariant})`}
          opacity="0.95"
        />
        
        {/* Petal 3 - Bottom Right */}
        <Path
          d="M 55 40 Q 60 50, 65 60 Q 65 70, 55 65 Q 50 58, 50 50 Z"
          fill={`url(#outerPetal-${colorVariant})`}
          opacity="0.95"
        />
        
        {/* Petal 4 - Bottom Left */}
        <Path
          d="M 50 50 Q 45 58, 35 65 Q 25 68, 30 55 Q 35 48, 40 40 Z"
          fill={`url(#outerPetal-${colorVariant})`}
          opacity="0.95"
        />
        
        {/* Petal 5 - Left */}
        <Path
          d="M 40 40 Q 30 38, 22 35 Q 15 30, 25 25 Q 35 25, 45 30 Z"
          fill={`url(#outerPetal-${colorVariant})`}
          opacity="0.95"
        />

        {/* Middle layer - 5 medium petals */}
        {/* Middle Petal 1 */}
        <Path
          d="M 50 28 Q 42 26, 38 32 Q 37 38, 43 40 Q 47 38, 50 35 Z"
          fill={`url(#middlePetal-${colorVariant})`}
          opacity="0.98"
        />
        
        {/* Middle Petal 2 */}
        <Path
          d="M 50 35 Q 53 32, 58 33 Q 63 36, 60 42 Q 55 44, 52 42 Z"
          fill={`url(#middlePetal-${colorVariant})`}
          opacity="0.98"
        />
        
        {/* Middle Petal 3 */}
        <Path
          d="M 52 42 Q 54 47, 55 52 Q 54 57, 50 54 Q 48 50, 48 46 Z"
          fill={`url(#middlePetal-${colorVariant})`}
          opacity="0.98"
        />
        
        {/* Middle Petal 4 */}
        <Path
          d="M 48 46 Q 45 50, 42 52 Q 38 52, 40 47 Q 42 43, 45 41 Z"
          fill={`url(#middlePetal-${colorVariant})`}
          opacity="0.98"
        />
        
        {/* Middle Petal 5 */}
        <Path
          d="M 45 41 Q 40 40, 37 38 Q 36 34, 40 32 Q 44 32, 47 35 Z"
          fill={`url(#middlePetal-${colorVariant})`}
          opacity="0.98"
        />

        {/* Inner layer - 4 small petals forming tight spiral */}
        {/* Inner Petal 1 */}
        <Path
          d="M 50 38 Q 46 37, 44 40 Q 44 43, 47 44 Q 49 43, 50 41 Z"
          fill={`url(#innerPetal-${colorVariant})`}
        />
        
        {/* Inner Petal 2 */}
        <Path
          d="M 50 41 Q 52 39, 54 41 Q 55 44, 52 45 Q 50 45, 49 43 Z"
          fill={`url(#innerPetal-${colorVariant})`}
        />
        
        {/* Inner Petal 3 */}
        <Path
          d="M 49 43 Q 49 46, 50 48 Q 48 49, 47 47 Q 47 45, 48 44 Z"
          fill={`url(#innerPetal-${colorVariant})`}
        />
        
        {/* Inner Petal 4 */}
        <Path
          d="M 48 44 Q 46 44, 45 42 Q 46 40, 48 40 Q 49 41, 49 42 Z"
          fill={`url(#innerPetal-${colorVariant})`}
        />

        {/* Center spiral - the heart of the rose */}
        <Path
          d="M 50 41 Q 49 42, 49 43 Q 49 44, 50 44 Q 51 44, 51 43 Q 51 42, 50 42 Z"
          fill={`url(#center-${colorVariant})`}
        />
      </G>
    </Svg>
  );
};

export default RoseSvg;

