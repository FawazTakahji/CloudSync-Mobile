export async function blobToBase64(blob: Blob): Promise<string | null> {
    try {
        let reader = new FileReader();
        reader.readAsDataURL(blob);
        return new Promise<string | null>(resolve => {
            reader.onloadend = function () {
                const type = typeof reader.result;
                resolve(type === "string" ? (reader.result as string).split(",")[1] : null);
            };
        });
    } catch (e) {
        if (e instanceof TypeError) {
            return null;
        }

        throw e;
    }
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array | null> {
    try {
        let reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        return new Promise<Uint8Array | null>(resolve => {
            reader.onloadend = function () {
                const type = typeof reader.result;
                resolve(type === "object" ? new Uint8Array(reader.result as ArrayBuffer) : null);
            };
        });
    } catch (e) {
        if (e instanceof TypeError) {
            return null;
        }

        throw e;
    }
}

export async function blobToString(blob: Blob): Promise<string | null> {
    try {
        let reader = new FileReader();
        reader.readAsText(blob, "utf-8");
        return new Promise<string | null>(resolve => {
            reader.onloadend = function () {
                const type = typeof reader.result;
                resolve(type === "string" ? reader.result as string : null);
            };
        });
    } catch (e) {
        if (e instanceof TypeError) {
            return null;
        }

        throw e;
    }
}