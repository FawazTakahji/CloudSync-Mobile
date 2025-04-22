package expo.modules.shizuku

import expo.modules.kotlin.exception.CodedException

class ActivityNotFoundException : CodedException("Failed to get the current activity.")
class ShizukuPreV11Exception : CodedException("Shizuku versions below 11 are not supported.")
class DirectoryDoesntExistException(message: String?) : CodedException(message)
class FileDoesntExistException(message: String?) : CodedException(message)
class PathDoesntExistException(message: String?) : CodedException(message)