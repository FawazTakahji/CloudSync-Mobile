package expo.modules.androidutils

import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidUtilsModule : Module() {
  private var primaryStoragePath: String? = null

  private fun validateActivity(){
    if (appContext.currentActivity == null) {
      throw ActivityNotFoundException()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AndroidUtils")

    Constants(
      "sdkVersion" to Build.VERSION.SDK_INT
    )

    Function("getPrimaryStoragePath") {
      if (primaryStoragePath != null) {
        return@Function primaryStoragePath!!
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        validateActivity()
        val storageManager = appContext.currentActivity!!.getSystemService(Context.STORAGE_SERVICE) as StorageManager
        val storageDirectory = storageManager.primaryStorageVolume.directory ?: throw Exception("Failed to get the primary storage directory.")
        primaryStoragePath = storageDirectory.absolutePath
        return@Function primaryStoragePath!!
      } else {
        val storageDirectory = Environment.getExternalStorageDirectory() ?: throw Exception("Failed to get the primary storage directory.")
        primaryStoragePath = storageDirectory.absolutePath
        return@Function primaryStoragePath!!
      }
    }
  }
}
