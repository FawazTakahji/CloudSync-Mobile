import React from "react";
import DropboxSettingsProvider from "@/cloud-providers/dropbox/providers/DropboxSettingsProvider";
import { ICloudClient } from "@/cloud-providers/ICloudClient";
import CloudContext from "@/cloud-providers/CloudContext";

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
                {props.children}
            </DropboxSettingsProvider>
        </CloudContext.Provider>
    );
}