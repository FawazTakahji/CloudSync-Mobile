import * as storage from "@/utils/storage";
import { StorageMode } from "@/enums";
import { DirectoryDoesntExistError } from "@/utils/storage/errors";
import AndroidUtils from "@/modules/android-utils";
import { Paths } from "expo-file-system/next";
import { XMLParser } from "fast-xml-parser";
import { alternatives, arrayOf, int, object as checkObject, string, ValidationError, Validator } from "checkeasy";
import log from "@/utils/logger";
import { equalsCaseInsensitive } from "@/utils/misc";

let savesPath: string | null = null;

export function getSavesPath(): string {
    if (savesPath !== null) {
        return savesPath;
    }

    const primaryStoragePath = AndroidUtils.getPrimaryStoragePath();
    savesPath = Paths.join(primaryStoragePath, "Android", "data", "com.chucklefish.stardewvalley", "files", "Saves");
    return savesPath;
}

export function getLocalSaves(storageMode: StorageMode, savesPath: string | null): { saves: SaveInfo[], loadFailed: boolean } {
    const path = savesPath || getSavesPath();
    let subDirs: string[];

    try {
        subDirs = storage.getSubdirectoryNames(path, storageMode);
    } catch (e) {
        if (e instanceof DirectoryDoesntExistError) {
            return {
                saves: [],
                loadFailed: false
            }
        }

        throw e;
    }

    const parser = new XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        isArray: tagName => tagName === "item"
    });
    const saves: SaveInfo[] = [];

    let loadFailed: boolean = false;

    for (const subDir of subDirs) {
        if (equalsCaseInsensitive(subDir, "cstemp")) {
            continue;
        }

        try {
            const info = getSaveInfo(path, subDir, storageMode, parser);
            saves.push(info);
        } catch (e) {
            loadFailed = true;
            log.warn(`An error occurred while loading save info from \"${subDir}\":`, e);
        }
    }

    return {
        saves,
        loadFailed
    };
}

export function getSaveInfo(savesPath: string | null, saveName: string, storageMode: StorageMode, xmlParser?: XMLParser): SaveInfo {
    const path = savesPath || getSavesPath();
    const infoPath = Paths.join(path, saveName, "SaveGameInfo");
    const text = storage.getFileText(infoPath, storageMode);

    const parser = xmlParser || new XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        isArray: tagName => tagName === "item"
    });

    const obj = parser.parse(text);
    if (!isSaveGameInfo(obj)) {
        throw new Error("object is not a valid SaveGameInfo");
    }

    const farmerName = typeof obj.Farmer.name === "number" ? obj.Farmer.name.toString() : obj.Farmer.name;
    const farmName = typeof obj.Farmer.farmName === "number" ? obj.Farmer.farmName.toString() : obj.Farmer.farmName;

    return {
        folderName: saveName,
        farmerName: farmerName,
        farmName: farmName,
        daysPlayed: obj.Farmer.stats.Values.item.find(item => item.key.string === "daysPlayed")?.value.unsignedInt || 0
    };
}

function isSaveGameInfo(obj: any): obj is SaveGameInfo {
    try {
        saveGameInfoValidator(obj, "obj");
        return true;
    } catch (e) {
        if (e instanceof ValidationError) {
            return false;
        }

        throw e;
    }
}

export function isSaveInfo(obj: any): obj is SaveInfo {
    try {
        saveInfoValidator(obj, "obj");
        return true;
    } catch (e) {
        if (e instanceof ValidationError) {
            return false;
        }

        throw e;
    }
}

export function isExcludedName(fileName: string, saveName: string) {
    return equalsCaseInsensitive(fileName, "BACKUP_SAVE")
        || equalsCaseInsensitive(fileName, "SaveGameInfo_old")
        || equalsCaseInsensitive(fileName, `${saveName}_old`)
        || equalsCaseInsensitive(fileName, `${saveName}_SVBAK`);
}

export interface SaveInfo {
    folderName: string;
    farmerName: string;
    farmName: string;
    daysPlayed: number;
}

interface SaveGameInfo {
    Farmer: {
        farmName: string | number;
        name: string | number;
        stats: {
            Values: {
                item: {
                    key: {
                        string: string;
                    };
                    value: {
                        unsignedInt: number;
                    };
                }[];
            };
        };
    }
}

const saveGameInfoValidator = object({
    Farmer: object({
        farmName: alternatives([
            string(),
            int()
        ]),
        name: alternatives([
            string(),
            int()
        ]),
        stats: object({
            Values: object({
                item: arrayOf(object({
                    key: object({
                        string: string()
                    }),
                    value: object({
                        unsignedInt: int()
                    })
                }))
            })
        })
    })
});

const saveInfoValidator = object({
    folderName: string(),
    farmerName: string(),
    farmName: string(),
    daysPlayed: int()
});

function object<Description extends Record<string, Validator<any>>>(desc: Description):
    Validator<{ [key in keyof Description]: Description[key] extends Validator<infer T> ? T : never; }> {
    return checkObject(desc, { ignoreUnknown: true });
}