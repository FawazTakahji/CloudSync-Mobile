import React from "react";
import log from "@/utils/logger";
import * as SecureStore from 'expo-secure-store';
import CloudContext from "@/cloud-providers/CloudContext";
import { SettingsContext } from "@/providers/SettingsProvider";
import { CloudProvider } from "@/enums";
import { DropboxClient } from "@/cloud-providers/dropbox/DropboxClient";

interface Context {
    clientId: string;
    refreshToken: string;
    setClientId: (clientId: string) => void;
    setRefreshToken: (refreshToken: string) => void;
}

export const DropboxContext = React.createContext<Context>({
    clientId: "",
    refreshToken: "",
    setClientId: () => {},
    setRefreshToken: () => {}
});

export default function DropboxSettingsProvider(props: { children: React.ReactNode }) {
    const { cloudProvider } = React.useContext(SettingsContext);
    const { setCloudClient } = React.useContext(CloudContext);

    const [clientId, setClientIdInternal] = React.useState<string>(process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID);
    const [refreshToken, setRefreshTokenInternal] = React.useState<string>("");

    React.useEffect(loadSettings, []);
    React.useEffect(() => {
        if (cloudProvider === CloudProvider.Dropbox) {
            setCloudClient(new DropboxClient(clientId, refreshToken));
        }
    }, [clientId, refreshToken, cloudProvider]);

    return (
        <DropboxContext.Provider value={{
            clientId: clientId,
            refreshToken: refreshToken,
            setClientId: setClientId,
            setRefreshToken: setRefreshToken
        }}>
            {props.children}
        </DropboxContext.Provider>
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
                setClientId(process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID);
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
    clientId: "dropbox.clientId",
    refreshToken: "dropbox.refreshToken"
}