package expo.modules.androidutils

import android.app.Activity.RESULT_OK
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import androidx.core.net.toUri

class AndroidUtilsModule : Module() {
  private var primaryStoragePath: String? = null
  private val manageExternalStorageRequestCode: Int = 2296
  private var manageExternalStorageSrc: CompletableDeferred<Boolean>? = null

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

    Function("isExternalStorageManager") {
      return@Function Environment.isExternalStorageManager()
    }

    AsyncFunction("requestManageExternalStoragePermission") Coroutine { ->
      if (Environment.isExternalStorageManager()) {
        return@Coroutine true
      }
      if (appContext.currentActivity == null) {
        throw ActivityNotFoundException()
      }

      manageExternalStorageSrc = CompletableDeferred()
      val uri = "package:${appContext.currentActivity!!.packageName}".toUri()
      val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri)
      appContext.currentActivity!!.startActivityForResult(intent, manageExternalStorageRequestCode)
      val result = manageExternalStorageSrc!!.await()
      manageExternalStorageSrc = null
      return@Coroutine result
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == manageExternalStorageRequestCode) {
        manageExternalStorageSrc?.complete(Environment.isExternalStorageManager())
      }
    }
  }
}
