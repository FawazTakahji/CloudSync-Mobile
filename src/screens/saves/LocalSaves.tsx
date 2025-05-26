import React from "react";
import { Linking, StyleSheet, ToastAndroid, View } from "react-native";
import { StorageHeader } from "@/screens/saves/StorageHeader";
import { ActivityIndicator, Button, Portal, Text } from "react-native-paper";
import { requestStoragePermission } from "@/utils/storage";
import * as legacy from "@/utils/storage/legacy";
import * as saf from "@/utils/storage/saf";
import { StorageMode } from "@/enums";
import Shizuku from "@/modules/shizuku";
import log from "@/utils/logger";
import { getLocalSaves, SaveInfo } from "@/utils/saves";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { ErrorDialog } from "@/components/ErrorDialog";
import { SaveItem } from "@/screens/saves/components/SaveItem";
import { SavesList } from "@/screens/saves/components/SavesList";
import { SettingsContext } from "@/providers/SettingsProvider";
import { filterSaves } from "@/utils/misc";
import CloudContext from "@/cloud-providers/CloudContext";
import { useEvents } from "react-native-events-hooks";
import events from "@/events";
import { CompareResult } from "@/screens/saves/SavesScreen";
import { Confirm, ConfirmQueueDialog } from "@/screens/saves/dialogs/ConfirmQueueDialog";

interface Props {
    saves: SaveInfo[] | null;
    setSaves: React.Dispatch<React.SetStateAction<SaveInfo[] | null>>;
    searchText: string;
    searchTextHighlightColor: string;
    showSaveInfo: (info: SaveInfo) => void;
    hideSaveInfo: () => void;
    compare: (info: SaveInfo) => CompareResult;
}

interface ItemProps {
    save: SaveInfo;
    searchText?: string;
    highlightColor?: string;
}

export function LocalSaves(props: Props) {
    const { storageMode, savesPath, backupSaves } = React.useContext(SettingsContext);
    const { cloudClient } = React.useContext(CloudContext);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [shizukuInstalled, setShizukuInstalled] = React.useState<boolean>(true);
    const [shizukuAvailable, setShizukuAvailable] = React.useState<boolean>(true);
    const [storagePerm, setStoragePerm] = React.useState<boolean>(true);

    const [isPermissionRequestErrorDialogVisible, setIsPermissionRequestErrorDialogVisible] = React.useState<boolean>(false);
    const [isShizukuStatusErrorDialogVisible, setIsShizukuStatusErrorDialogVisible] = React.useState<boolean>(false);
    const [isLoadingSavesErrorDialogVisible, setIsLoadingSavesErrorDialogVisible] = React.useState<boolean>(false);
    const [confirmQueue, setConfirmQueue] = React.useState<Confirm[]>([]);
    const [failedUploads, setFailedUploads] = React.useState<string[]>([]);

    const filteredSaves = React.useMemo<SaveInfo[] | null>(() => {
        if (!props.saves || !props.searchText) {
            return null;
        }

        return filterSaves(props.saves, props.searchText);
    }, [props.saves, props.searchText]);

    const { emit, listen, unlisten } = useEvents();

    React.useEffect(() => {
        refresh().catch(e => {
            log.error("An error occurred while loading local saves:", e);
            setIsLoadingSavesErrorDialogVisible(true);
        });
    }, [storageMode, savesPath]);

    React.useEffect(() => {
        const localChangedId = listen(events.localSavesChanged, () => refresh().catch(e => {
            log.error("An error occurred while loading local saves:", e);
            setIsLoadingSavesErrorDialogVisible(true);
        }));

        return () => {
            unlisten(events.localSavesChanged, localChangedId);
        };
    }, [refresh, listen, unlisten]);

    return (
        <>
            <StorageHeader icon={"sd"}
                           text={"Local Saves"}
                           isLoading={isLoading}
                           onPress={refresh} />

            {isLoading ? (
                <View style={styles.MessageContainer}>
                    <ActivityIndicator size={32} />
                </View>
            ) : !shizukuInstalled ? (
                <View style={styles.MessageContainer}>
                    <Text variant={"bodyLarge"}>
                        {"Please install "}
                        <Text variant={"bodyLarge"}
                              onPress={async () => await Linking.openURL("https://shizuku.rikka.app")}
                              style={styles.clickableText}>
                            Shizuku
                        </Text>
                    </Text>
                </View>
            ) : !shizukuAvailable ? (
                <View style={styles.MessageContainer}>
                    <Text variant={"bodyLarge"}>
                        {"Please start the "}
                        <Text variant={"bodyLarge"}
                              onPress={async () => {
                                  try {
                                      Shizuku.openApp();
                                  } catch (e) {
                                      log.error("An error occurred while opening the Shizuku app:", e);
                                  }
                              }}
                              style={styles.clickableText}>
                            Shizuku
                        </Text>
                        {" service"}
                    </Text>
                </View>
            ) : !storagePerm ? (
                <View style={styles.MessageContainer}>
                    <Text variant={"bodyLarge"}>
                        {!savesPath.inAndroidFolder ? "Please grant the storage permission"
                        : storageMode === StorageMode.Shizuku ? "Please grant shizuku permission"
                        : storageMode === StorageMode.Saf ? "Please grant the app access to Android/data"
                        : "Please grant the storage permission"}
                    </Text>
                    <Button mode={"contained"}
                            onPress={async () => {
                                try {
                                    const result = await requestStoragePermission(storageMode, savesPath.inAndroidFolder);
                                    if (result) {
                                        await refresh();
                                    }
                                } catch (e) {
                                    log.error("An error occurred while requesting permission:", e);
                                    setIsPermissionRequestErrorDialogVisible(true)
                                }
                            }}
                            style={{ marginTop: 16 }}>
                        Grant
                    </Button>
                </View>
            ) : filteredSaves || props.saves ? (
                <List />
            ) : (
                <View style={styles.MessageContainer}>
                    <Button onPress={refresh}>
                        Refresh
                    </Button>
                </View>
            )}

            <Portal>
                <ErrorDialog title={"Permission Request"}
                             visible={isPermissionRequestErrorDialogVisible}
                             hide={() => setIsPermissionRequestErrorDialogVisible(false)}>
                    An error occurred while requesting permission, check the logs for more information.
                </ErrorDialog>

                <ErrorDialog title={"Shizuku Error"}
                             visible={isShizukuStatusErrorDialogVisible}
                             hide={() => setIsShizukuStatusErrorDialogVisible(false)}>
                    An error occurred while checking the status of shizuku, check the logs for more information.
                </ErrorDialog>

                <ErrorDialog title={"Something went wrong"}
                             visible={isLoadingSavesErrorDialogVisible}
                             hide={() => setIsLoadingSavesErrorDialogVisible(false)}>
                    An error occurred while loading the saves, check the logs for more information.
                </ErrorDialog>

                <ErrorDialog title={"Upload Failed"}
                             visible={failedUploads.length > 0}
                             hide={() => removeFailedUpload(failedUploads[0])}>
                    {`An error occurred while uploading \"${failedUploads[0]}\", check the logs for more information.`}
                </ErrorDialog>

                {confirmQueue.length > 0 && (
                    <ConfirmQueueDialog title={confirmQueue[0].farmName}
                                        message={`There is an existing save with more days played on the cloud (${confirmQueue[0].existingDaysPlayed}), do you want to overwrite it (${confirmQueue[0].daysPlayed}) ?`}
                                        no={() => {
                                            confirmQueue[0].resolve(false);
                                            setConfirmQueue(prevState => prevState.slice(1));
                                        }}
                                        yes={() => {
                                            confirmQueue[0].resolve(true);
                                            setConfirmQueue(prevState => prevState.slice(1));
                                        }} />
                )}
            </Portal>
        </>
    );

    function List() {
        if (filteredSaves) {
            return (
                <SavesList data={filteredSaves}
                           listEmptyText={`No saves found matching "${props.searchText}"`}
                           renderItem={item =>
                               <Item save={item.item}
                                     searchText={props.searchText}
                                     highlightColor={props.searchTextHighlightColor} />}
                           onRefresh={refresh}
                           refreshing={isLoading} />
            );
        } else {
            return (
                <SavesList data={props.saves!}
                           listEmptyText={"No saves found"}
                           renderItem={item => <Item save={item.item} />}
                           onRefresh={refresh}
                           refreshing={isLoading} />
            );
        }
    }

    function Item(itemProps: ItemProps) {
        const singletons = React.useContext(SingletonsContext);
        return (
            <SaveItem searchText={itemProps.searchText}
                      highlightColor={itemProps.highlightColor}
                      title={itemProps.save.farmerName}
                      subtitle={`${itemProps.save.farmName} Farm`}
                      buttons={[
                          {
                              key: "upload",
                              icon: "upload",
                              loading: singletons.isSaveUploading(itemProps.save.folderName),
                              disabled: !cloudClient.isSignedIn || singletons.isSaveTransferring(itemProps.save.folderName),
                              onPress: async () => {
                                  singletons.setSaveUploading(itemProps.save.folderName, true);
                                  await uploadSave(itemProps.save);
                                  singletons.setSaveUploading(itemProps.save.folderName, false);
                              }
                          }
                      ]}
                      onLongPress={() => props.showSaveInfo(itemProps.save)} />
        );
    }

    async function refresh() {
        setIsLoading(true);
        setShizukuInstalled(true);
        setShizukuAvailable(true);
        setStoragePerm(true);
        props.setSaves(null);

        let shouldLoadSaves: boolean = false;
        if (!savesPath.inAndroidFolder || storageMode === StorageMode.Legacy) {
            const storagePerm = await legacy.isStoragePermissionGranted();
            shouldLoadSaves = storagePerm;
            setStoragePerm(storagePerm);
        } else if (storageMode === StorageMode.Shizuku) {
            try {
                if (!Shizuku.isInstalled()) {
                    setShizukuInstalled(false);
                    setStoragePerm(false);
                } else if (!Shizuku.ping()) {
                    setShizukuAvailable(false);
                    setStoragePerm(false);
                } else {
                    const storagePerm = Shizuku.checkPermission();
                    shouldLoadSaves = storagePerm;
                    setStoragePerm(storagePerm);
                }
            } catch (e) {
                log.error("An error occurred while checking Shizuku status.", e);
                setIsShizukuStatusErrorDialogVisible(true);
            }
        } else if (storageMode === StorageMode.Saf) {
            const storagePerm = saf.isStoragePermissionGranted();
            shouldLoadSaves = storagePerm;
            setStoragePerm(storagePerm);
        }

        if (shouldLoadSaves) {
            if (savesPath.inAndroidFolder && storageMode === StorageMode.Shizuku && !Shizuku.checkStorageService()) {
                await Shizuku.startStorageService();
            }

            try {
                const saves = getLocalSaves(storageMode, savesPath.path);
                props.setSaves(saves.saves);

                if (saves.loadFailed) {
                    ToastAndroid.show("Couldn't load some local saves, check the logs.", ToastAndroid.LONG);
                }
            } catch (e) {
                log.error("An error occurred while loading saves:", e);
                setIsLoadingSavesErrorDialogVisible(true);
            }
        }

        setIsLoading(false);
    }

    async function uploadSave(info: SaveInfo) {
        const result = props.compare(info);
        if (!result.shouldContinue) {
            const shouldContinue = await new Promise<boolean>(resolve => {
                setConfirmQueue(prevState => [...prevState, {
                    farmName: info.farmName,
                    daysPlayed: info.daysPlayed,
                    existingDaysPlayed: result.existingDaysPlayed,
                    resolve
                }]);
            });
            if (!shouldContinue) {
                return;
            }
        }

        if (backupSaves) {
            try {
                await cloudClient.backupSave(info.folderName);
                emit(events.backupsChanged, undefined);
            } catch (e) {
                log.error(`An error occurred while backing up save \"${info.folderName}\":`, e);
                addFailedUpload(info.folderName);
                return;
            }
        }

        try {
            await cloudClient.deleteSave(info.folderName);
        } catch (e) {
            log.error(`An error occurred while deleting existing save \"${info.folderName}\":`, e);
            addFailedUpload(info.folderName);
            return;
        }

        try {
            await cloudClient.uploadSave(storageMode, savesPath.path, info.folderName);
        } catch (e) {
            log.error(`An error occurred while uploading save \"${info.folderName}\":`, e);
            addFailedUpload(info.folderName);
        }

        emit(events.cloudSavesChanged, undefined);
    }

    function addFailedUpload(folderName: string) {
        setFailedUploads(prevState => [...prevState, folderName]);
    }

    function removeFailedUpload(folderName: string) {
        setFailedUploads(prevState => prevState.filter(s => s !== folderName));
    }
}

const styles = StyleSheet.create({
    MessageContainer: {
        flex: 1,
        padding: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    clickableText: {
        textDecorationLine: "underline"
    }
});