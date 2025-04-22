export function redirectSystemPath({ path, initial }: { path: string | null, initial: boolean }): string | null {
    // prevent expo router from trying to navigate when authenticating.
    if (path && path.startsWith("auth.svcloudsync://")) {
        return null;
    }

    return path;
}