import { StyleSheet } from 'react-native';

export const eventsViewStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
        gap: 12,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    dateBadge: {
        width: 60,
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginRight: 16,
    },
    dateMonth: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        opacity: 0.8,
        marginBottom: 2,
    },
    dateDay: {
        fontSize: 24,
        fontWeight: '700',
    },
    eventDetails: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 22,
    },
    eventSubtext: {
        fontSize: 12,
        marginBottom: 4,
    },
    eventDescription: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.8,
    },
    chevron: {
        fontSize: 24,
        opacity: 0.4,
        marginLeft: 8,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 14,
    },
});
