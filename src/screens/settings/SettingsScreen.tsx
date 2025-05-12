import { StyleSheet, ToastAndroid } from "react-native";
import { Divider, IconButton, List, Portal, Surface, Text } from "react-native-paper";
import React from "react";
import { SettingsContext } from "@/providers/SettingsProvider";
import { StorageModeModal } from "@/screens/settings/modals/StorageModeModal";
import { ThemeModal } from "@/screens/settings/modals/ThemeModal";
import { StorageMode, CloudProvider, Theme } from "@/enums";
import { ExportErrorDialog } from "./dialogs/ExportErrorDialog";
import log, { exportLogs as loggerExportLogs, LogsDontExistError } from "@/utils/logger";
import { CloudProviderModal } from "@/screens/settings/modals/CloudProviderModal";
import { useRouter } from "expo-router";
import {
    getProviderIcon,
    getProviderName,
    getStorageModeName,
    getThemeIcon,
    getThemeName,
    goToProviderSettings
} from "@/utils/misc";
import { ErrorDialog } from "@/components/ErrorDialog";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { BackupsModal } from "@/screens/settings/modals/BackupsModal";
import { inAppUpdates } from "@/utils/updates";
import { UpdatesModal } from "@/screens/settings/modals/UpdatesModal";
import { SavesPathModal } from "@/screens/settings/modals/SavesPathModal";

export default function SettingsScreen() {
    const router = useRouter();
    const settings = React.useContext(SettingsContext);
    const { isTransferringSaves } = React.useContext(SingletonsContext);
    const [isThemeModalVisible, setIsThemeModalVisible] = React.useState<boolean>(false);
    const [isStorageModeModalVisible, setIsStorageModeModalVisible] = React.useState<boolean>(false);
    const [isSavesPathModalVisible, setIsSavesPathModalVisible] = React.useState<boolean>(false);
    const [isCloudProviderModalVisible, setIsCloudProviderModalVisible] = React.useState<boolean>(false);
    const [isBackupsModalVisible, setIsBackupsModalVisible] = React.useState<boolean>(false);
    const [isUpdatesModalVisible, setIsUpdatesModalVisible] = React.useState<boolean>(false);

    const [isThemeErrorVisible, setIsThemeErrorVisible] = React.useState<boolean>(false);
    const [isStorageModeErrorVisible, setIsStorageModeErrorVisible] = React.useState<boolean>(false);
    const [isSavesPathErrorVisible, setIsSavesPathErrorVisible] = React.useState<boolean>(false);
    const [isCloudProviderErrorVisible, setIsCloudProviderErrorVisible] = React.useState<boolean>(false);
    const [isBackupSavesErrorVisible, setIsBackupSavesErrorVisible] = React.useState<boolean>(false);
    const [isPurgeBackupsErrorVisible, setIsPurgeBackupsErrorVisible] = React.useState<boolean>(false);
    const [isBackupsToKeepErrorVisible, setIsBackupsToKeepErrorVisible] = React.useState<boolean>(false);
    const [isPurgingBackupsErrorVisible, setIsPurgingBackupsErrorVisible] = React.useState<boolean>(false);
    const [isExportErrorDialogVisible, setIsExportErrorDialogVisible] = React.useState<boolean>(false);
    const [exportError, setExportError] = React.useState<string | null>(null);

    const [isPurgingBackups, setIsPurgingBackups] = React.useState<boolean>(false);
    const [isCheckingUpdates, setIsCheckingUpdates] = React.useState<boolean>(false);

    return (
        <Surface style={styles.container}>
            <Divider />
            <List.Item title={"Theme"}
                       left={props =>
                           <List.Icon {...props} icon={getThemeIcon(settings.theme)} />}
                       right={props =>
                           <Text {...props}>
                               {getThemeName(settings.theme)}
                           </Text>}
                       onPress={() => setIsThemeModalVisible(true)} />
            <Divider />

            <List.Item title={"Storage Mode"}
                       left={props => <List.Icon {...props} icon="sd" />}
                       right={props =>
                           <Text {...props}>
                               {getStorageModeName(settings.storageMode)}
                           </Text>}
                       disabled={isTransferringSaves}
                       onPress={() => setIsStorageModeModalVisible(true)} />
            <Divider />

            <List.Item title={"Saves Path"}
                       description={props =>
                           <Text {...props}>{settings.savesPath ?? "Default"}</Text>}
                       left={props =>
                           <List.Icon {...props} icon="folder" />}
                       disabled={isTransferringSaves}
                       onPress={() => setIsSavesPathModalVisible(true)} />
            <Divider />

            <List.Item title={"Cloud Provider"}
                       description={props =>
                           <Text {...props}>{getProviderName(settings.cloudProvider)}</Text>}
                       left={props =>
                           <List.Icon {...props} icon={getProviderIcon(settings.cloudProvider)} />}
                       right={props =>
                           <IconButton {...props}
                                       icon={"cog"}
                                       onPress={() => goToProviderSettings(router, settings.cloudProvider)} />}
                       disabled={isTransferringSaves}
                       onPress={() => setIsCloudProviderModalVisible(true)} />
            <Divider />

            <List.Item title={"Backups"}
                       left={props => <List.Icon {...props} icon="backup-restore" />}
                       onPress={() => setIsBackupsModalVisible(true)}/>
            <Divider />

            {inAppUpdates && <>
                <List.Item title={"Updates"}
                           left={props => <List.Icon {...props} icon={"update"} />}
                           onPress={() => setIsUpdatesModalVisible(true)} />
                <Divider />
            </>}

            <List.Item title={"Export Logs"}
                       description={"Export the logs to a folder on your device"}
                       left={props => <List.Icon {...props} icon="export-variant" />}
                       onPress={exportLogs} />
            <Divider />

            <Portal>
                <ThemeModal visible={isThemeModalVisible}
                            setVisible={setIsThemeModalVisible}
                            selectedTheme={settings.theme}
                            setSelectedTheme={setTheme} />
                <StorageModeModal visible={isStorageModeModalVisible}
                                  setVisible={setIsStorageModeModalVisible}
                                  selectedStorageMode={settings.storageMode}
                                  setSelectedStorageMode={setStorageMode} />
                {isSavesPathModalVisible && <SavesPathModal setVisible={setIsSavesPathModalVisible}
                                                            savePath={settings.savesPath}
                                                            setSavePath={setSavesPath} />}
                <CloudProviderModal visible={isCloudProviderModalVisible}
                                    setVisible={setIsCloudProviderModalVisible}
                                    selectedCloudProvider={settings.cloudProvider}
                                    setSelectedCloudProvider={setCloudProvider} />
                {isBackupsModalVisible && <BackupsModal setVisible={setIsBackupsModalVisible}
                                                        backupSaves={settings.backupSaves}
                                                        purgeBackups={settings.purgeBackups}
                                                        backupsToKeep={settings.backupsToKeep}
                                                        isPurgingBackups={isPurgingBackups}
                                                        setBackupSaves={setBackupSaves}
                                                        setPurgeBackups={setPurgeBackups}
                                                        setBackupsToKeep={setBackupsToKeep}
                                                        setIsPurgingBackupsErrorVisible={setIsPurgingBackupsErrorVisible}
                                                        setIsPurgingBackups={setIsPurgingBackups} />}
                {isUpdatesModalVisible && <UpdatesModal setVisible={setIsUpdatesModalVisible}
                                                        checkUpdates={settings.checkUpdates}
                                                        isCheckingUpdates={isCheckingUpdates}
                                                        setCheckUpdates={settings.setCheckUpdates}
                                                        setIsCheckingUpdates={setIsCheckingUpdates} />}

                <ErrorDialog title={"Theme Error"}
                             visible={isThemeErrorVisible}
                             hide={() => setIsThemeErrorVisible(false)}>
                    An error occurred while saving the theme setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Storage Mode Error"}
                             visible={isStorageModeErrorVisible}
                             hide={() => setIsStorageModeErrorVisible(false)}>
                    An error occurred while saving the storage mode setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Saves Path Error"}
                             visible={isSavesPathErrorVisible}
                             hide={() => setIsSavesPathErrorVisible(false)}>
                    An error occurred while saving the saves path setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Cloud Provider Error"}
                             visible={isCloudProviderErrorVisible}
                             hide={() => setIsCloudProviderErrorVisible(false)}>
                    An error occurred while saving the cloud provider setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Backup Saves Error"}
                             visible={isBackupSavesErrorVisible}
                             hide={() => setIsBackupSavesErrorVisible(false)}>
                    An error occurred while saving the backup saves setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Purge Backups Error"}
                             visible={isPurgeBackupsErrorVisible}
                             hide={() => setIsPurgeBackupsErrorVisible(false)}>
                    An error occurred while saving the purge backups setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Backups To Keep Error"}
                             visible={isBackupsToKeepErrorVisible}
                             hide={() => setIsBackupsToKeepErrorVisible(false)}>
                    An error occurred while saving the backups to keep setting, check the logs for more information.
                </ErrorDialog>
                <ErrorDialog title={"Purge Backups Error"}
                             visible={isPurgingBackupsErrorVisible}
                             hide={() => setIsPurgingBackupsErrorVisible(false)}>
                    An error occurred while deleting old backups, check the logs for more information.
                </ErrorDialog>
                <ExportErrorDialog visible={isExportErrorDialogVisible}
                                   hide={hideExportErrorDialog}
                                   error={exportError} />
            </Portal>
        </Surface>
    );

    function setTheme(theme: Theme) {
        try {
            settings.setTheme(theme);
        } catch (e) {
            log.error("An error occurred while saving the theme setting:", e);
            setIsThemeErrorVisible(true);
        }
    }

    function setStorageMode(storageMode: StorageMode) {
        try {
            settings.setStorageMode(storageMode);
        } catch (e) {
            log.error("An error occurred while saving the storage mode setting:", e);
            setIsStorageModeErrorVisible(true);
        }
    }

    function setSavesPath(savesPath: string | null) {
        try {
            settings.setSavesPath(savesPath);
        } catch (e) {
            log.error("An error occurred while saving the saves path setting:", e);
            setIsSavesPathErrorVisible(true);
        }
    }

    function setCloudProvider(cloudProvider: CloudProvider) {
        try {
            settings.setCloudProvider(cloudProvider);
        } catch (e) {
            log.error("An error occurred while saving the cloud provider setting:", e);
            setIsCloudProviderErrorVisible(true);
        }
    }

    function setBackupSaves(backupSaves: boolean) {
        try {
            settings.setBackupSaves(backupSaves);
        } catch (e) {
            log.error("An error occurred while saving the backup saves setting:", e);
            setIsBackupSavesErrorVisible(true);
        }
    }

    function setPurgeBackups(purgeBackups: boolean) {
        try {
            settings.setPurgeBackups(purgeBackups);
        } catch (e) {
            log.error("An error occurred while saving the purge backups setting:", e);
            setIsPurgeBackupsErrorVisible(true);
        }
    }

    function setBackupsToKeep(backupsToKeep: number) {
        try {
            settings.setBackupsToKeep(backupsToKeep);
        } catch (e) {
            log.error("An error occurred while saving the backups to keep setting:", e);
            setIsBackupsToKeepErrorVisible(true);
        }
    }

    async function exportLogs() {
        try {
            await loggerExportLogs();
        } catch (e) {
            if (e instanceof LogsDontExistError) {
                ToastAndroid.show("The logs file doesn't exist or is empty.", ToastAndroid.SHORT);
            } else if (e instanceof Error) {
                log.error("An error occurred while exporting logs:", e);
                showExportErrorDialog(e.message);
            } else if (typeof e === "string") {
                log.error("An error occurred while exporting logs:", e);
                showExportErrorDialog(e);
            } else {
                log.error("An error occurred while exporting logs.");
                showExportErrorDialog();
            }
        }
    }

    function showExportErrorDialog(error?: string | null) {
        if (error) {
            setExportError(error);
        }
        setIsExportErrorDialogVisible(true);
    }

    function hideExportErrorDialog() {
        setIsExportErrorDialogVisible(false);
        setExportError(null);
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "stretch"
    }
});