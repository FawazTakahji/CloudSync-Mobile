import React from "react";
import { ICloudClient } from "@/cloud-providers/ICloudClient";

const CloudContext = React.createContext<{
    cloudClient: ICloudClient,
    setCloudClient: (client: ICloudClient) => void}>({
    cloudClient: {
        isSignedIn: false,
        getSaves: () => { throw new Error("Not implemented"); },
        deleteSave: () => { throw new Error("Not implemented"); },
        uploadSave: () => { throw new Error("Not implemented"); },
        downloadSave: () => { throw new Error("Not implemented"); },
        getBackups: () => { throw new Error("Not implemented"); },
        deleteBackup: () => { throw new Error("Not implemented"); },
        backupSave: () => { throw new Error("Not implemented"); },
        downloadBackup: () => { throw new Error("Not implemented"); },
        purgeBackups: () => { throw new Error("Not implemented"); }
    },
    setCloudClient: () => {},
});

export default CloudContext;