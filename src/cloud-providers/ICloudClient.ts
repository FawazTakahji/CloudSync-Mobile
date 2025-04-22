import { StorageMode } from "@/enums";
import { SaveInfo } from "@/utils/saves";

export interface ICloudClient {
    isSignedIn: boolean;
    getSaves(): Promise<{ saves: SaveInfo[], loadFailed: boolean }>;
    deleteSave(saveName: string): Promise<void>;
    uploadSave(storageMode: StorageMode, saveName: string): Promise<void>;
    downloadSave(storageMode: StorageMode, saveName: string, path: string): Promise<void>;
    backupSave(saveName: string): Promise<void>;
    purgeBackups(backupsToKeep: number): Promise<void>;
}