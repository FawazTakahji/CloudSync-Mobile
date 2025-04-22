package expo.modules.shizuku

class Paths {
    companion object {
        private val replacements = listOf(
            Regex("\\\\+") to "/",
            Regex("/{2,}") to "/",
            Regex("(\\w+)/\\.\\./?") to "",
            Regex("^\\./") to "",
            Regex("/\\./") to "/",
            Regex("/\\.$") to "",
            Regex("/$") to ""
        )

        fun normalize(path: String): String {
            var normalizedPath = path

            replacements.forEach { (regex, replacement) ->
                while (normalizedPath.contains(regex)) {
                    normalizedPath = normalizedPath.replace(regex, replacement)
                }
            }

            return normalizedPath
        }

        fun getParent(path: String, normalize: Boolean = true): String {
            val normalizedPath = if (normalize) normalize(path) else path
            return normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
        }

        fun getName(path: String, normalize: Boolean = true): String {
            val normalizedPath = if (normalize) normalize(path) else path
            return normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)
        }

        fun combine(path: String, vararg paths: String): String {
            var combinedPath = path
            for (path in paths) {
                val combinedPathEndingSlash = combinedPath.endsWith('/') || combinedPath.endsWith('\\')
                val pathLeadingSlash = path.startsWith('/') || path.startsWith('\\')

                combinedPath = if ((combinedPathEndingSlash && !pathLeadingSlash) || (!combinedPathEndingSlash && pathLeadingSlash)) {
                    "$combinedPath$path"
                } else {
                    "$combinedPath/$path"
                }
            }

            return normalize(combinedPath)
        }

        fun equals(path1: String, path2: String, normalize: Boolean = true, ignoreCase: Boolean = false): Boolean {
            val normalizedPath1 = if (normalize) normalize(path1) else path1
            val normalizedPath2 = if (normalize) normalize(path2) else path2
            return normalizedPath1.equals(normalizedPath2, ignoreCase = ignoreCase)
        }
    }
}