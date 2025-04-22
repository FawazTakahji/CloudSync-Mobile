package expo.modules.safutils

import android.app.Activity.RESULT_OK
import android.content.Intent
import android.provider.DocumentsContract
import expo.modules.kotlin.events.OnActivityResultPayload
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred


class SafUtilsModule : Module() {
  private val requestCode: Int = 2297
  private var requestSrc: CompletableDeferred<OnActivityResultPayload>? = null

  private val pickDirectoryCode: Int = 2298
  private var pickDirectorySrc: CompletableDeferred<OnActivityResultPayload>? = null

  private fun validateActivity(){
    if (appContext.currentActivity == null) {
      throw ActivityNotFoundException()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("SafUtils")

    AsyncFunction("requestSAFPermission") Coroutine { ->
      validateActivity()

      try {
        requestSrc = CompletableDeferred()

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
          putExtra(
            DocumentsContract.EXTRA_INITIAL_URI,
            DocumentsContract.buildDocumentUri(Storage.AUTHORITY, Storage.DATAPATH))
        }
        intent.flags = intent.flags or
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION

        appContext.currentActivity!!.startActivityForResult(intent, requestCode)

        val result: OnActivityResultPayload = requestSrc!!.await()
        if (result.resultCode != RESULT_OK) {
          return@Coroutine false
        }
        val uri = result.data?.data
        if (uri == null) {
          throw Exception("Failed to get the payload data.")
        }
        if (uri.authority != Storage.AUTHORITY || uri.lastPathSegment != Storage.DATAPATH) {
          return@Coroutine false
        }

        val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        appContext.currentActivity!!.contentResolver.takePersistableUriPermission(uri, takeFlags)
        return@Coroutine true
      } finally {
        requestSrc = null
      }
    }

    Function("checkSAFPermission") {
      validateActivity()

      return@Function appContext.currentActivity!!.contentResolver.persistedUriPermissions.any {
        it.uri?.authority == Storage.AUTHORITY
                && it.uri?.lastPathSegment == Storage.DATAPATH
                && it.isReadPermission
                && it.isWritePermission
      }
    }

    AsyncFunction("requestDirectoryTemporaryPermissions") Coroutine { ->
      validateActivity()

      try {
        pickDirectorySrc = CompletableDeferred()

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
        intent.flags = intent.flags or
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION

        appContext.currentActivity!!.startActivityForResult(intent, pickDirectoryCode)

        val result: OnActivityResultPayload = pickDirectorySrc!!.await()
        if (result.resultCode != RESULT_OK) {
          return@Coroutine null
        } else if (result.data == null) {
          throw Exception("Failed to get the payload data.")
        }

        return@Coroutine result.data!!.data
      } finally {
        pickDirectorySrc = null
      }
    }

    Function("getInfo") { path: String ->
      validateActivity()

      val (isFile, isDirectory) = Storage.getInfo(appContext.currentActivity!!, path)
      return@Function mapOf(
        "isFile" to isFile,
        "isDirectory" to isDirectory
      )
    }

    Function("getSubDirectories") { path: String ->
      validateActivity()

      return@Function Storage.getSubDirectories(appContext.currentActivity!!, path)
    }

    Function("getSubFiles") { path: String ->
      validateActivity()

      return@Function Storage.getSubFiles(appContext.currentActivity!!, path)
    }

    Function("getFileBytes") { path: String ->
      validateActivity()

      return@Function Storage.getFileBytes(appContext.currentActivity!!, path)
    }

    Function("getFileText") { path: String ->
      validateActivity()

      return@Function Storage.getFileText(appContext.currentActivity!!, path)
    }

    Function("createDirectory") { path: String ->
      validateActivity()

      Storage.createDirectory(appContext.currentActivity!!, path)
    }

    Function("writeFile") { parentPath: String, name: String, bytes: ByteArray ->
      validateActivity()

      Storage.writeFile(appContext.currentActivity!!, parentPath, name, bytes)
    }

    Function("delete") { path: String ->
      validateActivity()

      Storage.delete(appContext.currentActivity!!, path)
    }

    Function("rename") { path: String, newName: String ->
      validateActivity()

      Storage.rename(appContext.currentActivity!!, path, newName)
    }

    Function("move") { from: String, to: String ->
      validateActivity()

      Storage.move(appContext.currentActivity!!, from, to)
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == requestCode) {
        requestSrc?.complete(payload)
      } else if (payload.requestCode == pickDirectoryCode) {
        pickDirectorySrc?.complete(payload)
      }
    }
  }
}
