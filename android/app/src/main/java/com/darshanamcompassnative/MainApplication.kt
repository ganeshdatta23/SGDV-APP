package com.darshanamcompassnative

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    try {
      // Initialize SoLoader with proper error handling
      SoLoader.init(this, /* native exopackage */ false)
      Log.d("MainApplication", "SoLoader initialized successfully")
    } catch (e: Exception) {
      Log.e("MainApplication", "Failed to initialize SoLoader", e)
      throw e
    }
    
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      try {
        load()
        Log.d("MainApplication", "New Architecture loaded successfully")
      } catch (e: Exception) {
        Log.e("MainApplication", "Failed to load New Architecture", e)
        throw e
      }
    }
    
    if (BuildConfig.DEBUG) {
      try {
        // Initialize Flipper only in debug builds
        initializeFlipper()
        Log.d("MainApplication", "Flipper initialized successfully")
      } catch (e: Exception) {
        Log.w("MainApplication", "Failed to initialize Flipper (this is okay in release builds)", e)
      }
    }
  }
  
  private fun initializeFlipper() {
    if (BuildConfig.DEBUG) {
      try {
        val flipperClass = Class.forName("com.facebook.react.flipper.ReactNativeFlipper")
        val initializeFlipperMethod = flipperClass.getMethod(
          "initializeFlipper",
          android.content.Context::class.java,
          com.facebook.react.ReactInstanceManager::class.java
        )
        initializeFlipperMethod.invoke(null, this, reactNativeHost.reactInstanceManager)
      } catch (e: ClassNotFoundException) {
        Log.w("MainApplication", "Flipper not available")
      } catch (e: Exception) {
        Log.w("MainApplication", "Error initializing Flipper", e)
      }
    }
  }
}
