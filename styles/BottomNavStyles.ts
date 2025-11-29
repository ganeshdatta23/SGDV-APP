import { StyleSheet } from 'react-native';

export const bottomNavStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 80,
    paddingBottom: 20,
    borderTopWidth: 1,
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

