import { StyleSheet, View } from "react-native";
import { Portal, Searchbar, Surface, useTheme } from "react-native-paper";
import React from "react";
import { LocalSaves } from "@/screens/saves/LocalSaves";
import { CloudSaves } from "@/screens/saves/CloudSaves";
import { SaveInfo } from "@/utils/saves";
import { SaveInfoDialog } from "@/screens/saves/dialogs/SaveInfoDialog";

export type CompareResult = { shouldContinue: true } | { shouldContinue: false; existingDaysPlayed: number; };

const compare = (info: SaveInfo, saves: SaveInfo[] | null): CompareResult => {
    const save = saves?.find(s => s.folderName === info.folderName);
    if (!save) {
        return {
            shouldContinue: true
        };
    }

    return info.daysPlayed >= save.daysPlayed ? {
        shouldContinue: true
    } : {
        shouldContinue: false,
        existingDaysPlayed: save.daysPlayed
    };
}

export function SavesScreen() {
    const [localSaves, setLocalSaves] = React.useState<SaveInfo[] | null>(null);
    const [cloudSaves, setCloudSaves] = React.useState<SaveInfo[] | null>(null);
    const [searchText, setSearchText] = React.useState<string>("");
    const { colors } = useTheme();

    const [saveInfo, setSaveInfo] = React.useState<SaveInfo | null>(null);
    const showSaveInfo = React.useCallback((info: SaveInfo) => {
        setSaveInfo(info)
    }, []);
    const hideSaveInfo = React.useCallback(() => {
        setSaveInfo(null)
    }, []);

    const compareToLocal = (info: SaveInfo): CompareResult => compare(info, localSaves);
    const compareToLocalRef = React.useRef(compareToLocal);
    const compareToCloud = (info: SaveInfo): CompareResult => compare(info, cloudSaves);
    const compareToCloudRef = React.useRef(compareToCloud);
    React.useEffect(() => {
        compareToLocalRef.current = compareToLocal;
        compareToCloudRef.current = compareToCloud;
    });
    const compareToLocalMemo = React.useCallback((info: SaveInfo): CompareResult => compareToLocalRef.current(info), []);
    const compareToCloudMemo = React.useCallback((info: SaveInfo): CompareResult => compareToCloudRef.current(info), []);

    return (
        <Surface style={styles.container}>
            <Searchbar mode={"view"}
                       placeholder={"Search"}
                       value={searchText}
                       onChangeText={setSearchText} />
            <View style={{ flexGrow: 1 }}>
                <View style={{flex: 1}}>
                    <LocalSaves saves={localSaves}
                                setSaves={setLocalSaves}
                                searchText={searchText}
                                searchTextHighlightColor={colors.primaryContainer}
                                showSaveInfo={showSaveInfo}
                                hideSaveInfo={hideSaveInfo}
                                compare={compareToCloudMemo} />
                </View>
                <View style={{flex: 1}}>
                    <CloudSaves saves={cloudSaves}
                                setSaves={setCloudSaves}
                                searchText={searchText}
                                searchTextHighlightColor={colors.primaryContainer}
                                showSaveInfo={showSaveInfo}
                                hideSaveInfo={hideSaveInfo}
                                compare={compareToLocalMemo} />
                </View>
            </View>

            {saveInfo && <Portal>
                <SaveInfoDialog info={saveInfo}
                                hide={hideSaveInfo}/>
            </Portal>}
        </Surface>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "stretch"
    }
});