package expo.modules.shizuku

import android.content.ComponentName
import android.content.ServiceConnection
import android.os.BadParcelableException
import android.os.IBinder
import android.os.NetworkOnMainThreadException
import android.util.Log
import com.squareup.moshi.Moshi
import com.squareup.moshi.adapter
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.delay
import rikka.shizuku.Shizuku
import rikka.shizuku.Shizuku.UserServiceArgs
import java.io.File
import java.io.RandomAccessFile
import java.util.UUID
import kotlin.system.exitProcess
import kotlin.io.path.*

class StorageService : IStorageService.Stub() {
    companion object {
        private const val CHUNK_SIZE = 51200

        private var binder: IStorageService? = null

        private val connection = object : ServiceConnection {
            override fun onServiceConnected(p0: ComponentName?, p1: IBinder?) {
                if (p1?.pingBinder() == true) {
                    binder = asInterface(p1)
                }
            }

            override fun onServiceDisconnected(p0: ComponentName?) {
                binder = null
            }
        }

        private val serviceArgs = UserServiceArgs(
            ComponentName("app.FawazT.CloudSync", StorageService::class.java.name))
            .processNameSuffix("shizuku_storage_service")
            .debuggable(BuildConfig.DEBUG)
            .version(1)

        private fun checkService() {
            if (binder == null) {
                throw Exception("The storage service is not running.")
            }
        }

        suspend fun start() {
            if (binder != null && binder!!.asBinder().pingBinder()) {
                return
            }

            Shizuku.bindUserService(serviceArgs, connection)

            while (binder == null) {
                delay(100)
            }
        }

        suspend fun stop() {
            Shizuku.unbindUserService(serviceArgs, connection, true)

            while (binder != null) {
                delay(100)
            }
        }

        fun check(): Boolean {
            return binder != null && binder!!.asBinder().pingBinder()
        }

        @OptIn(ExperimentalStdlibApi::class)
        private fun rethrowException(ex: IllegalStateException): Nothing {
            if (ex.message == null) {
                throw ex
            }

            val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
            val adapter = moshi.adapter<ExceptionInfo>()
            val exInfo: ExceptionInfo
            try {
                exInfo = adapter.fromJson(ex.message!!) ?: throw ex
            } catch (e: Exception) {
                Log.w("CloudSync Shizuku", "Failed to parse exception info.", e)
                throw ex
            }

            when (exInfo.name) {
                DirectoryDoesntExistException::class.java.name -> throw DirectoryDoesntExistException(exInfo.message)
                FileDoesntExistException::class.java.name -> throw FileDoesntExistException(exInfo.message)
                PathDoesntExistException::class.java.name -> throw PathDoesntExistException(exInfo.message)
                Exception::class.java.name -> throw Exception(exInfo.message, ex)
                else -> throw Exception("${exInfo.name} -> ${exInfo.message ?: "No message"}", ex)
            }
        }

        @OptIn(ExperimentalStdlibApi::class)
        private fun handleException(e: Exception): Nothing {
            when (e) {
                is BadParcelableException,
                is IllegalArgumentException,
                is IllegalStateException,
                is NullPointerException,
                is SecurityException,
                is UnsupportedOperationException,
                is NetworkOnMainThreadException -> throw e
                else -> {
                    val info = ExceptionInfo(e::class.java.name, e.message)
                    val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
                    val adapter = moshi.adapter<ExceptionInfo>()
                    val json: String
                    try {
                        json = adapter.toJson(info)
                    } catch (ex: Exception) {
                        Log.w("CloudSync Shizuku", "Failed to serialize exception info.", ex)
                        throw e
                    }
                    throw IllegalStateException(json, e)
                }
            }
        }

        fun getInfo(path: String): Map<String, Boolean> {
            checkService()

            try {
                val info = binder!!.getInfo(path)
                return mapOf(
                    "isFile" to info.isFile,
                    "isDirectory" to info.isDirectory
                )
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun getSubDirectories(path: String): Array<String> {
            checkService()

            try {
                return binder!!.getSubDirectories(path)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun getSubFiles(path: String): Array<String> {
            checkService()

            try {
                return binder!!.getSubFiles(path)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun getFileBytes(path: String): ByteArray {
            checkService()

            val size: Long
            try {
                size = binder!!.getFileSize(path)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }

            val chunks = ByteArray(size.toInt())

            var offset = 0L
            try {
                while (offset < size) {
                    val end = if (offset + CHUNK_SIZE > size) size else offset + CHUNK_SIZE
                    val chunk = binder!!.getFileChunk(path, offset, end)
                    chunk.copyInto(chunks, offset.toInt())
                    offset += CHUNK_SIZE
                }
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }

            return chunks
        }

        fun getFileText(path: String): String {
            val bytes = getFileBytes(path)
            return bytes.decodeToString()
        }

        fun createDirectory(path: String) {
            checkService()

            try {
                binder!!.createDirectory(path)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun writeFile(path: String, bytes: ByteArray) {
            checkService()

            try {
                val info = binder!!.getInfo(path)
                if (info.isFile) {
                    throw Exception("The file \"$path\" already exists.")
                } else if (info.isDirectory) {
                    throw Exception("The path \"$path\" already exists and is a directory.")
                }

                if (bytes.size <= CHUNK_SIZE) {
                    binder!!.writeFileChunk(path, bytes, 0L)
                    return
                }
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }

            val chunks: MutableList<ByteArray> = mutableListOf()

            var splitOffset = 0L
            while (splitOffset < bytes.size) {
                val end = if (splitOffset + CHUNK_SIZE > bytes.size) bytes.size else splitOffset + CHUNK_SIZE
                val chunk = bytes.copyOfRange(splitOffset.toInt(), end.toInt())
                chunks += chunk
                splitOffset += CHUNK_SIZE
            }

            var writeOffset = 0L
            try {
                for (chunk in chunks) {
                    binder!!.writeFileChunk(path, chunk, writeOffset)
                    writeOffset += chunk.size
                }
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun delete(path: String) {
            checkService()

            try {
                binder!!.delete(path)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }

        fun move(from: String, to: String) {
            checkService()

            try {
                binder!!.move(from, to)
            } catch (e: IllegalStateException) {
                rethrowException(e)
            }
        }
    }

    override fun destroy() {
        exitProcess(0)
    }

    override fun getInfo(path: String): FileInfo {
        try {
            val target = Path(path)

            val info = FileInfo()
            info.isFile = target.isRegularFile()
            info.isDirectory = target.isDirectory()

            return info
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun getSubDirectories(path: String): Array<String> {
        try {
            val target = Path(path)
            if (!target.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$path\" is not a directory or does not exist.")
            }

            val dirs = target.listDirectoryEntries().filter { it.isDirectory() }
            return dirs.map { it.toString() }.toTypedArray()
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun getSubFiles(path: String): Array<String> {
        try {
            val target = Path(path)
            if (!target.isDirectory()) {
                throw DirectoryDoesntExistException("The path \"$path\" is not a directory or does not exist.")
            }

            val files = target.listDirectoryEntries().filter { it.isRegularFile() }
            return files.map { it.toString() }.toTypedArray()
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun getFileSize(path: String): Long {
        try {
            val filePath = Path(path)
            if (!filePath.isRegularFile()) {
                throw FileDoesntExistException("The path \"$path\" is not a file or does not exist.")
            }

            return filePath.fileSize()
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun getFileChunk(path: String, start: Long, end: Long): ByteArray {
        try {
            val file = File(path)
            if (!file.isFile) {
                throw FileDoesntExistException("The path \"$path\" is not a file or does not exist.")
            }

            val raf = RandomAccessFile(file, "r")
            val bytes = ByteArray((end - start).toInt())
            raf.seek(start)
            raf.read(bytes)
            raf.close()
            return bytes
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun createDirectory(path: String) {
        try {
            val target = Path(path)
            if (target.isRegularFile()) {
                throw Exception("The path \"$path\" already exists and is a file.")
            } else if (target.isDirectory()) {
                return
            } else {
                target.createDirectories()
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun writeFileChunk(path: String, bytes: ByteArray, start: Long) {
        try {
            val raf = RandomAccessFile(path, "rw")
            raf.seek(start)
            raf.write(bytes)
            raf.close()
        } catch (e: Exception) {
            handleException(e)
        }
    }

    @OptIn(ExperimentalPathApi::class)
    override fun delete(path: String) {
        try {
            val target = Path(path)
            if (!target.exists()) {
                throw PathDoesntExistException("The file/directory \"$path\" does not exist.")
            }

            val deleted = if (target.isDirectory()) {
                target.deleteRecursively()
                true
            } else {
                target.deleteIfExists()
            }

            if (!deleted) {
                throw Exception("Failed to delete the file/directory \"$path\".")
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    override fun move(from: String, to: String) {
        try {
            val normalizedFrom = Paths.normalize(from)
            val normalizedTo = Paths.normalize(to)
            if (normalizedFrom == normalizedTo) {
                return
            }
            val fromParent = Paths.getParent(normalizedFrom, false)
            val toParent = Paths.getParent(normalizedTo, false)
            val sameParent = Paths.equals(fromParent, toParent, false, ignoreCase = true)
            val oldName = Paths.getName(normalizedFrom, false)
            val newName = Paths.getName(normalizedTo, false)

            val fromPath = Path(normalizedFrom)
            val toPath = Path(normalizedTo)

            if (!sameParent) {
                val toParentPath = Path(toParent)
                if (!toParentPath.exists()) {
                    toParentPath.createDirectories()
                }

                fromPath.moveTo(toPath)
            } else if (oldName.equals(newName, ignoreCase = true)) {
                var tempName = UUID.randomUUID().toString()
                val maxRetries = 100
                var retries = 0

                while (retries < maxRetries) {
                    if (!Path(Paths.combine(toParent, tempName)).exists()) {
                        break
                    }
                    tempName = UUID.randomUUID().toString()
                    retries++
                }
                if (retries >= maxRetries) {
                    throw Exception("Failed to rename the file/directory")
                }

                val tempPath = Path(Paths.combine(toParent, tempName))
                toPath.moveTo(tempPath)
                tempPath.moveTo(Path(Paths.combine(toParent, newName)))
            } else {
                fromPath.moveTo(toPath)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }
}