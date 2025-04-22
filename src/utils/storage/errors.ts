export class DirectoryDoesntExistError extends Error {
    constructor(message?: string) {
        super(message);
    }
}

export class FileDoesntExistError extends Error {
    constructor(message?: string) {
        super(message);
    }
}

export class PathDoesntExistError extends Error {
    constructor(message?: string) {
        super(message);
    }
}