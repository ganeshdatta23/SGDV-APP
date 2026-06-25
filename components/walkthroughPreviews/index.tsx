import React from 'react';
import { ThemeMode, WalkthroughPreviewId } from '../../types';
import WelcomePreview from './WelcomePreview';
import CompassPreview from './CompassPreview';
import AlarmPreview from './AlarmPreview';
import ProgramsPreview from './ProgramsPreview';
import SettingsPreview from './SettingsPreview';

// Maps a walkthrough slide's `preview` id to its live in-app preview component.
const PREVIEWS: Record<WalkthroughPreviewId, React.FC<{ theme: ThemeMode }>> = {
  welcome: WelcomePreview,
  compass: CompassPreview,
  alarm: AlarmPreview,
  programs: ProgramsPreview,
  settings: SettingsPreview,
};

const WalkthroughPreview: React.FC<{ id: WalkthroughPreviewId; theme: ThemeMode }> = ({
  id,
  theme,
}) => {
  const Preview = PREVIEWS[id];
  return <Preview theme={theme} />;
};

export default WalkthroughPreview;
