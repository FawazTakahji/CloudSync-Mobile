import { SectionList, StyleSheet, ToastAndroid, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Divider, IconButton,
    List,
    Portal,
    Searchbar,
    Surface,
    Text,
    useTheme
} from "react-native-paper";
import React from "react";
import { useRouter } from "expo-router";
import { SettingsContext } from "@/providers/SettingsProvider";
import CloudContext from "@/cloud-providers/CloudContext";
import { BackupInfo } from "@/cloud-providers/ICloudClient";
import { getProviderName, goToProviderSettings } from "@/utils/misc";
import { DateTime } from "luxon";
import { ErrorDialog } from "@/components/ErrorDialog";
import log from "@/utils/logger";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { StorageMode } from "@/enums";
import * as legacy from "@/utils/storage/legacy";
import Shizuku from "@/modules/shizuku/src/ShizukuModule";
import * as saf from "@/utils/storage/saf";
import { getSavesPath } from "@/utils/saves";
import { Paths } from "expo-file-system/next";
import * as storage from "@/utils/storage";
import { useEvents } from "react-native-events-hooks";
import events from "@/events";
import { HighlightText } from "@/components/HighlightText";

interface ItemProps {
    folderName: string;
    cloudFolderName: string;
    date: DateTime;
}

export default function BackupsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { cloudProvider, storageMode, savesPath, backupsToKeep } = React.useContext(SettingsContext);
    const { cloudClient } = React.useContext(CloudContext);

    const [searchText, setSearchText] = React.useState<string>("");
    const [backups, setBackups] = React.useState<BackupInfo[] | null>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [isLoadingBackupsErrorVisible, setIsLoadingBackupsErrorVisible] = React.useState<boolean>(false);
    const [isPurging, setIsPurging] = React.useState<boolean>(false);
    const [isPurgingErrorVisible, setIsPurgingErrorVisible] = React.useState<boolean>(false);

    const [failedDeletes, setFailedDeletes] = React.useState<string[]>([]);
    const [failedDownloads, setFailedDownloads] = React.useState<string[]>([]);

    const sections = React.useMemo<{ title: string; data: BackupInfo[]; }[] | null>(() => {
        if (!backups) {
            return null;
        }

        const sections: { title: string; data: BackupInfo[]; }[] = [];
        if (searchText) {
            const searchTextLowerCase = searchText.toLowerCase();
            for (const backup of backups) {
                if (!backup.folderName.toLowerCase().includes(searchTextLowerCase)) {
                    continue;
                }

                const section = sections.find(s => s.title === backup.folderName);
                if (section) {
                    section.data.push(backup);
                } else {
                    sections.push({
                        title: backup.folderName,
                        data: [backup]
                    });
                }
            }
        } else {
            for (const backup of backups) {
                const section = sections.find(s => s.title === backup.folderName);
                if (section) {
                    section.data.push(backup);
                } else {
                    sections.push({
                        title: backup.folderName,
                        data: [backup]
                    });
                }
            }
        }

        return sections;
    }, [backups, searchText]);

    const { emit, listen, unlisten } = useEvents();

    React.useEffect(() => {
        refresh().catch(e => {
            log.error("An error occurred while loading cloud backups:", e);
            setIsLoadingBackupsErrorVisible(true);
        });
    }, [cloudClient]);

    React.useEffect(() => {
        const backupsChangedId = listen(events.backupsChanged, () => refresh().catch(e => {
            log.error("An error occurred while loading cloud backups:", e);
            setIsLoadingBackupsErrorVisible(true);
        }));

        return () => {
            unlisten(events.backupsChanged, backupsChangedId);
        };
    }, [refresh, listen, unlisten]);

    return (
        <Surface style={styles.container}>
            {isLoading ?
            <View style={styles.MessageContainer}>
                <ActivityIndicator size={32} />
            </View>
            : !cloudClient.isSignedIn ?
            <View style={styles.MessageContainer}>
                <Text variant={"bodyLarge"}>
                    {"Please sign in to your "}
                    <Text variant={"bodyLarge"}
                          onPress={async () => {
                              if (firstNavigation) {
                                  firstNavigation = false;
                                  router.navigate("/settings");
                                  await new Promise(resolve => setTimeout(resolve, 1));
                              }

                              goToProviderSettings(router, cloudProvider)
                          }}
                          style={styles.clickableText}>
                        {getProviderName(cloudProvider)}
                    </Text>
                    {" account."}
                </Text>
            </View>
            : sections ?
            <>
                <Searchbar mode={"view"}
                           placeholder={"Search"}
                           value={searchText}
                           onChangeText={setSearchText} />

                <SectionList sections={sections}
                             keyExtractor={item => item.cloudFolderName}
                             ListEmptyComponent={
                                 <Text variant={"bodyLarge"}>
                                     {searchText ?
                                         `No backups found matching "${searchText}"`
                                         : "No backups found"}
                                 </Text>
                             }
                             renderItem={({ item }) => <Item {...item} />}
                             renderSectionHeader={({ section: { title } }) =>
                             <Surface elevation={5}
                                      style={{ shadowColor: "transparent" }}>
                                 <List.Subheader>{searchText ?
                                     <HighlightText textToHighlight={[searchText]}
                                                    caseSensitive={false}
                                                    highlightStyle={{ backgroundColor: colors.primaryContainer }}>
                                         {title}
                                     </HighlightText>
                                     : <Text>{title}</Text>}
                                 </List.Subheader>
                                 <Divider bold={true}
                                          style={{ height: 2 }} />
                             </Surface>}
                             ItemSeparatorComponent={() => <Divider />}
                             refreshing={isLoading}
                             onRefresh={refresh}
                             contentContainerStyle={sections.length ? undefined : styles.MessageContainer} />

                <View style={[styles.bottomContainer, {
                    backgroundColor: colors.background
                }]}>
                    <Button mode={"text"}
                            icon={"delete"}
                            disabled={isPurging}
                            loading={isPurging}
                            onPress={purge}>
                        Purge
                    </Button>
                    <Button mode={"text"}
                            icon={"refresh"}
                            onPress={refresh}>
                        Refresh
                    </Button>
                </View>
            </>
            :
            <View style={styles.MessageContainer}>
                <Button onPress={refresh}>
                    Refresh
                </Button>
            </View>}

            <Portal>
                <ErrorDialog title={"Something went wrong"}
                             visible={isLoadingBackupsErrorVisible}
                             hide={() => setIsLoadingBackupsErrorVisible(false)}>
                    {`An error occurred while loading the backups from ${getProviderName(cloudProvider)}, check the logs for more information.`}
                </ErrorDialog>

                <ErrorDialog title={"Something went wrong"}
                             visible={isPurgingErrorVisible}
                             hide={() => setIsPurgingErrorVisible(false)}>
                    {`An error occurred while purging the backups from ${getProviderName(cloudProvider)}, check the logs for more information.`}
                </ErrorDialog>

                <ErrorDialog title={"Delete Failed"}
                             visible={failedDeletes.length > 0}
                             hide={() => removeFailedDelete(failedDeletes[0])}>
                    {`An error occurred while deleting the backup \"${failedDeletes[0]}\", check the logs for more information.`}
                </ErrorDialog>

                <ErrorDialog title={"Download Failed"}
                             visible={failedDownloads.length > 0}
                             hide={() => removeFailedDownload(failedDownloads[0])}>
                    {`An error occurred while downloading the backup \"${failedDownloads[0]}\", check the logs for more information.`}
                </ErrorDialog>
            </Portal>
        </Surface>
    );

    async function refresh() {
        try {
            setIsLoading(true);
            setBackups(null);
            setSearchText("");

            if (!cloudClient.isSignedIn) {
                return;
            }

            // avoid spamming api with requests
            if (__DEV__) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setBackups([
                    {
                        folderName: "Farm1_393116863",
                        cloudFolderName: "Farm1_393116863_[2023-01-01T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-01T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm1_393116863",
                        cloudFolderName: "Farm1_393116863_[2023-01-02T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-02T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm2_393116863",
                        cloudFolderName: "Farm2_393116863_[2023-01-01T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-01T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm2_393116863",
                        cloudFolderName: "Farm2_393116863_[2023-01-02T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-02T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm3_393116863",
                        cloudFolderName: "Farm3_393116863_[2023-01-01T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-01T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm3_393116863",
                        cloudFolderName: "Farm3_393116863_[2023-01-02T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-02T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm4_393116863",
                        cloudFolderName: "Farm4_393116863_[2023-01-01T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-01T00:00:00.000Z")
                    },
                    {
                        folderName: "Farm4_393116863",
                        cloudFolderName: "Farm4_393116863_[2023-01-02T00.00.00Z]",
                        date: DateTime.fromISO("2023-01-02T00:00:00.000Z")
                    }
                ]);
                return;
            }

            const backups = await cloudClient.getBackups();
            setBackups(backups);
        } catch (e) {
            log.error(`An error occurred while loading backups from ${getProviderName(cloudProvider)}:`, e);
            setIsLoadingBackupsErrorVisible(true);
        }
        finally {
            setIsLoading(false);
        }
    }

    async function purge() {
        try {
            setIsPurging(true);
            await cloudClient.purgeBackups(backupsToKeep);
            ToastAndroid.show("Backups purged", ToastAndroid.SHORT);
            await refresh();
        } catch (e) {
            log.error(`An error occurred while purging backups:`, e);
            setIsPurgingErrorVisible(true);
        } finally {
            setIsPurging(false);
        }
    }

    function addFailedDelete(backup: string) {
        setFailedDeletes(prevState => [...prevState, backup]);
    }

    function removeFailedDelete(backup: string) {
        setFailedDeletes(prevState => prevState.filter(s => s !== backup));
    }

    function addFailedDownload(backup: string) {
        setFailedDownloads(prevState => [...prevState, backup]);
    }

    function removeFailedDownload(backup: string) {
        setFailedDownloads(prevState => prevState.filter(s => s !== backup));
    }

    async function checkStorage(): Promise<boolean> {
        if ((!savesPath.inAndroidFolder || storageMode === StorageMode.Legacy)) {
            if (!await legacy.isStoragePermissionGranted()) {
                ToastAndroid.show("Please grant the storage permission", ToastAndroid.SHORT);
            } else {
                return true;
            }

            return await legacy.requestStoragePermission();
        } else if (storageMode === StorageMode.Shizuku) {
            if (!Shizuku.ping()) {
                ToastAndroid.show("Please start the Shizuku service", ToastAndroid.SHORT);
                return false;
            } else if (!Shizuku.checkPermission()) {
                ToastAndroid.show("Please grant the Shizuku permission", ToastAndroid.SHORT);
                const result = await Shizuku.requestPermission();
                if (!result) {
                    return false;
                }
            }
            if (!Shizuku.checkStorageService()) {
                await Shizuku.startStorageService();
            }

            return true;
        } else if (storageMode === StorageMode.Saf && !saf.isStoragePermissionGranted()) {
            ToastAndroid.show("Please grant access to Android/data", ToastAndroid.SHORT);
            return await saf.requestStoragePermission();
        }

        return true;
    }

    async function downloadBackup(info: BackupInfo) {
        try {
            const perm = await checkStorage();
            if (!perm) {
                return;
            }
        } catch (e) {
            log.error(`An error occurred while checking storage:`, e);
            ToastAndroid.show("An error occurred while checking storage permission.", ToastAndroid.SHORT);
            return;
        }

        let path: string;
        try {
            path = savesPath.path || getSavesPath();
        } catch (e) {
            log.error(`An error occurred while getting saves path to download backup \"${info.cloudFolderName}\":`, e);
            addFailedDownload(info.cloudFolderName);
            return;
        }
        const tempPath = Paths.join(path, "cstemp");
        const tempSavePath = Paths.join(tempPath, info.folderName)

        try {
            storage.deletePath(tempSavePath, storageMode);
        } catch (e) {
            log.error(`An error occurred while deleting temporary save path for backup \"${info.cloudFolderName}\":`, e);
            addFailedDownload(info.cloudFolderName);
            return;
        }

        try {
            try {
                await cloudClient.downloadBackup(storageMode, info.cloudFolderName, tempSavePath);
            } catch (e) {
                log.error(`An error occurred while downloading backup \"${info.cloudFolderName}\":`, e);
                addFailedDownload(info.cloudFolderName);
                return;
            }

            const savePath = Paths.join(path, info.folderName);
            try {
                storage.deletePath(savePath, storageMode)
            } catch (e) {
                log.error(`An error occurred while deleting the existing save at \"${savePath}\":`, e);
                addFailedDownload(info.cloudFolderName);
                return;
            }

            try {
                storage.move(tempSavePath, savePath, storageMode);
            } catch (e) {
                log.error(`An error occurred while moving backup \"${info.cloudFolderName}\":`, e);
                addFailedDownload(info.cloudFolderName);

                try {
                    storage.deletePath(savePath, storageMode);
                } catch (e) {
                    log.warn(`An error occurred while deleting the path \"${savePath}\":`, e);
                }
            }

            emit(events.localSavesChanged, undefined);
        } finally {
            try {
                storage.deletePath(tempSavePath, storageMode);
            } catch (e) {
                log.warn(`An error occurred while deleting the temporary save path \"${tempPath}\":`, e);
            }
        }
    }

    async function deleteBackup(cloudFolderName: string) {
        try {
            await cloudClient.deleteBackup(cloudFolderName);
            setBackups(prevState => !prevState ? null : prevState.filter(b => b.cloudFolderName !== cloudFolderName));
        } catch (e) {
            log.error(`An error occurred while deleting backup \"${cloudFolderName}\":`, e);
            addFailedDelete(cloudFolderName);
        }
    }

    function Item(props: ItemProps) {
        const { isSaveTransferring,
            isBackupDownloading,
            isBackupDeleting,
            isBackupTransferring,
            setBackupDownloading,
            setBackupDeleting } = React.useContext(SingletonsContext);

        return (
            <List.Item title={props.date.toLocaleString({
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })}
                       right={rightProps =>
                           <View style={styles.buttonContainer}>
                               <IconButton {...rightProps}
                                           icon={"delete"}
                                           style={[rightProps.style, styles.button]}
                                           disabled={isBackupTransferring(props.cloudFolderName)}
                                           loading={isBackupDeleting(props.cloudFolderName)}
                                           onPress={async () => {
                                               setBackupDeleting({...props}, true);
                                               await deleteBackup(props.cloudFolderName);
                                               setBackupDeleting({...props}, false);
                                           }} />
                               <IconButton {...rightProps}
                                           icon={"download"}
                                           style={[rightProps.style, styles.button]}
                                           disabled={isBackupDeleting(props.cloudFolderName) || isSaveTransferring(props.folderName)}
                                           loading={isBackupDownloading(props.cloudFolderName)}
                                           onPress={async () => {
                                               setBackupDownloading({...props}, true);
                                               await downloadBackup(props);
                                               setBackupDownloading({...props}, false);
                                           }} />
                           </View>}
            />
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "stretch"
    },
    MessageContainer: {
        flex: 1,
        padding: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    clickableText: {
        textDecorationLine: "underline"
    },
    bottomContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    },
    buttonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    },
    button: {
        margin: 0,
        marginLeft: 5
    }
});

let firstNavigation = true;