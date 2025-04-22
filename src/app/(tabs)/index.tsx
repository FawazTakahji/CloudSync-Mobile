import React from "react";
import { SavesScreen } from "@/screens/saves/SavesScreen";
import { SettingsContext } from "@/providers/SettingsProvider";
import CloudContext from "@/cloud-providers/CloudContext";
import log from "@/utils/logger";
import { Linking, ToastAndroid } from "react-native";
import { downloadUrl, getLatestVersion, inAppUpdates } from "@/utils/updates";
import { compare } from "compare-versions";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { ErrorDialog } from "@/components/ErrorDialog";
import { nativeApplicationVersion } from "expo-application";


export default function Index() {
    const [shouldPurge, setShouldPurge] = React.useState<boolean>(true);
    const { loaded, purgeBackups, backupsToKeep, checkUpdates } = React.useContext(SettingsContext)
    const { cloudClient } = React.useContext(CloudContext);
    const { isUpdateErrorVisible, setIsUpdateErrorVisible, newVersion, setNewVersion } = React.useContext(SingletonsContext);

    React.useEffect(() => {
        if (!shouldPurge || !loaded) {
            return;
        }
        if (!purgeBackups) {
            setShouldPurge(false);
            return;
        }
        if (!cloudClient.isSignedIn) {
            return;
        }

        ToastAndroid.show("Purging backups", ToastAndroid.SHORT);
        cloudClient.purgeBackups(backupsToKeep)
            .then(() => {
                ToastAndroid.show("Backups purged", ToastAndroid.SHORT);
            })
            .catch(e => {
                log.error("An error occurred while purging backups:", e);
                ToastAndroid.show("An error occurred while purging backups", ToastAndroid.SHORT);
            });
        setShouldPurge(false);
    }, [loaded, cloudClient])

    React.useEffect(() => {
        if (!inAppUpdates || !loaded || !checkUpdates) {
            return;
        }
        
        checkForUpdates().catch(e => {
            log.error("An error occurred while checking for updates:", e);
            setIsUpdateErrorVisible(true);
        });
    }, [loaded])

    return (
        <>
            <SavesScreen />
            <Portal>
                <ErrorDialog title={"Update Error"}
                             visible={isUpdateErrorVisible}
                             hide={() => setIsUpdateErrorVisible(false)}>
                    An error occurred while checking for updates, check the logs for more information.
                </ErrorDialog>

                {newVersion && <Dialog visible={true}
                                       onDismiss={() => setNewVersion(null)}>
                    <Dialog.Title>Update Available</Dialog.Title>
                    <Dialog.Content>
                        <Text variant={"bodyLarge"}>
                            {`A new version (${newVersion}) is available, do you want to update?`}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => {
                            setNewVersion(null);
                        }}>
                            No
                        </Button>
                        <Button onPress={() => {
                            setNewVersion(null);
                            Linking.openURL(downloadUrl).catch(e => {
                                log.error("An error occurred while opening the download url:", e);
                                ToastAndroid.show("An error occurred while opening the download url.", ToastAndroid.SHORT);
                            });
                        }}>
                            Yes
                        </Button>
                    </Dialog.Actions>
                </Dialog>}
            </Portal>
        </>
    );

    async function checkForUpdates() {
        if (!nativeApplicationVersion) {
            throw new Error("nativeApplicationVersion is null.");
        }

        const latestVersion = await getLatestVersion();
        if (compare(latestVersion, nativeApplicationVersion, ">")){
            setNewVersion(latestVersion);
        }
    }
}