import { StyleSheet } from 'react-native';

export const aartiAnimationStyles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    diya: {
        position: 'absolute',
        // Center the element on its coordinate - dynamic sizing handled in render
        justifyContent: 'center',
        alignItems: 'center',
        // Margins are now dynamic
    },
    diyaContainer: {
        width: 60, // Base size
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    flameContainer: {
        position: 'absolute',
        top: 0,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    baseContainer: {
        position: 'absolute',
        // bottom is now dynamic via inline style
        zIndex: 5,
    }
});
