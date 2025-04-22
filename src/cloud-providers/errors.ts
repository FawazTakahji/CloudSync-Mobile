export class SaveDoesntExistError extends Error {
    constructor(message?: string) {
        super(message);
    }
}