# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native specific rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep SoLoader classes
-keep class com.facebook.soloader.** { *; }

# Keep React Native modules
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.bridge.BaseJavaModule { *; }

# Keep classes with @ReactMethod annotations
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep ViewManager classes
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * extends com.facebook.react.uimanager.BaseViewManager { *; }

# Keep TurboModule classes (for new architecture)
-keep class * extends com.facebook.react.turbomodule.core.interfaces.TurboModule { *; }

# Keep native module packages
-keep class * implements com.facebook.react.bridge.ReactPackage { *; }

# Keep autolinking generated modules
-keep class com.** { *; }

# Keep React Native vector icons
-keep class com.oblador.vectoricons.** { *; }

# Keep other third-party libraries
-keep class com.agontuk.** { *; }
-keep class com.mkuczera.** { *; }
-keep class com.sensors.** { *; }
-keep class com.zmxv.** { *; }
-keep class com.horcrux.** { *; }
-keep class com.brentvatne.** { *; } 