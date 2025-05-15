import { StorageMode } from "@/enums";
import { SaveInfo } from "@/utils/saves";
import { ICloudClient } from "../ICloudClient";

export class GoogleDriveClient implements ICloudClient {
    public isSignedIn: boolean;

    constructor(clientId: string, refreshToken: string) {
        this.isSignedIn = !!clientId && !!refreshToken;
    }

    async getSaves(): Promise<{ saves: SaveInfo[], loadFailed: boolean }> {
        throw new Error("Method not implemented.");
    }

    async deleteSave(saveName: string) {
        throw new Error("Method not implemented.");
    }

    async uploadSave(storageMode: StorageMode, savesPath: string | null, saveName: string) {
        throw new Error("Method not implemented.");
    }

    async downloadSave(storageMode: StorageMode, saveName: string, path: string) {
        throw new Error("Method not implemented.");
    }
    
    async backupSave(saveName: string) {
        throw new Error("Method not implemented.");
    }

    async purgeBackups(backupsToKeep: number) {
        throw new Error("Method not implemented.");
    }
}