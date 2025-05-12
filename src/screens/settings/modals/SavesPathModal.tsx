import { Text, Dialog, Button, TextInput } from "react-native-paper";
import React from "react";
import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { StyleSheet, View } from "react-native";
import log from "@/utils/logger";
import { getSavesPath } from "@/utils/saves";
import { normalizePath, pathEqual } from "@/utils/path";
import { equalsCaseInsensitive } from "@/utils/misc";

interface Props {
    setVisible: (visible: boolean) => void;
    savePath: string | null;
    setSavePath: (savePath: string | null) => void;
}

export function SavesPathModal(props: Props) {
    const [path, setPath] = React.useState<string>(props.savePath ?? tryGetDefaultPath());

    return (
        <SettingsModal header={"Saves Path"}
                       visible={true}
                       setVisible={props.setVisible}>
            <TextInput value={path}
                       onChangeText={setPath}
                       placeholder={"Default"} />

            <View style={{
                alignSelf: "stretch",
                marginTop: 16,
                flexDirection: "row"
            }}>
                <Button style={styles.button}
                        mode={"text"}
                        disabled={props.savePath === null}
                        onPress={() => {
                            props.setSavePath(null);
                            props.setVisible(false);
                        }}>
                    Default
                </Button>

                <View style={{
                    flex: 1,
                }}/>

                <Button style={styles.button}
                        mode={"text"}
                        onPress={() => props.setVisible(false)}>
                    Cancel
                </Button>
                <Button style={styles.button}
                        mode={"text"}
                        disabled={!path || (props.savePath === null && pathEqual(path, tryGetDefaultPath())) || (props.savePath !== null && pathEqual(path, props.savePath))}
                        onPress={() => {
                            const normalizedPath = normalizePath(path);
                            const normalizedDefaultPath = normalizePath(tryGetDefaultPath());
                            if (equalsCaseInsensitive(normalizedPath, normalizedDefaultPath)) {
                                props.setSavePath(null);
                            } else {
                                props.setSavePath(normalizedPath);
                            }

                            props.setVisible(false);
                        }}>
                    Save
                </Button>
            </View>
        </SettingsModal>
    );
}

function tryGetDefaultPath(): string {
    try {
        return getSavesPath();
    } catch (e) {
        log.error("An error occurred while getting the default saves path:", e);
        return "";
    }
}

const styles = StyleSheet.create({
    button: {
        minWidth: 64
    }
});