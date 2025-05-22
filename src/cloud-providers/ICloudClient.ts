import { StorageMode } from "@/enums";
import { SaveInfo } from "@/utils/saves";
import { DateTime } from "luxon";

export interface ICloudClient {
    isSignedIn: boolean;
    getSaves(): Promise<{ saves: SaveInfo[], loadFailed: boolean }>;
    deleteSave(saveName: string): Promise<void>;
    uploadSave(storageMode: StorageMode, savesPath: string | null, saveName: string): Promise<void>;
    downloadSave(storageMode: StorageMode, saveName: string, path: string): Promise<void>;
    getBackups(): Promise<BackupInfo[]>;
    deleteBackup(folderName: string): Promise<void>;
    backupSave(saveName: string): Promise<void>;
    downloadBackup(storageMode: StorageMode, folderName: string, path: string): Promise<void>;
    purgeBackups(backupsToKeep: number): Promise<void>;
}

export interface BackupInfo {
    folderName: string;
    cloudFolderName: string;
    date: DateTime;
}