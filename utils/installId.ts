/**
 * Anonymous per-install identifier.
 *
 * Generated once on first launch and persisted in AsyncStorage. Used to key the
 * user's streak on the backend without any login/account. We prefer a stable
 * OS-provided id (expo-application) when available, and fall back to a locally
 * generated UUID — both are persisted so the id is stable for the install's
 * lifetime. Everything here is best-effort: failures never throw, they just
 * yield a fresh generated id.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { INSTALL_ID_KEY } from '../constants';

// Memoize so repeated callers don't re-hit AsyncStorage within a session.
let cachedInstallId: string | null = null;

/** RFC4122-ish v4 UUID from Math.random — sufficient for an anonymous id. */
const generateUuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/**
 * Try to derive a stable id from the OS (Android id / iOS vendor id). Returns
 * null on any failure or if the module isn't linked, so callers fall back.
 */
const getOsIdentifier = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId?.();
      if (androidId) return `and-${androidId}`;
    } else if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync?.();
      if (iosId) return `ios-${iosId}`;
    }
  } catch (error) {
    console.log('installId: OS identifier unavailable, generating one:', error);
  }
  return null;
};

/**
 * Returns the anonymous install id, generating + persisting it on first call.
 * Stable for the lifetime of the install (until uninstall / data clear).
 */
export const getInstallId = async (): Promise<string> => {
  if (cachedInstallId) return cachedInstallId;

  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing) {
      cachedInstallId = existing;
      return existing;
    }
  } catch (error) {
    console.log('installId: read failed, generating a new id:', error);
  }

  const id = (await getOsIdentifier()) ?? `gen-${generateUuid()}`;
  cachedInstallId = id;

  try {
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  } catch (error) {
    console.log('installId: persist failed (will retry next launch):', error);
  }

  return id;
};
