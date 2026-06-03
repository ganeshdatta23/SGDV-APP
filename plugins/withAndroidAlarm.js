const { withAndroidManifest, withProjectBuildGradle } = require('@expo/config-plugins');

// notifee ships its `app.notifee:core` AAR in a local maven repo bundled inside
// the npm package. notifee registers that repo from its own build.gradle via
// rootProject.allprojects {}, but `expo run:android` builds with
// --configure-on-demand, which configures notifee AFTER :app's classpath is
// resolved -- so the repo is registered too late and the build fails with
// "Could not find any matches for app.notifee:core:+". Registering it in the
// root build.gradle's allprojects.repositories makes it available from the
// start. Idempotent.
function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }
    if (cfg.modResults.contents.includes('@notifee/react-native/android/libs')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /allprojects\s*\{\s*\n(\s*)repositories\s*\{/,
      (match, indent) =>
        `${match}\n${indent}  maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`
    );
    return cfg;
  });
}

// notifee's core AAR declares app.notifee.core.ForegroundService with
// android:foregroundServiceType="shortService", which on Android 14+ has a hard
// ~3-minute timeout and cannot host a long-running alarm. Override it to
// "mediaPlayback" (the app already declares FOREGROUND_SERVICE_MEDIA_PLAYBACK)
// so the alarm's foreground service can run until the user stops it, and so the
// MEDIA_PLAYBACK type we start it with matches the manifest declaration.
function overrideNotifeeForegroundServiceType(manifest) {
  // Ensure the tools namespace is available for tools:replace.
  manifest.manifest.$ = manifest.manifest.$ || {};
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

  const application = manifest.manifest.application?.[0];
  if (!application) {
    return;
  }

  application.service = application.service || [];
  const NAME = 'app.notifee.core.ForegroundService';
  let service = application.service.find(
    (s) => s.$?.['android:name'] === NAME
  );

  if (!service) {
    service = { $: { 'android:name': NAME } };
    application.service.push(service);
  }

  service.$['android:foregroundServiceType'] = 'mediaPlayback';
  service.$['tools:replace'] = 'android:foregroundServiceType';
}

function addPermissionIfMissing(manifest, permission) {
  const fullPermission = permission.startsWith('android.permission.')
    ? permission
    : `android.permission.${permission}`;

  const permissions = manifest.manifest['uses-permission'] || [];
  const exists = permissions.some(
    (p) => p.$?.['android:name'] === fullPermission
  );

  if (!exists) {
    permissions.push({ $: { 'android:name': fullPermission } });
  }

  manifest.manifest['uses-permission'] = permissions;
}

function withAndroidAlarm(config) {
  config = withNotifeeMavenRepo(config);
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Add alarm-related permissions
    addPermissionIfMissing(manifest, 'WAKE_LOCK');
    addPermissionIfMissing(manifest, 'USE_FULL_SCREEN_INTENT');
    addPermissionIfMissing(manifest, 'FOREGROUND_SERVICE');
    addPermissionIfMissing(manifest, 'FOREGROUND_SERVICE_MEDIA_PLAYBACK');

    // Make notifee's foreground service able to host a long-running alarm.
    overrideNotifeeForegroundServiceType(manifest);

    // Add showWhenLocked and turnScreenOn to main activity
    const application = manifest.manifest.application?.[0];
    if (application?.activity) {
      const mainActivity = application.activity.find(
        (activity) =>
          activity.$?.['android:name'] === '.MainActivity' ||
          activity.$?.['android:name']?.endsWith('.MainActivity')
      );

      if (mainActivity) {
        mainActivity.$['android:showWhenLocked'] = 'true';
        mainActivity.$['android:turnScreenOn'] = 'true';
      }
    }

    return config;
  });
}

module.exports = withAndroidAlarm;
