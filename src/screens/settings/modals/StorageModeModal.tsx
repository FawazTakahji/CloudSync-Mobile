import { Button } from "react-native-paper";
import React from "react";
import { StorageMode } from "@/enums/StorageMode";
import { isStorageModeAllowed } from "@/utils/misc";
import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";

interface Props {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    selectedStorageMode: StorageMode;
    setSelectedStorageMode: (selectedStorageMode: StorageMode) => void;
}

interface StorageSelectorButtonProps {
    storageMode: StorageMode;
    text: string;
    icon: IconSource;
}

export function StorageModeModal(props: Props) {
    return (
        <SettingsModal header={"Storage Mode"}
                       visible={props.visible}
                       setVisible={props.setVisible} >
            <StorageSelectorButton storageMode={StorageMode.Legacy}
                                   text={"Legacy"}
                                   icon={"speedometer"} />
            <StorageSelectorButton storageMode={StorageMode.Shizuku}
                                   text={"Shizuku"}
                                   icon={"speedometer"} />
            <StorageSelectorButton storageMode={StorageMode.Saf}
                                   text={"Storage Access Framework"}
                                   icon={"speedometer-slow"} />
        </SettingsModal>
    );

    function StorageSelectorButton({ storageMode, text, icon }: StorageSelectorButtonProps) {
        return (
            <Button mode={props.selectedStorageMode === storageMode ? "contained" : "outlined"}
                    disabled={!isStorageModeAllowed(storageMode)}
                    onPress={() => {
                        props.setSelectedStorageMode(storageMode);
                        props.setVisible(false);
                    }}
                    icon={icon}
                    style={{marginBottom: 10}}>
                {text}
            </Button>
        );
    }
}