import { StorageHeader } from "@/screens/saves/StorageHeader";
import React from "react";
import { ActivityIndicator, Button, Divider, Portal, Text } from "react-native-paper";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { FlatList, StyleSheet, ToastAndroid, View } from "react-native";
import { useRouter } from "expo-router";
import { filterSaves, getProviderName, goToProviderSettings } from "@/utils/misc";
import { SettingsContext } from "@/providers/SettingsProvider";
import CloudContext from "@/cloud-providers/CloudContext";
import { ErrorDialog } from "@/components/ErrorDialog";
import log from "@/utils/logger";
import { SaveItem } from "@/screens/saves/components/SaveItem";
import { getSavesPath, SaveInfo } from "@/utils/saves";
import { StorageMode } from "@/enums";
import * as storage from "@/utils/storage";
import * as legacy from "@/utils/storage/legacy";
import * as saf from "@/utils/storage/saf";
import { Paths } from "expo-file-system/next";
import Shizuku from "@/modules/shizuku";
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

export function CloudSaves(props: Props) {
    const router = useRouter();
    const { cloudProvider, storageMode, savesPath } = React.useContext(SettingsContext);
    const { cloudClient } = React.useContext(CloudContext);

    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const data = React.useMemo<SaveInfo[] | null>(() => {
        if (props.searchText && props.saves !== null) {
            return filterSaves(props.saves, props.searchText);
        } else {
            return props.saves;
        }
    }, [props.saves, props.searchText]);

    const [isLoadingSavesErrorVisible, setIsLoadingSavesErrorVisible] = React.useState<boolean>(false);
    const [confirmQueue, setConfirmQueue] = React.useState<Confirm[]>([]);
    const [failedDownloads, setFailedDownloads] = React.useState<string[]>([]);
    const [failedDeletes, setFailedDeletes] = React.useState<string[]>([]);

    const { emit, listen, unlisten } = useEvents();

    React.useEffect(() => {
        refresh().catch(e => {
            log.error("An error occurred while loading cloud saves:", e);
            setIsLoadingSavesErrorVisible(true);
        });
    }, [cloudClient]);

    React.useEffect(() => {
        const cloudChangedId = listen(events.cloudSavesChanged, () => refresh().catch(e => {
            log.error("An error occurred while loading cloud saves:", e);
            setIsLoadingSavesErrorVisible(true);
        }));

        return () => {
            unlisten(events.cloudSavesChanged, cloudChangedId);
        };
    }, [refresh, listen, unlisten]);

    return (
        <>
            <StorageHeader icon={"cloud"}
                           text={"Cloud Saves"}
                           isLoading={isLoading}
                           onPress={refresh} />

            {isLoading ? (
                <View style={styles.MessageContainer}>
                    <ActivityIndicator size={32} />
                </View>
            ) : !cloudClient.isSignedIn ? (
                <View style={styles.MessageContainer}>
                    <Text variant={"bodyLarge"}>
                        {"Please sign in to your "}
                        <Text variant={"bodyLarge"}
                              onPress={async () => {
                                  // if user navigates to provider settings before settings then it won't be possible to navigate back to settings
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
            ) : data ? (
                <FlatList data={data}
                          onRefresh={refresh}
                          refreshing={isLoading}
                          keyExtractor={item => item.folderName}
                          renderItem={item =>
                              <Item save={item.item}
                                    searchText={props.searchText}
                                    highlightColor={props.searchTextHighlightColor} />}
                          ItemSeparatorComponent={() => <Divider />}
                          ListEmptyComponent={
                              <Text variant={"bodyLarge"}>
                                  {props.searchText ?
                                      `No saves found matching "${props.searchText}"`
                                      : "No saves found"}
                              </Text>
                          }
                          contentContainerStyle={data.length ? undefined : styles.MessageContainer} />
            ) : (
                <View style={styles.MessageContainer}>
                    <Button onPress={refresh}>
                        Refresh
                    </Button>
                </View>
            )}

            <Portal>
                <ErrorDialog title={"Something went wrong"}
                             visible={isLoadingSavesErrorVisible}
                             hide={() => setIsLoadingSavesErrorVisible(false)}>
                    {`An error occurred while loading the saves from ${getProviderName(cloudProvider)}, check the logs for more information.`}
                </ErrorDialog>
                <ErrorDialog title={"Download Failed"}
                             visible={failedDownloads.length > 0}
                             hide={() => removeFailedDownload(failedDownloads[0])}>
                    {`An error occurred while downloading \"${failedDownloads[0]}\", check the logs for more information.`}
                </ErrorDialog>
                <ErrorDialog title={"Delete Failed"}
                             visible={failedDeletes.length > 0}
                             hide={() => removeFailedDelete(failedDeletes[0])}>
                    {`An error occurred while deleting \"${failedDeletes[0]}\", check the logs for more information.`}
                </ErrorDialog>

                {confirmQueue.length > 0 && (
                    <ConfirmQueueDialog title={confirmQueue[0].farmName}
                                        message={`There is an existing save with more days played on your local storage (${confirmQueue[0].existingDaysPlayed}), do you want to overwrite it (${confirmQueue[0].daysPlayed}) ?`}
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

    function Item(itemProps: ItemProps) {
        const singletons = React.useContext(SingletonsContext);
        return (
            <SaveItem searchText={props.searchText}
                      highlightColor={itemProps.highlightColor}
                      title={itemProps.save.farmerName}
                      subtitle={`${itemProps.save.farmName} Farm`}
                      buttons={[
                          {
                              key: "delete",
                              icon: "delete",
                              loading: singletons.isSaveDeleting(itemProps.save.folderName),
                              disabled: singletons.isSaveTransferring(itemProps.save.folderName),
                              onPress: async () => {
                                  singletons.setSaveDeleting(itemProps.save.folderName, true);
                                  await deleteSave(itemProps.save);
                                  singletons.setSaveDeleting(itemProps.save.folderName, false);
                              }
                          },
                          {
                              key: "download",
                              icon: "download",
                              loading: singletons.isSaveDownloading(itemProps.save.folderName),
                              disabled: singletons.isSaveTransferring(itemProps.save.folderName),
                              onPress: async () => {
                                  singletons.setSaveDownloading(itemProps.save.folderName, true);
                                  await downloadSave(itemProps.save);
                                  singletons.setSaveDownloading(itemProps.save.folderName, false);
                              }
                          }
                      ]}
                      onLongPress={() => props.showSaveInfo(itemProps.save)} />
        );
    }

    async function refresh() {
        try {
            setIsLoading(true);
            props.setSaves(null);

            if (!cloudClient.isSignedIn) {
                return;
            }

            // avoid spamming api with requests
            if (__DEV__) {
                await new Promise(resolve => setTimeout(resolve, 500));
                props.setSaves([
                    {
                        folderName: "Farm1_393116863",
                        farmName: "Farm1",
                        farmerName: "Farmer 1",
                        daysPlayed: 10
                    },
                    {
                        folderName: "Farm2_393116863",
                        farmName: "Farm2",
                        farmerName: "Farmer 2",
                        daysPlayed: 10
                    },
                    {
                        folderName: "Farm3_393116863",
                        farmName: "Farm3",
                        farmerName: "Farmer 3",
                        daysPlayed: 10
                    },
                    {
                        folderName: "Farm4_393116863",
                        farmName: "Farm4",
                        farmerName: "Farmer 4",
                        daysPlayed: 10
                    }
                ]);
                return;
            }

            try {
                const cloudSaves = await cloudClient.getSaves();
                props.setSaves(cloudSaves.saves);
                if (cloudSaves.loadFailed) {
                    ToastAndroid.show("Couldn't load some cloud saves, check the logs.", ToastAndroid.LONG);
                }
            } catch (e) {
                log.error(`An error occurred while loading saves from ${getProviderName(cloudProvider)}:`, e);
                setIsLoadingSavesErrorVisible(true);
            }
        } finally {
            setIsLoading(false);
        }
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

    async function downloadSave(info: SaveInfo) {
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
            log.error(`An error occurred while getting saves path to download save \"${info.folderName}\":`, e);
            addFailedDownload(info.folderName);
            return;
        }
        const tempPath = Paths.join(path, "cstemp");
        const tempSavePath = Paths.join(tempPath, info.folderName)

        try {
            storage.deletePath(tempSavePath, storageMode);
        } catch (e) {
            log.error(`An error occurred while deleting temporary save path for save \"${info.folderName}\":`, e);
            addFailedDownload(info.folderName);
            return;
        }

        try {
            try {
                await cloudClient.downloadSave(storageMode, info.folderName, tempSavePath);
            } catch (e) {
                log.error(`An error occurred while downloading save \"${info.folderName}\":`, e);
                addFailedDownload(info.folderName);
                return;
            }

            const savePath = Paths.join(path, info.folderName);
            try {
                storage.deletePath(savePath, storageMode)
            } catch (e) {
                log.error(`An error occurred while deleting the existing save at \"${savePath}\":`, e);
                addFailedDownload(info.folderName);
                return;
            }

            try {
                storage.move(tempSavePath, savePath, storageMode);
            } catch (e) {
                log.error(`An error occurred while moving save \"${info.folderName}\":`, e);
                addFailedDownload(info.folderName);

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

    async function deleteSave(info: SaveInfo) {
        try {
            await cloudClient.deleteSave(info.folderName);
            props.setSaves(prevState => !prevState ? null : prevState.filter(s => s.folderName !== info.folderName));
        } catch (e) {
            log.error(`An error occurred while deleting save \"${info.folderName}\":`, e);
            addFailedDelete(info.folderName);
        }
    }

    function addFailedDownload(folderName: string) {
        setFailedDownloads(prevState => [...prevState, folderName]);
    }

    function removeFailedDownload(folderName: string) {
        setFailedDownloads(prevState => prevState.filter(s => s !== folderName));
    }

    function addFailedDelete(folderName: string) {
        setFailedDeletes(prevState => [...prevState, folderName]);
    }

    function removeFailedDelete(folderName: string) {
        setFailedDeletes(prevState => prevState.filter(s => s !== folderName));
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

let firstNavigation = true;