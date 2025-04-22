import * as Constants from "@/constants";
import { Alert, ToastAndroid } from "react-native";
import { reloadAppAsync } from "expo";
import { exportLogs, LogsDontExistError } from "@/utils/logger";
import { Router } from "expo-router";
import { StorageMode, CloudProvider, Theme } from "@/enums";
import { DateTime } from "luxon";
import { SaveInfo } from "@/utils/saves";

export function parseEnum<E, K extends string>(enumDef: { [key in K]: E }, str: string | undefined | null): E | undefined {
    if (str && str in enumDef) {
        return enumDef[str as K] as E;
    }
    return undefined;
}

export function dateCompare(a: DateTime, b: DateTime): 1 | -1 | 0 {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function isStorageModeAllowed(storageMode: StorageMode) {
    return Constants.allowedStorageModes.includes(storageMode);
}

export function exceptionHandler(error: Error, isFatal: boolean) {
    Alert.alert("Unhandled Error", error.message, [
        {
            text: "Restart",
            style: "cancel",
            onPress: async () => {
                await reloadAppAsync();
            }
        },
        {
            text: "Export Logs",
            isPreferred: true,
            onPress: async () => {
                try {
                    await exportLogs();
                } catch (e) {
                    if (e instanceof LogsDontExistError) {
                        ToastAndroid.show("The logs file doesn't exist or is empty.", ToastAndroid.SHORT);
                    } else {
                        ToastAndroid.show("An error occurred while exporting logs.", ToastAndroid.SHORT);
                    }
                }
                await reloadAppAsync();
            }
        },
    ]);
}

export function filterSaves(saves: SaveInfo[], searchText: string): SaveInfo[] | null {
    const lower = searchText.toLowerCase();
    return saves.filter(save => save.farmName.toLowerCase().includes(lower) || save.farmerName.toLowerCase().includes(lower));
}

export function startsWithCaseInsensitive(a: string, b: string): boolean {
    return a.toLowerCase().startsWith(b.toLowerCase());
}

export function equalsCaseInsensitive(a: string, b: string): boolean {
    return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

export function getThemeName(theme: Theme): string {
    switch (theme) {
        case Theme.Auto:
            return "Auto";
        case Theme.Light:
            return "Light";
        case Theme.Dark:
            return "Dark";
    }
}

export function getThemeIcon(theme: Theme): string {
    switch (theme) {
        case Theme.Auto:
            return "theme-light-dark";
        case Theme.Light:
            return "weather-sunny";
        case Theme.Dark:
            return "weather-night";
    }
}

export function getStorageModeName(storageMode: StorageMode): string {
    switch (storageMode) {
        case StorageMode.Legacy:
            return "Legacy";
        case StorageMode.Saf:
            return "SAF";
        case StorageMode.Shizuku:
            return "Shizuku";
    }
}

export function getProviderName(provider: CloudProvider): string {
    switch (provider) {
        case CloudProvider.Dropbox:
            return "Dropbox";
    }
}

export function getProviderIcon(provider: CloudProvider): string {
    switch (provider) {
        case CloudProvider.Dropbox:
            return "dropbox";
    }
}

export function goToProviderSettings(router: Router, provider: CloudProvider) {
    switch (provider) {
        case CloudProvider.Dropbox:
            router.push("/settings/cloud-provider/dropbox");
            break;
    }
}