import * as Network from 'expo-network';
import { getConnectivity, subscribeConnectivity, isOnline } from '../utils/connectivity';

const mockGetState = Network.getNetworkStateAsync as jest.Mock;
const mockAddListener = Network.addNetworkStateListener as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Restore the default mock implementations (some tests override them once).
  mockGetState.mockResolvedValue({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  });
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});

describe('isOnline', () => {
  it('is online only when connected and not explicitly unreachable', () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true); // undetermined -> optimistic
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
    expect(isOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
  });
});

describe('getConnectivity', () => {
  it('normalizes undefined reachability to null', async () => {
    mockGetState.mockResolvedValueOnce({ type: 'CELLULAR', isConnected: true });
    const state = await getConnectivity();
    expect(state).toEqual({ isConnected: true, isInternetReachable: null });
  });

  it('assumes online when the native module throws', async () => {
    mockGetState.mockRejectedValueOnce(new Error('native boom'));
    const state = await getConnectivity();
    expect(state).toEqual({ isConnected: true, isInternetReachable: null });
  });
});

describe('subscribeConnectivity', () => {
  it('registers a listener and unsubscribe calls remove()', () => {
    const remove = jest.fn();
    mockAddListener.mockReturnValueOnce({ remove });
    const cb = jest.fn();

    const unsubscribe = subscribeConnectivity(cb);
    expect(mockAddListener).toHaveBeenCalledTimes(1);

    // Drive the registered native listener and confirm we forward a normalized state.
    const nativeListener = mockAddListener.mock.calls[0][0];
    nativeListener({ type: 'WIFI', isConnected: true, isInternetReachable: undefined });
    expect(cb).toHaveBeenCalledWith({ isConnected: true, isInternetReachable: null });

    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op unsubscribe (and does not throw) when the module throws', () => {
    mockAddListener.mockImplementationOnce(() => {
      throw new Error('native boom');
    });
    const unsubscribe = subscribeConnectivity(jest.fn());
    expect(() => unsubscribe()).not.toThrow();
  });
});
