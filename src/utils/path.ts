const replace: [RegExp, string][] = [
    [/\\+/g, '/'],
    [/\/{2,}/g, '/'],
    [/(\w+)\/\.\.\/?/g, ''],
    [/^\.\//, ''],
    [/\/\.\//, '/'],
    [/\/\.$/, ''],
    [/\/$/, '']
]

export function pathEqual(a: string, b: string): boolean {
    return a === b || normalizePath(a) === normalizePath(b);
}

export function normalizePath(path: string): string {
    replace.forEach(r => {
        while (r[0].test(path)) {
            path = path.replace(r[0], r[1]);
        }
    });

    return path;
}