import { logger, consoleTransport, fileAsyncTransport } from "react-native-logs";
import * as FileSystem from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system";
import { File, Paths } from "expo-file-system/next";
import { InteractionManager } from "react-native";
import SafUtils from "@/modules/saf-utils";

const config = {
    transport: [
        consoleTransport,
        fileAsyncTransport
    ],
    transportOptions: {
        FS: FileSystem,
        filePath: FileSystem.documentDirectory,
        fileName: "logs.txt"
    },
    async: true,
    asyncFunc: InteractionManager.runAfterInteractions
}

// @ts-ignore
const log = logger.createLogger(config);
export default log;

export class LogsDontExistError extends Error {
    message: string = "The logs file doesn't exist.";
}

export function clearLogFile() {
    try {
        const filePath = Paths.join(Paths.document, "logs.txt");
        const file = new File(filePath);
        if (file.exists) {
            file.delete();
        }
    } catch (e) {
        console.log(e);
    }
}

export async function exportLogs() {
    const filePath = Paths.join(Paths.document, "logs.txt");
    const file = new File(filePath);
    if (!file.exists) {
        throw new LogsDontExistError();
    }

    const dir: string | null = await SafUtils.requestDirectoryTemporaryPermissions();
    if (!dir) {
        return;
    }

    const content = file.text();
    const newFile = await StorageAccessFramework.createFileAsync(dir, "logs.txt", "text/plain");
    await StorageAccessFramework.writeAsStringAsync(newFile, content);
}