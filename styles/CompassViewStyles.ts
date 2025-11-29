import { StyleSheet } from 'react-native';

export const compassViewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  turnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    marginTop: -45,
  },
  turnIcon: {
    fontWeight: 'bold',
  },
  turnText: {
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    position: 'relative',
  },
  phoneMarker: {
    position: 'absolute',
    top: -25,
    zIndex: 10,
  },
  compassDial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHubLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compass: {
    backgroundColor: 'transparent',
  },
  locationContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  locationText: {
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

