import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { Button, List, Text, useTheme } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { nativeApplicationVersion } from "expo-application";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import log from "@/utils/logger";
import { getLatestVersion } from "@/utils/updates";
import { compare } from "compare-versions";
import { ToastAndroid } from "react-native";

interface Props {
    setVisible: (visible: boolean) => void;
    checkUpdates: boolean;
    isCheckingUpdates: boolean;
    setCheckUpdates: (checkUpdates: boolean) => void;
    setIsCheckingUpdates: (isCheckingUpdates: boolean) => void;
}

export function UpdatesModal(props: Props) {
    const { colors } = useTheme();
    const { setIsUpdateErrorVisible, setNewVersion } = React.useContext(SingletonsContext);

    return (
        <SettingsModal header={"Updates"}
                       visible={true}
                       setVisible={props.setVisible}>
            <Text variant={"titleMedium"}
                  style={{
                      textAlign: "center"
                  }}>
                {`Current Version: ${nativeApplicationVersion || "Unknown"}`}
            </Text>

            <List.Item title={"Check Updates"}
                       description={"Check for updates on startup"}
                       right={rightProps =>
                           <MaterialIcons {...rightProps}
                                          size={24}
                                          color={colors.primary}
                                          name={props.checkUpdates ? "check-box" : "check-box-outline-blank"} />}
                       onPress={() => props.setCheckUpdates(!props.checkUpdates)} />

            <Button mode={"contained"}
                    loading={props.isCheckingUpdates}
                    disabled={props.isCheckingUpdates}
                    icon={"check-all"}
                    onPress={checkUpdates}
                    style={{marginTop: 8}}>
                Check for Updates
            </Button>
        </SettingsModal>
    );

    async function checkUpdates() {
        try {
            props.setIsCheckingUpdates(true);
            if (!nativeApplicationVersion) {
                log.warn("Couldn't check for updates because nativeApplicationVersion is null.");
                setIsUpdateErrorVisible(true);
                return;
            }

            const latestVersion = await getLatestVersion();
            if (compare(latestVersion, nativeApplicationVersion, ">")) {
                setNewVersion(latestVersion);
            } else {
                ToastAndroid.show("You're already using the latest version.", ToastAndroid.SHORT);
            }
        } catch (e) {
            log.error("An error occurred while checking for updates:", e);
            setIsUpdateErrorVisible(true);
        } finally {
            props.setVisible(false);
            props.setIsCheckingUpdates(false);
        }
    }
}