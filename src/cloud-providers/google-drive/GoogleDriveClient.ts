import { StorageMode } from "@/enums";
import { getSaveInfo, getSavesPath, isExcludedName, isSaveInfo, SaveInfo } from "@/utils/saves";
import { BackupInfo, ICloudClient } from "../ICloudClient";
import { DateTime } from "luxon";
import { FetchResponseError, GDrive, MIME_TYPES } from "@robinbobin/react-native-google-drive-api-wrapper";
import { AttemptContext, PartialAttemptOptions, retry } from "@lifeomic/attempt";
import pLimit from "p-limit";
import {
    IFileOutput,
    IFilesListResultType
} from "@robinbobin/react-native-google-drive-api-wrapper/src/api/files/types";
import log from "@/utils/logger";
import { dateCompare, equalsCaseInsensitive } from "@/utils/misc";
import groupBy from "lodash/groupBy";
import { withResolvers } from "radashi/dist/radashi";
import { Paths } from "expo-file-system/next";
import { TBlobToByteArrayResultType } from "@robinbobin/react-native-google-drive-api-wrapper/src/aux/Fetcher/types";
import * as storage from "@/utils/storage";

interface Auth {
    accessToken: string;
    expiration: DateTime
}

interface Folders {
    cloudSyncId: string;
    savesId: string;
    backupsId: string;
}

const dateTimeFormat = "yyyy-MM-dd'T'HH.mm.ssZZZ";
const backupRegex = /^(.+_\d+)_\[\d{4}-\d{2}-\d{2}T\d{2}\.\d{2}\.\d{2}\+\d{4}]$/;

export class GoogleDriveClient implements ICloudClient {
    private readonly retryGeneralAttemptOptions: PartialAttemptOptions<any> = {
        maxAttempts: 3,
        delay: 1000,
        factor: 4,
        handleError: (err, context) => this.retryGeneralErrorHandler(err, context)
    };
    private readonly rateLimit = pLimit(200);

    public isSignedIn: boolean;
    private readonly clientId: string;
    private readonly refreshToken: string;

    private auth: Auth | null = null;
    private drive: GDrive | null = null;
    private cloudSyncId: string | null = null;
    private savesId: string | null = null;
    private backupsId: string | null = null;

    private authPromise: Promise<Auth | null> | null = null;
    private foldersPromise: Promise<Folders | null> | null = null;

    constructor(clientId: string, refreshToken: string) {
        this.isSignedIn = !!clientId && !!refreshToken;
        this.clientId = clientId;
        this.refreshToken = refreshToken;
    }

    private async retryGeneralErrorHandler(err: any, context: AttemptContext) {
        try {
            if (!(err instanceof FetchResponseError)
                || !(err.response.status === 403 || err.response.status === 429)) {
                context.abort();
                return;
            }

            const text = await err.response.text();
            if (!(text.includes("rateLimitExceeded") || text.includes("userRateLimitExceeded"))) {
                context.abort();
            }
        } catch (e) {
            log.error("An error occurred while handling a general error:", e);
            context.abort();
        }
    }

    private async getAuth(): Promise<Auth> {
        if (!this.clientId || !this.refreshToken) {
            throw new Error("Client ID or Refresh Token is not set.");
        }

        if (this.auth && this.auth.expiration.diffNow('minutes').minutes > 5) {
            return this.auth;
        }

        while (this.authPromise) {
            const auth = await this.authPromise;
            if (auth) {
                return auth;
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        }

        let tempAuth: Auth | null = null;
        const { promise, resolve } = withResolvers<Auth | null>();
        this.authPromise = promise;

        try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: `client_id=${encodeURIComponent(this.clientId)}&refresh_token=${encodeURIComponent(this.refreshToken)}&grant_type=refresh_token`
            });

            if (!response.ok) {
                throw new Error("Failed to get the access token: " + await response.text());
            }

            const json = await response.json();
            if (!json.access_token) {
                throw new Error("The response doesn't contain an access token.");
            }
            if (!json.expires_in) {
                throw new Error("The response doesn't contain an expiration time.");
            }

            this.auth = {
                accessToken: json.access_token,
                expiration: DateTime.now().plus({ seconds: json.expires_in })
            };
            tempAuth = this.auth;
            return this.auth;
        } finally {
            resolve(tempAuth);
            this.authPromise = null;
        }
    }

    private async getDrive(): Promise<GDrive> {
        const auth = await this.getAuth();

        if (!this.drive) {
            this.drive = new GDrive();
            this.drive.accessToken = auth.accessToken;
            this.drive.fetchTimeout = -1;
            return this.drive;
        }

        if (this.drive.accessToken !== auth.accessToken) {
            this.drive.accessToken = auth.accessToken;
        }

        return this.drive;
    }

    private async getFolders(drive: GDrive): Promise<Folders> {
        if (this.cloudSyncId && this.savesId && this.backupsId) {
            return {
                cloudSyncId: this.cloudSyncId,
                savesId: this.savesId,
                backupsId: this.backupsId
            };
        }

        while (this.foldersPromise) {
            const folders = await this.foldersPromise;
            if (folders) {
                return folders;
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        }

        const { promise, resolve } = withResolvers<Folders | null>();
        this.foldersPromise = promise;

        try {
            const files: IFilesListResultType = await retry(() =>
                this.rateLimit(() =>
                    drive.files.list({
                        q: `name='CloudSync' and mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and 'root' in parents and trashed=false`,
                    })), this.retryGeneralAttemptOptions);

            let cloudSyncId: string | undefined = files.files.find(file => file.name === "CloudSync")?.id;
            if (!cloudSyncId) {
                const cloudSyncFolder: IFileOutput = await retry(() =>
                    this.rateLimit(() =>
                        drive.files.newMetadataOnlyUploader()
                            .setRequestBody({
                                name: "CloudSync",
                                mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                                parents: ["root"]
                            })
                            .execute()), this.retryGeneralAttemptOptions);

                this.cloudSyncId = cloudSyncFolder.id;
                await this.createSubfolders(drive, cloudSyncFolder.id);
                if (!this.savesId || !this.backupsId) {
                    throw new Error("Failed to create subfolders.");
                }

                return {
                    cloudSyncId: this.cloudSyncId,
                    savesId: this.savesId,
                    backupsId: this.backupsId
                };
            }

            this.cloudSyncId = cloudSyncId;
            const csChildren: IFilesListResultType = await retry(() =>
                this.rateLimit(() =>
                    drive.files.list({
                        q: `mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${cloudSyncId}' in parents and trashed=false`,
                    })), this.retryGeneralAttemptOptions);

            const savesId = csChildren.files.find(file => file.name === "Saves")?.id;
            const backupsId = csChildren.files.find(file => file.name === "Backups")?.id;

            this.savesId = savesId ? savesId : null;
            this.backupsId = backupsId ? backupsId : null;
            await this.createSubfolders(drive, cloudSyncId, !this.savesId, !this.backupsId);
            if (!this.savesId || !this.backupsId) {
                throw new Error("Failed to create subfolders.");
            }

            return {
                cloudSyncId: this.cloudSyncId,
                savesId: this.savesId,
                backupsId: this.backupsId
            };
        } finally {
            if (this.cloudSyncId && this.savesId && this.backupsId) {
                resolve({
                    cloudSyncId: this.cloudSyncId,
                    savesId: this.savesId,
                    backupsId: this.backupsId
                });
            } else{
                resolve(null);
            }

            this.foldersPromise = null;
        }
    }

    private async createSubfolders(drive: GDrive, id: string, saves: boolean = true, backups: boolean = true) {
        let failed = false;
        const promises = [];

        if (saves) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    const file = await retry(() =>
                        this.rateLimit(() =>
                            drive.files.newMetadataOnlyUploader()
                                .setRequestBody({
                                    name: "Saves",
                                    mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                                    parents: [id]
                                })
                                .execute()), this.retryGeneralAttemptOptions);

                    this.savesId = file.id;
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        if (backups) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    const file = await retry(() =>
                        this.rateLimit(() =>
                            drive.files.newMetadataOnlyUploader()
                                .setRequestBody({
                                    name: "Backups",
                                    mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                                    parents: [id]
                                })
                                .execute()), this.retryGeneralAttemptOptions);

                    this.backupsId = file.id;
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to create subfolders: ${errors.toString()}`) : errors[0];
        }
    }

    async getSaves(): Promise<{ saves: SaveInfo[], loadFailed: boolean }> {
        const drive = await this.getDrive();
        const { savesId } = await this.getFolders(drive);

        const files = await this.listAllFiles(drive,
            `mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${savesId}' in parents and trashed = false`,
            "name, description");

        let loadFailed: boolean = false;
        const saves: SaveInfo[] = [];

        for (const file of files) {
            try {
                if (!file.description) {
                    loadFailed = true;
                    log.warn(`Save folder \"${file.name}\" is missing a description.`);
                    continue;
                }

                const info = JSON.parse(file.description);
                if (!isSaveInfo(info)) {
                    loadFailed = true;
                    log.warn(`Description for save folder \"${file.name}\" is not a valid SaveInfo.`);
                    continue;
                }

                saves.push(info);
            } catch (e) {
                loadFailed = true;
                log.warn(`Failed to parse save info for \"${file.name}\":`, e);
            }
        }

        return {
            saves,
            loadFailed
        };
    }

    async deleteSave(saveName: string) {
        const drive = await this.getDrive();
        const { savesId } = await this.getFolders(drive);

        const files = await this.listAllFiles(drive,
            `name='${saveName}' and mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${savesId}' in parents and trashed = false`,
            "id");

        if (files.length < 1) {
            log.warn(`Couldn't find the save \"${saveName}\".`);
            return;
        }

        let failed: boolean = false;
        const promises = files.map(async file => {
            if (failed) {
                return;
            }

            try {
                await retry(() =>
                    this.rateLimit(() =>
                        drive.files.delete(file.id)), this.retryGeneralAttemptOptions);
            } catch (e) {
                failed = true;
                throw e;
            }
        });

        const results = await Promise.allSettled(promises);
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to delete save: ${errors.toString()}`) : errors[0];
        }
    }

    async uploadSave(storageMode: StorageMode, savesPath: string | null, saveName: string) {
        const path = savesPath || getSavesPath();
        const info = getSaveInfo(path, saveName, storageMode);
        const json = JSON.stringify(info);

        const drive = await this.getDrive();
        const { savesId } = await this.getFolders(drive);

        await this.uploadDirectory(storageMode, drive, Paths.join(path, saveName), savesId, json, saveName, true);
    }

    async downloadSave(storageMode: StorageMode, saveName: string, path: string) {
        const drive = await this.getDrive();
        const { savesId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            "trashed = false",
            "id, name, mimeType, parents");

        const saveFolder = allFiles.find(file => equalsCaseInsensitive(file.name, saveName)
            && file.mimeType === MIME_TYPES.application.vndGoogleAppsFolder
            && file.parents?.includes(savesId));

        if (!saveFolder) {
            throw new Error(`Couldn't find the save \"${saveName}\".`);
        }

        await this.downloadDirectory(storageMode, drive, allFiles, saveFolder.id, path);
    }

    async getBackups(): Promise<BackupInfo[]> {
        const drive = await this.getDrive();
        const { backupsId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            `mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${backupsId}' in parents and trashed = false`,
            "name, description");
        const backups: BackupInfo[] = [];
        for (const file of allFiles) {
            const match = file.name.match(backupRegex);
            if (!match)
            {
                log.warn(`Failed to parse backup name \"${file.name}\".`);
                continue;
            }
            if (!file.description) {
                log.warn(`Backup folder \"${file.name}\" is missing a description.`);
                continue;
            }

            const date = DateTime.fromFormat(file.description, dateTimeFormat);
            backups.push({
                folderName: match[1],
                cloudFolderName: file.name,
                date
            });
        }

        return backups;
    }

    async deleteBackup(folderName: string) {
        const drive = await this.getDrive();
        const { backupsId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            `name='${folderName}' and mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${backupsId}' in parents and trashed = false`);

        if (allFiles.length < 1) {
            throw new Error(`Couldn't find the backup \"${folderName}\".`);
        }

        let failed = false;
        const promises = [];
        for (const file of allFiles) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await retry(() =>
                        this.rateLimit(() =>
                            drive.files.delete(file.id)), this.retryGeneralAttemptOptions);
                }  catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to delete backup: ${errors.toString()}`) : errors[0];
        }
    }

    async backupSave(saveName: string) {
        const drive = await this.getDrive()
        const { savesId, backupsId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            `trashed = false`,
            "id, name, mimeType, parents");

        const saveFolder = allFiles.find(file => equalsCaseInsensitive(file.name, saveName)
            && file.mimeType === MIME_TYPES.application.vndGoogleAppsFolder
            && file.parents?.includes(savesId));

        if (!saveFolder) {
            log.warn(`Failed to find the folder for save \"${saveName}\".`);
            return;
        }

        const dateTime = DateTime.now().toFormat(dateTimeFormat);
        const destination: IFileOutput = await retry(() =>
            this.rateLimit(() =>
                drive.files.newMetadataOnlyUploader()
                    .setRequestBody({
                        name: `${saveFolder.name}_[${dateTime}]`,
                        mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                        parents: [backupsId],
                        description: dateTime
                    })
                    .execute()), this.retryGeneralAttemptOptions);

        const promises = [];
        let failed = false;

        const files = allFiles.filter(file => file.mimeType !== MIME_TYPES.application.vndGoogleAppsFolder && file.parents?.includes(saveFolder.id));
        for (const file of files) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await retry(() =>
                        this.rateLimit(() =>
                            drive.files.copy(file.id, {
                                requestBody: {
                                    name: file.name,
                                    parents: [destination.id]
                                }
                            })), this.retryGeneralAttemptOptions);
                } catch (e) {
                    throw e;
                }
            });
        }

        const folders = allFiles.filter(file => file.mimeType === MIME_TYPES.application.vndGoogleAppsFolder && file.parents?.includes(saveFolder.id));
        for (const folder of folders) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await this.copyFolder(drive, allFiles, folder, destination.id);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to copy files: ${errors.toString()}`) : errors[0];
        }
    }

    async downloadBackup(storageMode: StorageMode, folderName: string, path: string) {
        const drive = await this.getDrive();
        const { backupsId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            "trashed = false",
            "id, name, mimeType, parents");

        const backupFolder = allFiles.find(file => equalsCaseInsensitive(file.name, folderName)
            && file.mimeType === MIME_TYPES.application.vndGoogleAppsFolder
            && file.parents?.includes(backupsId));

        if (!backupFolder) {
            throw new Error(`Failed to find the folder for backup \"${folderName}\".`);
        }

        await this.downloadDirectory(storageMode, drive, allFiles, backupFolder.id, path);
    }

    async purgeBackups(backupsToKeep: number) {
        const drive = await this.getDrive();
        const { backupsId } = await this.getFolders(drive);

        const allFiles = await this.listAllFiles(drive,
            `mimeType='${MIME_TYPES.application.vndGoogleAppsFolder}' and '${backupsId}' in parents and trashed = false`,
            "name, id, description");

        const backups: { folderName: string, id: string, date: DateTime }[] = [];
        for (const file of allFiles) {
            const match = file.name.match(backupRegex);
            if (!match) {
                log.warn(`Failed to parse backup name \"${file.name}\".`);
                continue;
            }
            if (!file.description) {
                log.warn(`Backup folder \"${file.name}\" is missing a description.`);
                continue;
            }
            const date = DateTime.fromFormat(file.description, dateTimeFormat);

            backups.push({
                folderName: match[1],
                id: file.id,
                date
            });
        }

        const groups = groupBy(backups, backup => backup.folderName);
        const promises = [];
        for (const groupKey in groups) {
            const group = groups[groupKey];
            if (group.length <= backupsToKeep) {
                continue;
            }

            const backupsToDelete = group.sort((a, b) => {
                if (!a.date.isValid || !b.date.isValid) {
                    return 0;
                }
                return dateCompare(b.date, a.date);
            }).slice(backupsToKeep);

            for (const backup of backupsToDelete) {
                promises.push(async () => {
                    try {
                        await retry(() =>
                            this.rateLimit(() =>
                                drive.files.delete(backup.id)), this.retryGeneralAttemptOptions)
                    } catch (e) {
                        log.error(`Failed to delete backup \"${backup.folderName}\" with id \"${backup.id}\":`, e);
                    }
                });
            }
        }

        await Promise.allSettled(promises.map(promise => promise()));
    }

    private async listAllFiles(drive: GDrive, q: string, fields: string = "id, kind, mimeType, name"): Promise<IFileOutput[]> {
        const files: IFileOutput[] = [];
        let nextPageToken: string = "";

        do {
            const result = await retry(() =>
                this.rateLimit(() =>
                    drive.files.list({
                        q: q,
                        fields: `nextPageToken, files(${fields})`,
                        pageToken: nextPageToken
                    })), this.retryGeneralAttemptOptions);

            files.push(...result.files);
            nextPageToken = result.nextPageToken;
        } while (nextPageToken);

        return files;
    }

    private async uploadDirectory(storageMode: StorageMode, drive: GDrive, dir: string, parentId: string, description?: string, saveName?: string, root: boolean = false) {
        const files = storage.getFilePaths(dir, storageMode);
        const folders = storage.getSubdirectoryPaths(dir, storageMode);

        const parent: IFileOutput = await retry(() =>
            this.rateLimit(() =>
                drive.files.newMetadataOnlyUploader()
                    .setRequestBody({
                        name: Paths.basename(dir),
                        mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                        parents: [parentId],
                        description: description
                    })
                    .execute()), this.retryGeneralAttemptOptions);

        let failed = false;
        const promises = [];

        for (const file of files) {
            const name = Paths.basename(file);
            if (root && saveName && isExcludedName(name, saveName)) {
                continue;
            }

            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    const bytes = storage.getFileBytes(file, storageMode);

                    await retry(() =>
                        this.rateLimit(() =>
                            drive.files.newMultipartUploader()
                                .setData(bytes)
                                .setIsBase64(false)
                                .setRequestBody({
                                    name: name,
                                    parents: [parent.id],
                                    mimeType: MIME_TYPES.application.octetStream
                                })
                                .execute()), this.retryGeneralAttemptOptions);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        for (const folder of folders) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await this.uploadDirectory(storageMode, drive, folder, parent.id);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to upload directory: ${errors.toString()}`) : errors[0];
        }
    }

    private async downloadDirectory(storageMode: StorageMode, drive: GDrive, allFiles: IFileOutput[], parentId: string, dir: string) {
        let failed = false;
        const promises = [];

        const files = allFiles.filter(f => f.mimeType !== MIME_TYPES.application.vndGoogleAppsFolder && f.parents?.includes(parentId));
        for (const file of files) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    const data: TBlobToByteArrayResultType = await retry(() =>
                        this.rateLimit(() =>
                            drive.files.getBinary(file.id)), this.retryGeneralAttemptOptions);
                    if (!data) {
                        throw new Error(`Failed to get the binary data for file \"${file.name}\".`);
                    }

                    storage.writeFile(dir, file.name, data, storageMode);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const folders = allFiles.filter(f => f.mimeType === MIME_TYPES.application.vndGoogleAppsFolder && f.parents?.includes(parentId));
        for (const folder of folders) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await this.downloadDirectory(storageMode, drive, allFiles, folder.id, Paths.join(dir, folder.name));
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to download directory: ${errors.toString()}`) : errors[0];
        }
    }

    private async copyFolder(drive: GDrive, allFiles: IFileOutput[], source: IFileOutput, parentId: string) {
        const destination: IFileOutput = await retry(() =>
            this.rateLimit(() =>
                drive.files.newMetadataOnlyUploader()
                    .setRequestBody({
                        name: source.name,
                        mimeType: MIME_TYPES.application.vndGoogleAppsFolder,
                        parents: [parentId],
                    })
                    .execute()), this.retryGeneralAttemptOptions);

        const promises = [];
        let failed = false;

        const files = allFiles.filter(file => file.mimeType !== MIME_TYPES.application.vndGoogleAppsFolder && file.parents?.includes(source.id));
        for (const file of files) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await retry(() =>
                        this.rateLimit(() =>
                            drive.files.copy(file.id, {
                                requestBody: {
                                    name: file.name,
                                    parents: [destination.id]
                                }
                            })), this.retryGeneralAttemptOptions);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const folders = allFiles.filter(file => file.mimeType === MIME_TYPES.application.vndGoogleAppsFolder && file.parents?.includes(source.id));
        for (const folder of folders) {
            promises.push(async () => {
                if (failed) {
                    return;
                }

                try {
                    await this.copyFolder(drive, allFiles, folder, destination.id);
                } catch (e) {
                    failed = true;
                    throw e;
                }
            });
        }

        const results = await Promise.allSettled(promises.map(promise => promise()));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        if (errors.length > 0) {
            throw errors.length > 1 ? new AggregateError(errors, `Failed to copy foler: ${errors.toString()}`) : errors[0];
        }
    }
}