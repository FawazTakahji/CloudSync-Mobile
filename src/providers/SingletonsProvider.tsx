import React from "react";

export interface Singletons {
    uploadingSaves: string[];
    downloadingSaves: string[];
    deletingSaves: string[];
    isUploadingSaves: boolean;
    isDownloadingSaves: boolean;
    isDeletingSaves: boolean;
    isTransferringSaves: boolean;
    isSaveUploading: (save: string) => boolean;
    isSaveDownloading: (save: string) => boolean;
    isSaveDeleting: (save: string) => boolean;
    isSaveTransferring: (save: string) => boolean;
    setSaveUploading: (save: string, uploading: boolean) => void;
    setSaveDownloading: (save: string, downloading: boolean) => void;
    setSaveDeleting: (save: string, deleting: boolean) => void;
    isUpdateErrorVisible: boolean;
    setIsUpdateErrorVisible: (visible: boolean) => void;
    newVersion: string | null;
    setNewVersion: (newVersion: string | null) => void;
}

export const SingletonsContext = React.createContext<Singletons>({
    uploadingSaves: [],
    downloadingSaves: [],
    deletingSaves: [],
    isUploadingSaves: false,
    isDownloadingSaves: false,
    isDeletingSaves: false,
    isTransferringSaves: false,
    isSaveUploading: () => false,
    isSaveDownloading: () => false,
    isSaveDeleting: () => false,
    isSaveTransferring: () => false,
    setSaveUploading: () => {},
    setSaveDownloading: () => {},
    setSaveDeleting: () => {},
    isUpdateErrorVisible: false,
    setIsUpdateErrorVisible: () => {},
    newVersion: null,
    setNewVersion: () => {}
});

export default function SingletonsProvider(props: { children: React.ReactNode }) {
    const [uploadingSaves, setUploadingSaves] = React.useState<string[]>([]);
    const [downloadingSaves, setDownloadingSaves] = React.useState<string[]>([]);
    const [deletingSaves, setDeletingSaves] = React.useState<string[]>([]);
    const [isUploadingSaves, setIsUploadingSaves] = React.useState<boolean>(false);
    const [isDownloadingSaves, setIsDownloadingSaves] = React.useState<boolean>(false);
    const [isDeletingSaves, setIsDeletingSaves] = React.useState<boolean>(false);
    const [isTransferringSaves, setIsTransferringSaves] = React.useState<boolean>(false);

    const [isUpdateErrorVisible, setIsUpdateErrorVisible] = React.useState<boolean>(false);
    const [newVersion, setNewVersion] = React.useState<string | null>(null);

    React.useEffect(() => {
        setIsUploadingSaves(uploadingSaves.length > 0);
        setIsDownloadingSaves(downloadingSaves.length > 0);
        setIsDeletingSaves(deletingSaves.length > 0);
        setIsTransferringSaves(uploadingSaves.length > 0 || downloadingSaves.length > 0 || deletingSaves.length > 0);
    }, [uploadingSaves, downloadingSaves, deletingSaves]);

    return (
        <SingletonsContext.Provider value={{
            uploadingSaves,
            downloadingSaves,
            deletingSaves,
            isUploadingSaves,
            isDownloadingSaves,
            isDeletingSaves,
            isTransferringSaves,
            isSaveUploading,
            isSaveDownloading,
            isSaveDeleting,
            isSaveTransferring,
            setSaveUploading,
            setSaveDownloading,
            setSaveDeleting,
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

    function isSaveDeleting(save: string) {
        return deletingSaves.includes(save);
    }

    function isSaveTransferring(save: string) {
        return uploadingSaves.includes(save) || downloadingSaves.includes(save) || deletingSaves.includes(save);
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

    function setSaveDeleting(save: string, deleting: boolean) {
        if (deleting) {
            setDeletingSaves(prevState => [...prevState, save]);
        } else {
            setDeletingSaves(prevState => prevState.filter(s => s !== save));
        }
    }
}