import React from "react";
import { SettingsContext } from "@/providers/SettingsProvider";
import CloudContext from "@/cloud-providers/CloudContext";
import * as SecureStore from "expo-secure-store";
import log from "@/utils/logger";
import { GoogleDriveClient } from "@/cloud-providers/google-drive/GoogleDriveClient";
import { CloudProvider } from "@/enums";

interface Context {
    clientId: string;
    refreshToken: string;
    setClientId: (clientId: string) => void;
    setRefreshToken: (refreshToken: string) => void;
}

export const GoogleDriveContext = React.createContext<Context>({
    clientId: "",
    refreshToken: "",
    setClientId: () => {},
    setRefreshToken: () => {}
});

export default function GoogleDriveSettingsProvider(props: { children: React.ReactNode }) {
    const { cloudProvider } = React.useContext(SettingsContext);
    const { setCloudClient } = React.useContext(CloudContext);

    const [clientId, setClientIdInternal] = React.useState<string>(process.env.EXPO_PUBLIC_GOOGLEDRIVE_CLIENT_ID);
    const [refreshToken, setRefreshTokenInternal] = React.useState<string>("");

    React.useEffect(loadSettings, []);
    React.useEffect(() => {
        if (cloudProvider === CloudProvider.GoogleDrive) {
            setCloudClient(new GoogleDriveClient(clientId, refreshToken));
        }
    }, [clientId, refreshToken, cloudProvider]);

    return (
        <GoogleDriveContext.Provider value={{
            clientId: clientId,
            refreshToken: refreshToken,
            setClientId: setClientId,
            setRefreshToken: setRefreshToken
        }}>
            {props.children}
        </GoogleDriveContext.Provider>
    );

    function setClientId(clientId: string) {
        SecureStore.setItem(keys.clientId, clientId);
        setClientIdInternal(clientId);
    }

    function setRefreshToken(refreshToken: string) {
        SecureStore.setItem(keys.refreshToken, refreshToken);
        setRefreshTokenInternal(refreshToken);
    }

    function loadSettings() {
        try {
            const clientId = SecureStore.getItem(keys.clientId);
            if (clientId) {
                setClientIdInternal(clientId);
            } else {
                setClientId(process.env.EXPO_PUBLIC_GOOGLEDRIVE_CLIENT_ID);
            }
        } catch (e) {
            log.error("An error occurred while loading the client id:", e)
        }

        try {
            const refreshToken = SecureStore.getItem(keys.refreshToken);
            if (refreshToken) {
                setRefreshTokenInternal(refreshToken);
            } else {
                SecureStore.setItem(keys.refreshToken, "");
            }
        } catch (e) {
            log.error("An error occurred while loading the refresh token:", e);
        }
    }
}

const keys = {
    clientId: "googledrive.clientId",
    refreshToken: "googledrive.refreshToken"
}