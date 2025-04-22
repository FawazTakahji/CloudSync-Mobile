package expo.modules.safutils

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import android.provider.DocumentsContract
import com.lazygeniouz.dfc.file.DocumentFileCompat
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID
import androidx.core.net.toUri

class Storage {
    companion object {
        public const val AUTHORITY: String = "com.android.externalstorage.documents"
        public const val DATAPATH: String = "primary:Android/data"
        private var androidDataStoragePath: String? = null

        private fun getAndroidDataStoragePath(context: Context): String {
            val primaryStoragePath: String
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val storageManager = context.getSystemService(Context.STORAGE_SERVICE) as StorageManager
                val storageDirectory = storageManager.primaryStorageVolume.directory ?: throw Exception("Failed to get the primary storage directory.")
                primaryStoragePath = storageDirectory.absolutePath
            } else {
                val storageDirectory = Environment.getExternalStorageDirectory() ?: throw Exception("Failed to get the primary storage directory.")
                primaryStoragePath =  storageDirectory.absolutePath
            }

            return Paths.combine(primaryStoragePath, "Android/data")
        }

        fun validatePath(path: String, context: Context): String {
            if (androidDataStoragePath == null) {
                androidDataStoragePath = getAndroidDataStoragePath(context)
            }
            val normalizedPath = Paths.normalize(path)
            if (normalizedPath.equals(androidDataStoragePath!!, ignoreCase = true)) {
                return normalizedPath
            }
            if (normalizedPath.startsWith("${androidDataStoragePath!!}/", ignoreCase = true)) {
                return normalizedPath.replace("${androidDataStoragePath!!}/", "", ignoreCase = true)
            }

            throw Exception("The path \"$normalizedPath\" is not inside the Android/data directory.")
        }

        private fun getDocumentFile(path: String, context: Context): DocumentFileCompat? {
            val newPath = validatePath(path, context)
            val uri = "content://${AUTHORITY}/tree/${Uri.encode(DATAPATH)}".toUri()
            val dataFile = DocumentFileCompat.fromTreeUri(context, uri)
                ?: throw Exception("Failed to get the DocumentFile for Android/data.")

            if (newPath.equals(androidDataStoragePath!!, ignoreCase = true)) {
                return dataFile
            }

            return dataFile.traverseDirectory(newPath)
        }

        fun getInfo(context: Context, path: String): Pair<Boolean, Boolean> {
            val file = getDocumentFile(path, context) ?: return Pair(false, false)

            return Pair(file.isFile(), file.isDirectory())
        }

        fun getSubDirectories(context: Context, path: String): Array<String> {
            val directory = getDocumentFile(path, context)
            if (directory == null) {
                throw DirectoryDoesntExistException("The directory \"$path\" does not exist.")
            } else if (!directory.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$path\" is not a directory.")
            }

            var dirs: Array<String> = arrayOf()
            val subFiles = directory.listFiles()

            for (file in subFiles) {
                if (!file.isDirectory()) {
                    continue
                } else if (file.uri.authority != AUTHORITY || file.uri.lastPathSegment == null || !file.uri.lastPathSegment!!.startsWith(DATAPATH)) {
                    continue
                }

                val dirPath = file.uri.lastPathSegment!!.replace(DATAPATH, "")
                dirs += Paths.combine(androidDataStoragePath!!, dirPath)
            }

            return dirs
        }

        fun getSubFiles(context: Context, path: String): Array<String> {
            val directory = getDocumentFile(path, context)
            if (directory == null) {
                throw DirectoryDoesntExistException("The directory \"$path\" does not exist.")
            } else if (!directory.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$path\" is not a directory.")
            }

            var files: Array<String> = arrayOf()
            val subFiles = directory.listFiles()

            for (file in subFiles) {
                if (!file.isFile()) {
                    continue
                } else if (file.uri.authority != AUTHORITY || file.uri.lastPathSegment == null || !file.uri.lastPathSegment!!.startsWith(DATAPATH)) {
                    continue
                }

                val filePath = file.uri.lastPathSegment!!.replace(DATAPATH, "")
                files += Paths.combine(androidDataStoragePath!!, filePath)
            }

            return files
        }

        fun getFileBytes(context: Context, path: String): ByteArray {
            val file = getDocumentFile(path, context)
            if (file == null) {
                throw FileDoesntExistException("The file \"$path\" does not exist.")
            } else if (!file.isFile()) {
                throw FileDoesntExistException("The path \"$path\" is not a file.")
            }

            var stream: InputStream? = null
            try {
                stream = context.contentResolver.openInputStream(file.uri)
                if (stream == null) {
                    throw Exception("Failed to get the input stream for the file \"$path\".")
                }

                return stream.readBytes()
            } finally {
                stream?.close()
            }
        }

        fun getFileText(context: Context, path: String): String {
            val file = getDocumentFile(path, context)
            if (file == null) {
                throw FileDoesntExistException("The file \"$path\" does not exist.")
            } else if (!file.isFile()) {
                throw FileDoesntExistException("The path \"$path\" is not a file.")
            }

            var stream: InputStream? = null
            try {
                stream = context.contentResolver.openInputStream(file.uri)
                if (stream == null) {
                    throw Exception("Failed to get the input stream for the file \"$path\".")
                }

                return stream.bufferedReader().use { it.readText() }
            } finally {
                stream?.close()
            }
        }

        fun createDirectory(context: Context, path: String): DocumentFileCompat? {
            val newPath = validatePath(path, context)
            if (newPath.equals(androidDataStoragePath!!, ignoreCase = true)) {
                return getDocumentFile(newPath, context)
            }

            val docFile = getDocumentFile(androidDataStoragePath!!, context)
            if (docFile == null) {
                throw DirectoryDoesntExistException("The directory \"$androidDataStoragePath!!\" does not exist.")
            } else if (!docFile.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$androidDataStoragePath!!\" is not a directory.")
            }

            var file = docFile
            val dirs = newPath.split('/')

            for (dir in dirs) {
                if (!Paths.isNameValid(dir)) {
                    throw Exception("The name \"$dir\" is not valid.")
                }
            }

            for (dir in dirs) {
                var nextFile = file!!.findFile(dir)
                if (nextFile == null) {
                    nextFile = file.createDirectory(dir)
                    if (nextFile == null) {
                        throw Exception("Failed to create the directory \"$dir\".")
                    }
                    file = nextFile
                } else if (nextFile.isFile()) {
                    throw Exception("The target \"$dir\" already exists and is not a directory.")
                } else {
                    file = nextFile
                }
            }

            return file
        }

        fun writeFile(context: Context, parentPath: String, name: String, bytes: ByteArray) {
            if (!Paths.isNameValid(name)) {
                throw Exception("The name \"$name\" is not valid.")
            }
            val parent = getDocumentFile(parentPath, context)
            if (parent == null) {
                throw DirectoryDoesntExistException("The directory \"$parentPath\" does not exist.")
            } else if (!parent.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$parentPath\" is not a directory.")
            }

            var file = parent.findFile(name)
            if (file == null) {
                file = parent.createFile("application/octet-stream", name)
                if (file == null) {
                    throw Exception("Failed to create the file \"$name\".")
                }
            } else if (file.isFile()) {
                file.delete()
                file = parent.createFile("application/octet-stream", name)
                if (file == null) {
                    throw Exception("Failed to create the file \"$name\".")
                }
            } else if (file.isDirectory()) {
                throw Exception("The target \"$name\" already exists and is not a file.")
            }

            var stream: OutputStream? = null
            try {
                stream = context.contentResolver.openOutputStream(file.uri)
                if (stream == null) {
                    throw Exception("Failed to get the output stream for the file \"$name\".")
                }

                stream.write(bytes)
            } finally {
                stream?.close()
            }
        }

        fun delete(context: Context, path: String) {
            val file = getDocumentFile(path, context)
            if (file == null) {
                throw PathDoesntExistException("The path \"$path\" does not exist.")
            }

            val deleted = file.delete()
            if (!deleted) {
                throw Exception("Failed to delete the file \"$path\".")
            }
        }

        fun rename(context: Context, path: String, newName: String) {
            if (!Paths.isNameValid(newName)) {
                throw Exception("The name \"$newName\" is not valid.")
            }

            val normalizedPath = Paths.normalize(path)
            val parent = Paths.getParent(normalizedPath, false)
            val name = Paths.getName(normalizedPath, false)
            if (name == newName) {
                return
            }
            val sameName = name.equals(newName, ignoreCase = true)

            val newPath = Paths.combine(parent, newName)
            val newFile = getDocumentFile(newPath, context)
            if (newFile != null  && !sameName) {
                throw Exception("The file/directory \"$newPath\" already exists.")
            }

            val file = getDocumentFile(path, context) ?: throw PathDoesntExistException("The path \"$path\" does not exist.")

            if (sameName) {
                renameCapitalization(context, file.uri, parent, newName)
            } else {
                DocumentsContract.renameDocument(context.contentResolver, file.uri, newName)
            }
        }

        fun move(context: Context, from: String, to: String) {
            val normalizedFrom = Paths.normalize(from)
            val normalizedTo = Paths.normalize(to)
            if (normalizedFrom == normalizedTo) {
                return
            }
            if (normalizedTo.startsWith(normalizedFrom, ignoreCase = true) && normalizedTo.length > normalizedFrom.length && normalizedTo[normalizedFrom.length] == '/') {
                throw Exception("The destination path \"$normalizedTo\" is a sub path of the source path \"$normalizedFrom\".")
            }

            val oldName = Paths.getName(normalizedFrom, false)
            val newName = Paths.getName(normalizedTo, false)
            val fromParentPath = Paths.getParent(normalizedFrom, false)
            val toParentPath = Paths.getParent(normalizedTo, false)
            val sameParent = Paths.equals(fromParentPath, toParentPath, false, ignoreCase = true)

            if (!Paths.isNameValid(newName)) {
                throw Exception("The name \"$newName\" is not valid.")
            }

            val fromFile = getDocumentFile(normalizedFrom, context) ?: throw PathDoesntExistException("The path \"$normalizedFrom\" does not exist.")

            val toFile = getDocumentFile(normalizedTo, context)
            if (toFile != null && !sameParent) {
                throw Exception("The file/directory \"$normalizedTo\" already exists.")
            }

            if (!sameParent) {
                val fromParent = getDocumentFile(fromParentPath, context) ?: throw Exception("Failed to get the parent directory of \"$normalizedFrom\".")

                val toParent = getDocumentFile(toParentPath, context) ?: createDirectory(context, toParentPath)
                if (toParent == null) {
                    throw Exception("Failed to get the parent directory of \"$normalizedTo\".")
                }

                DocumentsContract.moveDocument(context.contentResolver, fromFile.uri, fromParent.uri, toParent.uri)
            }

            if (oldName != newName) {
                val newFile = if (sameParent) {
                    fromFile
                } else {
                    getDocumentFile(Paths.combine(toParentPath, oldName), context)
                }
                if (newFile == null) {
                    throw Exception("Failed to get the moved file in \"$toParentPath\".")
                }

                if (oldName.equals(newName, ignoreCase = true)) {
                    renameCapitalization(context, newFile.uri, toParentPath, newName)
                } else {
                    DocumentsContract.renameDocument(context.contentResolver, newFile.uri, newName)
                }
            }
        }

        private fun renameCapitalization(context: Context, uri: Uri, parent: String, newName: String) {
            var tempName = UUID.randomUUID().toString()
            val maxRetries = 100
            var retries = 0

            while (retries < maxRetries) {
                if (getDocumentFile(Paths.combine(parent, tempName), context) == null) {
                    break
                }
                tempName = UUID.randomUUID().toString()
                retries++
            }
            if (retries >= maxRetries) {
                throw Exception("Failed to rename the file.")
            }

            DocumentsContract.renameDocument(context.contentResolver, uri, tempName)

            val tempPath = Paths.combine(parent, tempName)
            val tempFile = getDocumentFile(tempPath, context) ?: throw Exception("Failed to get the file renamed file \"$tempPath\".")
            DocumentsContract.renameDocument(context.contentResolver, tempFile.uri, newName)
        }
    }
}

fun DocumentFileCompat.traverseDirectory(path: String) : DocumentFileCompat? {
    if (!this.isDirectory()) {
        throw Exception("The current document file \"${this.uri}\" is not a directory.")
    }

    var file: DocumentFileCompat? = null
    val dirs = path.split("/")

    for (dir in dirs) {
        if (file == null) {
            file = this.findFileCaseInsensitive(dir)
        } else {
            file = file.findFileCaseInsensitive(dir)
            if (file == null) {
                break
            }
        }
    }

    return file
}

fun DocumentFileCompat.findFileCaseInsensitive(name: String): DocumentFileCompat? {
    return this.listFiles().firstOrNull { file -> file.name.isNotEmpty() && file.name.equals(name, ignoreCase = true) }
}