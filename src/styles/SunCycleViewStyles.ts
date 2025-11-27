import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ARC_WIDTH = SCREEN_WIDTH - 80;
export const ARC_HEIGHT = 200;

export const sunCycleViewStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.7,
    },
    arcContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    countdownContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    countdownLabel: {
        fontSize: 18,
        color: '#FFFFFF',
        opacity: 0.8,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    countdownTime: {
        fontSize: 64,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 4,
    },
    countdownSubtext: {
        fontSize: 20,
        color: '#FFFFFF',
        opacity: 0.7,
        marginTop: 8,
    },
    timesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
    },
    timeCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        minWidth: 140,
    },
    timeLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.7,
        marginTop: 8,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    controlsContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    controlRowSpaced: {
        marginTop: 16,
    },
    controlLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    controlText: {
        fontSize: 16,
        color: '#FFFFFF',
        marginLeft: 12,
    },
    controlTextNested: {
        fontSize: 15,
        color: '#FFFFFF',
        marginLeft: 12,
        opacity: 0.9,
    },
    nestedControls: {
        marginLeft: 20,
        paddingLeft: 16,
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(253, 184, 19, 0.3)',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    testButtonActive: {
        backgroundColor: '#DC3545',
    },
    testButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(253, 184, 19, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#FFFFFF',
        marginLeft: 8,
        flex: 1,
    },
});

