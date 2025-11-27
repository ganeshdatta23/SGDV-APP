import { StyleSheet } from 'react-native';

const IMAGE_WIDTH = 280;
const IMAGE_HEIGHT = 360;

export const darshanOverlayStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        backgroundColor: '#000',
    },
    dimmingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    auraContainer: {
        width: 600, // Increased size even further for massive glow spread
        height: 600,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    darshanImage: {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        zIndex: 10,
        // Optional: subtle shadow on the image itself to separate it from the glow
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    controlButtonsContainer: {
        position: 'absolute',
        bottom: 100,
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 20,
    },
    controlButton: {
        padding: 4,
    },
    controlButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderWidth: 2,
        borderColor: 'rgba(251, 191, 36, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#fbbf24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
});
