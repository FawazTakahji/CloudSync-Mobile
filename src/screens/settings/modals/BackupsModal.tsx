import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { Divider, IconButton, List, Text, useTheme } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { View } from "react-native";

interface Props {
    setVisible: (visible: boolean) => void;
    backupSaves: boolean;
    purgeBackups: boolean;
    backupsToKeep: number;
    setBackupSaves: (backupSaves: boolean) => void;
    setPurgeBackups: (purgeBackups: boolean) => void;
    setBackupsToKeep: (backupsToKeep: number) => void;
}

export function BackupsModal(props: Props) {
    const { colors } = useTheme();

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
                paddingTop: 8,
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
        </SettingsModal>
    );
}