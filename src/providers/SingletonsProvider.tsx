import React from "react";

export interface Singletons {
    uploadingSaves: string[];
    downloadingSaves: string[];
    isUploadingSaves: boolean;
    isDownloadingSaves: boolean;
    isTransferringSaves: boolean;
    isSaveUploading: (save: string) => boolean;
    isSaveDownloading: (save: string) => boolean;
    isSaveTransferring: (save: string) => boolean;
    setSaveUploading: (save: string, uploading: boolean) => void;
    setSaveDownloading: (save: string, downloading: boolean) => void;
    isUpdateErrorVisible: boolean;
    setIsUpdateErrorVisible: (visible: boolean) => void;
    newVersion: string | null;
    setNewVersion: (newVersion: string | null) => void;
}

export const SingletonsContext = React.createContext<Singletons>({
    uploadingSaves: [],
    downloadingSaves: [],
    isUploadingSaves: false,
    isDownloadingSaves: false,
    isTransferringSaves: false,
    isSaveUploading: () => false,
    isSaveDownloading: () => false,
    isSaveTransferring: () => false,
    setSaveUploading: () => {},
    setSaveDownloading: () => {},
    isUpdateErrorVisible: false,
    setIsUpdateErrorVisible: () => {},
    newVersion: null,
    setNewVersion: () => {}
});

export default function SingletonsProvider(props: { children: React.ReactNode }) {
    const [uploadingSaves, setUploadingSaves] = React.useState<string[]>([]);
    const [downloadingSaves, setDownloadingSaves] = React.useState<string[]>([]);
    const [isUploadingSaves, setIsUploadingSaves] = React.useState<boolean>(false);
    const [isDownloadingSaves, setIsDownloadingSaves] = React.useState<boolean>(false);
    const [isTransferringSaves, setIsTransferringSaves] = React.useState<boolean>(false);

    const [isUpdateErrorVisible, setIsUpdateErrorVisible] = React.useState<boolean>(false);
    const [newVersion, setNewVersion] = React.useState<string | null>(null);

    React.useEffect(() => {
        setIsUploadingSaves(uploadingSaves.length > 0);
        setIsDownloadingSaves(downloadingSaves.length > 0);
        setIsTransferringSaves(uploadingSaves.length > 0 || downloadingSaves.length > 0);
    }, [uploadingSaves, downloadingSaves]);

    return (
        <SingletonsContext.Provider value={{
            uploadingSaves,
            downloadingSaves,
            isUploadingSaves,
            isDownloadingSaves,
            isTransferringSaves,
            isSaveUploading,
            isSaveDownloading,
            isSaveTransferring,
            setSaveUploading,
            setSaveDownloading,
            isUpdateErrorVisible,
            setIsUpdateErrorVisible,
            newVersion,
            setNewVersion,
        }}>
            {props.children}
        </SingletonsContext.Provider>
    )

    function isSaveUploading(save: string) {
        return uploadingSaves.includes(save);
    }

    function isSaveDownloading(save: string) {
        return downloadingSaves.includes(save);
    }

    function isSaveTransferring(save: string) {
        return uploadingSaves.includes(save) || downloadingSaves.includes(save);
    }

    function setSaveUploading(save: string, uploading: boolean) {
        if (uploading) {
            setUploadingSaves(prevState => [...prevState, save]);
        } else {
            setUploadingSaves(prevState => prevState.filter(s => s !== save));
        }
    }

    function setSaveDownloading(save: string, downloading: boolean) {
        if (downloading) {
            setDownloadingSaves(prevState => [...prevState, save]);
        } else {
            setDownloadingSaves(prevState => prevState.filter(s => s !== save));
        }
    }
}