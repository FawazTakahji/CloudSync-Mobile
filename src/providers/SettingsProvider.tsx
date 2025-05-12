import React from "react";
import * as SecureStore from 'expo-secure-store';
import { equalsCaseInsensitive, isStorageModeAllowed, parseEnum, startsWithCaseInsensitive } from "@/utils/misc";
import AndroidUtils from "@/modules/android-utils";
import { CloudProvider, StorageMode, Theme } from "@/enums";
import log from "@/utils/logger";
import { Paths } from "expo-file-system/next";
import { normalizePath } from "@/utils/path";

interface Context {
    loaded: boolean;
    theme: Theme;
    storageMode: StorageMode;
    savesPath: string | null;
    inAndroidFolder: boolean;
    cloudProvider: CloudProvider;
    backupSaves: boolean;
    purgeBackups: boolean;
    backupsToKeep: number;
    checkUpdates: boolean;
    setTheme: (theme: Theme) => void;
    setStorageMode: (storageMode: StorageMode) => void;
    setSavesPath: (savesPath: string | null) => void;
    setCloudProvider: (cloudProvider: CloudProvider) => void;
    setBackupSaves: (backupSaves: boolean) => void;
    setPurgeBackups: (purgeBackups: boolean) => void;
    setBackupsToKeep: (backupsToKeep: number) => void;
    setCheckUpdates: (checkUpdates: boolean) => void;
}

export const SettingsContext = React.createContext<Context>({
    loaded: false,
    theme: Theme.Auto,
    storageMode: getBestStorageMode(),
    savesPath: null,
    inAndroidFolder: true,
    cloudProvider: CloudProvider.Dropbox,
    backupSaves: true,
    purgeBackups: true,
    backupsToKeep: 2,
    checkUpdates: true,
    setTheme: () => {},
    setStorageMode: () => {},
    setSavesPath: () => {},
    setCloudProvider: () => {},
    setBackupSaves: () => {},
    setPurgeBackups: () => {},
    setBackupsToKeep: () => {},
    setCheckUpdates: () => {}
});

export default function SettingsProvider(props: { children: React.ReactNode }) {
    const [loaded, setLoaded] = React.useState<boolean>(false);
    const [theme, setThemeInternal] = React.useState<Theme>(Theme.Auto);
    const [storageMode, setStorageModeInternal] = React.useState<StorageMode>(getBestStorageMode());
    const [savesPath, setSavesPathInternal] = React.useState<string | null>(null);
    const [inAndroidFolder, setInAndroidFolderInternal] = React.useState<boolean>(false);
    const [cloudProvider, setCloudProviderInternal] = React.useState<CloudProvider>(CloudProvider.Dropbox);
    const [backupSaves, setBackupSavesInternal] = React.useState<boolean>(true);
    const [purgeBackups, setPurgeBackupsInternal] = React.useState<boolean>(true);
    const [backupsToKeep, setBackupsToKeepInternal] = React.useState<number>(2);
    const [checkUpdates, setCheckUpdatesInternal] = React.useState<boolean>(true);

    React.useEffect(loadSettings, []);
    React.useEffect(() => {
        if (savesPath === null) {
            setInAndroidFolderInternal(true);
            return;
        }

        try {
            const primary = AndroidUtils.getPrimaryStoragePath()
            const android = normalizePath(Paths.join(primary, "Android"));
            const startsWithAndroid = startsWithCaseInsensitive(savesPath, android);
            const inAndroidFolder = startsWithAndroid && (savesPath.length === android.length || savesPath[android.length] === '/');
            setInAndroidFolderInternal(inAndroidFolder);
        } catch (e) {
            log.error("An error occurred while getting the primary storage path:", e);
            setInAndroidFolderInternal(false);
        }
    }, [savesPath]);

    return (
        <SettingsContext.Provider value={{
            loaded: loaded,
            theme: theme,
            storageMode: storageMode,
            savesPath: savesPath,
            inAndroidFolder: inAndroidFolder,
            cloudProvider: cloudProvider,
            backupSaves: backupSaves,
            purgeBackups: purgeBackups,
            backupsToKeep: backupsToKeep,
            checkUpdates: checkUpdates,
            setTheme: setTheme,
            setStorageMode: setStorageMode,
            setSavesPath: setSavesPath,
            setCloudProvider: setCloudProvider,
            setBackupSaves: setBackupSaves,
            setPurgeBackups: setPurgeBackups,
            setBackupsToKeep: setBackupsToKeep,
            setCheckUpdates: setCheckUpdates,
        }}>
            {props.children}
        </SettingsContext.Provider>
    );

    function setTheme(theme: Theme) {
        SecureStore.setItem(keys.theme, theme.toString());
        setThemeInternal(theme);
    }

    function setStorageMode(storageMode: StorageMode) {
        SecureStore.setItem(keys.storageMode, storageMode.toString());
        setStorageModeInternal(storageMode);
    }

    function setSavesPath(savesPath: string | null) {
        SecureStore.setItem(keys.savesPath, savesPath ?? "null");
        setSavesPathInternal(savesPath);
    }

    function setCloudProvider(cloudProvider: CloudProvider) {
        SecureStore.setItem(keys.cloudProvider, cloudProvider.toString());
        setCloudProviderInternal(cloudProvider);
    }

    function setBackupSaves(backupSaves: boolean) {
        SecureStore.setItem(keys.backupSaves, backupSaves.toString());
        setBackupSavesInternal(backupSaves);
    }

    function setPurgeBackups(purgeBackups: boolean) {
        SecureStore.setItem(keys.purgeBackups, purgeBackups.toString());
        setPurgeBackupsInternal(purgeBackups);
    }

    function setBackupsToKeep(backupsToKeep: number) {
        SecureStore.setItem(keys.backupsToKeep, backupsToKeep.toString());
        setBackupsToKeepInternal(backupsToKeep);
    }

    function setCheckUpdates(checkUpdates: boolean) {
        SecureStore.setItem(keys.checkUpdates, checkUpdates.toString());
        setCheckUpdatesInternal(checkUpdates);
    }

    function loadSettings() {
        try {
            const themeStr = SecureStore.getItem(keys.theme);
            if (themeStr) {
                const parsedTheme = parseEnum(Theme, themeStr);
                if (parsedTheme) {
                    setThemeInternal(parsedTheme);
                } else {
                    log.warn(`Couldn't parse the theme setting, "${themeStr}"`);
                }
            }
        } catch (e) {
            log.error("An error occurred while loading the theme setting:", e);
        }

        try {
            const storageModeStr = SecureStore.getItem(keys.storageMode);
            if (storageModeStr) {
                const parsedStorageMode = parseEnum(StorageMode, storageModeStr);
                if (parsedStorageMode && isStorageModeAllowed(parsedStorageMode)) {
                    setStorageModeInternal(parsedStorageMode);
                } else {
                    log.warn(`Couldn't parse the storage mode setting, or the mode is not allowed, "${storageModeStr}"`);
                }
            }
        } catch (e) {
            log.error("An error occurred while loading the storage mode setting:", e);
        }

        try {
            const savesPathStr = SecureStore.getItem(keys.savesPath);
            if (savesPathStr !== "null") {
                setSavesPathInternal(savesPathStr);
            }
        } catch (e) {
            log.error("An error occurred while loading the saves path setting:", e);
        }

        try {
            const cloudProviderStr = SecureStore.getItem(keys.cloudProvider);
            if (cloudProviderStr) {
                const parsedCloudProvider = parseEnum(CloudProvider, cloudProviderStr);
                if (parsedCloudProvider) {
                    setCloudProviderInternal(parsedCloudProvider);
                } else {
                    log.warn(`Couldn't parse the cloud provider setting, "${cloudProviderStr}"`);
                }
            }
        } catch (e) {
            log.error("An error occurred while loading the cloud provider setting:", e);
        }

        try {
            const backupSavesStr = SecureStore.getItem(keys.backupSaves);
            if (backupSavesStr && equalsCaseInsensitive(backupSavesStr, "false")) {
                setBackupSavesInternal(false);
            }
        } catch (e) {
            log.error("An error occurred while loading the backup saves setting:", e);
        }

        try {
            const purgeBackupsStr = SecureStore.getItem(keys.purgeBackups);
            if (purgeBackupsStr && equalsCaseInsensitive(purgeBackupsStr, "false")) {
                setPurgeBackupsInternal(false);
            }
        } catch (e) {
            log.error("An error occurred while loading the purge backups setting:", e);
        }

        try {
            const backupsToKeepStr = SecureStore.getItem(keys.backupsToKeep);
            if (backupsToKeepStr) {
                const parsedBackupsToKeep = parseInt(backupsToKeepStr);
                if (parsedBackupsToKeep) {
                    setBackupsToKeepInternal(parsedBackupsToKeep);
                } else {
                    log.warn(`Couldn't parse the backups to keep setting, "${backupsToKeepStr}"`);
                }
            }
        } catch (e) {
            log.error("An error occurred while loading the backups to keep setting:", e);
        }

        try {
            const checkUpdatesStr = SecureStore.getItem(keys.checkUpdates);
            if (checkUpdatesStr && equalsCaseInsensitive(checkUpdatesStr, "false")) {
                setCheckUpdatesInternal(false);
            }
        } catch (e) {
            log.error("An error occurred while loading the check updates setting:", e);
        }

        setLoaded(true);
    }
}

function getBestStorageMode(): StorageMode {
    if (AndroidUtils.sdkVersion <= 29) {
        return StorageMode.Legacy;
    } else if (AndroidUtils.sdkVersion <= 32) {
        return StorageMode.Saf;
    } else {
        return StorageMode.Shizuku;
    }
}

const keys = {
    theme: "app.theme",
    storageMode: "app.storageMode",
    savesPath: "app.savesPath",
    cloudProvider: "app.cloudProvider",
    backupSaves: "app.backupSaves",
    purgeBackups: "app.purgeBackups",
    backupsToKeep: "app.backupsToKeep",
    checkUpdates: "app.checkUpdates"
}