import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { Button } from "react-native-paper";
import React from "react";
import { CloudProvider } from "@/enums/CloudProvider";

interface Props {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    selectedCloudProvider: CloudProvider;
    setSelectedCloudProvider: (selectedCloudProvider: CloudProvider) => void;
}

interface CloudProvidersSelectorButtonProps {
    provider: CloudProvider;
    text: string;
    icon: string;
}

export function CloudProviderModal(props: Props) {
    return (
        <SettingsModal header={"Cloud Provider"}
                       visible={props.visible}
                       setVisible={props.setVisible}>
            <CloudProvidersSelectorButton provider={CloudProvider.Dropbox}
                                          text={"Dropbox"}
                                          icon={"dropbox"} />
            <CloudProvidersSelectorButton provider={CloudProvider.GoogleDrive}
                                          text={"Google Drive"}
                                          icon={"google-drive"} />
        </SettingsModal>
    );

    function CloudProvidersSelectorButton({ provider, text, icon }: CloudProvidersSelectorButtonProps) {
        return (
            <Button mode={props.selectedCloudProvider === provider ? "contained" : "outlined"}
                    icon={icon}
                    onPress={() => {
                        props.setSelectedCloudProvider(provider);
                        props.setVisible(false);
                    }}
                    style={{marginBottom: 10}}>
                {text}
            </Button>
        );
    }
}