import React from "react";

interface Backup {
    folderName: string;
    cloudFolderName: string;
}

export interface Singletons {
    uploadingSaves: string[];
    downloadingSaves: string[];
    deletingSaves: string[];
    downloadingBackups: Backup[];
    deletingBackups: Backup[];
    isTransferringSaves: boolean;
    isTransferringBackups: boolean;
    isSaveUploading: (save: string) => boolean;
    isSaveDownloading: (save: string) => boolean;
    isSaveDeleting: (save: string) => boolean;
    isSaveTransferring: (save: string) => boolean;
    isBackupDownloading: (backup: string) => boolean;
    isBackupDeleting: (backup: string) => boolean;
    isBackupTransferring: (backup: string) => boolean;
    setSaveUploading: (save: string, uploading: boolean) => void;
    setSaveDownloading: (save: string, downloading: boolean) => void;
    setSaveDeleting: (save: string, deleting: boolean) => void;
    setBackupDownloading: (backup: Backup, downloading: boolean) => void;
    setBackupDeleting: (backup: Backup, deleting: boolean) => void;
    isUpdateErrorVisible: boolean;
    setIsUpdateErrorVisible: (visible: boolean) => void;
    newVersion: string | null;
    setNewVersion: (newVersion: string | null) => void;
}

export const SingletonsContext = React.createContext<Singletons>({
    uploadingSaves: [],
    downloadingSaves: [],
    deletingSaves: [],
    downloadingBackups: [],
    deletingBackups: [],
    isTransferringSaves: false,
    isTransferringBackups: false,
    isSaveUploading: () => false,
    isSaveDownloading: () => false,
    isSaveDeleting: () => false,
    isSaveTransferring: () => false,
    isBackupDownloading: () => false,
    isBackupDeleting: () => false,
    isBackupTransferring: () => false,
    setSaveUploading: () => {},
    setSaveDownloading: () => {},
    setSaveDeleting: () => {},
    setBackupDownloading: () => {},
    setBackupDeleting: () => {},
    isUpdateErrorVisible: false,
    setIsUpdateErrorVisible: () => {},
    newVersion: null,
    setNewVersion: () => {}
});

export default function SingletonsProvider(props: { children: React.ReactNode }) {
    const [uploadingSaves, setUploadingSaves] = React.useState<string[]>([]);
    const [downloadingSaves, setDownloadingSaves] = React.useState<string[]>([]);
    const [deletingSaves, setDeletingSaves] = React.useState<string[]>([]);
    const [isTransferringSaves, setIsTransferringSaves] = React.useState<boolean>(false);
    const [downloadingBackups, setDownloadingBackups] = React.useState<Backup[]>([]);
    const [deletingBackups, setDeletingBackups] = React.useState<Backup[]>([]);
    const [isTransferringBackups, setIsTransferringBackups] = React.useState<boolean>(false);

    const [isUpdateErrorVisible, setIsUpdateErrorVisible] = React.useState<boolean>(false);
    const [newVersion, setNewVersion] = React.useState<string | null>(null);

    React.useEffect(() => {
        setIsTransferringSaves(uploadingSaves.length > 0 || downloadingSaves.length > 0 || deletingSaves.length > 0);
    }, [uploadingSaves, downloadingSaves, deletingSaves]);

    React.useEffect(() => {
        setIsTransferringBackups(downloadingBackups.length > 0 || deletingBackups.length > 0);
    }, [downloadingBackups, deletingBackups]);

    return (
        <SingletonsContext.Provider value={{
            uploadingSaves,
            downloadingSaves,
            deletingSaves,
            downloadingBackups,
            deletingBackups,
            isTransferringSaves,
            isTransferringBackups,
            isSaveUploading,
            isSaveDownloading,
            isSaveDeleting,
            isSaveTransferring,
            isBackupDownloading,
            isBackupDeleting,
            isBackupTransferring,
            setSaveUploading,
            setSaveDownloading,
            setSaveDeleting,
            setBackupDownloading,
            setBackupDeleting,
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
        return uploadingSaves.includes(save) || downloadingSaves.includes(save) || deletingSaves.includes(save) || !!downloadingBackups.find(b => b.folderName === save);
    }

    function isBackupDownloading(backup: string) {
        return !!downloadingBackups.find(b => b.cloudFolderName === backup);
    }

    function isBackupDeleting(backup: string) {
        return !!deletingBackups.find(b => b.cloudFolderName === backup);
    }

    function isBackupTransferring(backup: string) {
        return !!downloadingBackups.find(b => b.cloudFolderName === backup) || !!deletingBackups.find(b => b.cloudFolderName === backup);
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

    function setBackupDownloading(backup: Backup, downloading: boolean) {
        if (downloading) {
            setDownloadingBackups(prevState => [...prevState, backup]);
        } else {
            setDownloadingBackups(prevState => prevState.filter(b => b.cloudFolderName !== backup.cloudFolderName));
        }
    }

    function setBackupDeleting(backup: Backup, deleting: boolean) {
        if (deleting) {
            setDeletingBackups(prevState => [...prevState, backup]);
        } else {
            setDeletingBackups(prevState => prevState.filter(b => b.cloudFolderName !== backup.cloudFolderName));
        }
    }
}