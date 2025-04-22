package expo.modules.shizuku

import android.content.pm.PackageManager
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import rikka.shizuku.Shizuku
import rikka.shizuku.Shizuku.OnRequestPermissionResultListener


class ShizukuModule : Module() {
  private val permissionRequestCode: Int = 2298
  private var permissionRequestSrc: CompletableDeferred<Boolean>? = null

  private fun validateActivity(){
    if (appContext.currentActivity == null) {
      throw ActivityNotFoundException()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("Shizuku")

    Function("isInstalled") {
      validateActivity()

      val packageManager = appContext.currentActivity!!.packageManager
      try {
        packageManager.getPackageInfo("moe.shizuku.privileged.api", 0)
        return@Function true
      } catch (e: PackageManager.NameNotFoundException) {
        return@Function false
      }
    }

    Function("openApp") {
      validateActivity()

      val packageManager = appContext.currentActivity!!.packageManager
      val intent = packageManager.getLaunchIntentForPackage("moe.shizuku.privileged.api")
      if (intent != null) {
        appContext.currentActivity!!.startActivity(intent)
      } else {
        throw Exception("The app is not installed.")
      }
    }

    AsyncFunction("requestPermission") Coroutine { ->
      if (Shizuku.isPreV11()) {
        throw ShizukuPreV11Exception()
      }
      if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
        return@Coroutine true
      } else if (Shizuku.shouldShowRequestPermissionRationale()) {
        return@Coroutine false
      }

      try {
        permissionRequestSrc = CompletableDeferred()

        Shizuku.requestPermission(permissionRequestCode)
        val result = permissionRequestSrc!!.await()

        return@Coroutine result
      } finally {
        permissionRequestSrc = null
      }
    }

    Function("checkPermission") {
      if (Shizuku.isPreV11()) {
        throw ShizukuPreV11Exception()
      }

      return@Function Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
    }

    Function("ping") {
      return@Function Shizuku.pingBinder()
    }

    AsyncFunction("startStorageService") Coroutine { ->
      StorageService.start()
    }

    AsyncFunction("stopStorageService") Coroutine { ->
      StorageService.stop()
    }

    Function("checkStorageService") {
      return@Function StorageService.check()
    }

    Function("getInfo") { path: String ->
      return@Function StorageService.getInfo(path)
    }

    Function("getSubDirectories") { path: String ->
      return@Function StorageService.getSubDirectories(path)
    }

    Function("getSubFiles") { path: String ->
      return@Function StorageService.getSubFiles(path)
    }

    Function("getFileBytes") { path: String ->
      return@Function StorageService.getFileBytes(path)
    }

    Function("getFileText") { path: String ->
      return@Function StorageService.getFileText(path)
    }

    Function("createDirectory") { path: String ->
      StorageService.createDirectory(path)
    }

    Function("writeFile") { path: String, bytes: ByteArray ->
      StorageService.writeFile(path, bytes)
    }

    Function("delete") { path: String ->
      StorageService.delete(path)
    }

    Function("move") { from: String, to: String ->
      StorageService.move(from, to)
    }

    OnCreate {
      Shizuku.addRequestPermissionResultListener(resultListener)
    }

    OnDestroy {
      Shizuku.removeRequestPermissionResultListener(resultListener)
    }
  }

  private val resultListener: OnRequestPermissionResultListener = OnRequestPermissionResultListener { requestCode, grantResult ->
    if (requestCode == permissionRequestCode) {
      val permissionGranted = grantResult == PackageManager.PERMISSION_GRANTED
      permissionRequestSrc?.complete(permissionGranted)
    }
  }
}
