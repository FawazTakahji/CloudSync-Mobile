package expo.modules.safutils

import expo.modules.kotlin.exception.CodedException

class ActivityNotFoundException : CodedException("Failed to get the current activity.")
class DirectoryDoesntExistException(message: String?) : CodedException(message)
class FileDoesntExistException(message: String?) : CodedException(message)
class PathDoesntExistException(message: String?) : CodedException(message)