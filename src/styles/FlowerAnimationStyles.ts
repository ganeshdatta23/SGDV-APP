import { StyleSheet } from 'react-native';

export const flowerAnimationStyles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    flower: {
        position: 'absolute',
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flowerEmoji: {
        fontSize: 24,
        textAlign: 'center',
    },
});
