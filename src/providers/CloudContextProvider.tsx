import React from "react";
import DropboxSettingsProvider from "@/cloud-providers/dropbox/providers/DropboxSettingsProvider";
import { ICloudClient } from "@/cloud-providers/ICloudClient";
import CloudContext from "@/cloud-providers/CloudContext";
import GoogleDriveSettingsProvider from "@/cloud-providers/google-drive/providers/GoogleDriveSettingsProvider";

export function CloudContextProvider(props: { children: React.ReactNode }) {
    const [cloudClient, setCloudClient] = React.useState<ICloudClient>({
        isSignedIn: false,
        getSaves: () => { throw new Error("Not implemented"); },
        deleteSave: () => { throw new Error("Not implemented"); },
        uploadSave: () => { throw new Error("Not implemented"); },
        downloadSave: () => { throw new Error("Not implemented"); },
        backupSave: () => { throw new Error("Not implemented"); },
        purgeBackups: () => { throw new Error("Not implemented"); }
    });

    return (
        <CloudContext.Provider value={{
            cloudClient: cloudClient,
            setCloudClient: setCloudClient }}>
            <DropboxSettingsProvider>
                <GoogleDriveSettingsProvider>
                    {props.children}
                </GoogleDriveSettingsProvider>
            </DropboxSettingsProvider>
        </CloudContext.Provider>
    );
}