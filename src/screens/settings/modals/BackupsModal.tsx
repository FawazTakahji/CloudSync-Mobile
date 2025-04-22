import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { Button, Divider, IconButton, List, Text, useTheme } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ToastAndroid, View } from "react-native";
import CloudContext from "@/cloud-providers/CloudContext";
import log from "@/utils/logger";

interface Props {
    setVisible: (visible: boolean) => void;
    backupSaves: boolean;
    purgeBackups: boolean;
    backupsToKeep: number;
    isPurgingBackups: boolean;
    setBackupSaves: (backupSaves: boolean) => void;
    setPurgeBackups: (purgeBackups: boolean) => void;
    setBackupsToKeep: (backupsToKeep: number) => void;
    setIsPurgingBackupsErrorVisible: (visible: boolean) => void;
    setIsPurgingBackups: (isPurgingBackups: boolean) => void;
}

export function BackupsModal(props: Props) {
    const { colors } = useTheme();
    const { cloudClient } = React.useContext(CloudContext);

    return (
        <SettingsModal header={"Backups"}
                       visible={true}
                       setVisible={props.setVisible}>
            <List.Item title={"Cloud Backups"}
                       description={"Backup old cloud saves on upload"}
                       right={rightProps =>
                           <MaterialIcons {...rightProps}
                                          size={24}
                                          color={colors.primary}
                                          name={props.backupSaves ? "check-box" : "check-box-outline-blank"} />}
                       onPress={() => props.setBackupSaves(!props.backupSaves)} />
            <Divider />

            <List.Item title={"Purge Backups"}
                       description={"Delete old backups on startup"}
                       right={rightProps =>
                           <MaterialIcons {...rightProps}
                                          size={24}
                                          color={colors.primary}
                                          name={props.purgeBackups ? "check-box" : "check-box-outline-blank"} />}
                       onPress={() => props.setPurgeBackups(!props.purgeBackups)} />
            <Divider />

            <View style={{
                alignSelf: "stretch",
                paddingVertical: 8,
                paddingHorizontal: 24
            }}>
                <Text style={{
                    fontSize: 16,
                    alignSelf: "center"
                }}>
                    Number of backups to keep
                </Text>
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-evenly"
                }}>
                    <IconButton icon={"chevron-up"}
                                iconColor={colors.primary}
                                disabled={props.backupsToKeep >= 10}
                                onPress={() => {
                                    if (props.backupsToKeep === 10) {
                                        return;
                                    } else if (props.backupsToKeep > 10) {
                                        props.setBackupsToKeep(10);
                                    } else {
                                        props.setBackupsToKeep(props.backupsToKeep + 1);
                                    }
                                }} />

                    <Text style={{fontSize: 24}}>
                        {props.backupsToKeep.toString().length === 1 ? "0" + props.backupsToKeep : props.backupsToKeep}
                    </Text>

                    <IconButton icon={"chevron-down"}
                                iconColor={colors.primary}
                                disabled={props.backupsToKeep <= 1}
                                onPress={() => {
                                    if (props.backupsToKeep === 1) {
                                        return;
                                    } else if (props.backupsToKeep < 1) {
                                        props.setBackupsToKeep(1);
                                    } else {
                                        props.setBackupsToKeep(props.backupsToKeep - 1);
                                    }
                                }} />
                </View>
            </View>
            <Divider />

            <Button mode={"contained"}
                    loading={props.isPurgingBackups}
                    disabled={props.isPurgingBackups || !cloudClient.isSignedIn}
                    icon={"delete"}
                    onPress={purgeBackups}
                    style={{marginTop: 8}}>
                Manually Purge Backups
            </Button>
        </SettingsModal>
    );

    async function purgeBackups() {
        try {
            props.setIsPurgingBackups(true);
            await cloudClient.purgeBackups(props.backupsToKeep);
            ToastAndroid.show("Backups deleted", ToastAndroid.SHORT);
        } catch (e) {
            log.error("An error occurred while deleting old backups:", e);
            props.setIsPurgingBackupsErrorVisible(true);
        } finally {
            props.setIsPurgingBackups(false);
        }
    }
}