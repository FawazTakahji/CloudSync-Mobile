import { Button, Dialog, Text } from "react-native-paper";
import { ScrollView, StyleSheet } from "react-native";
import React from "react";

interface Props {
    visible: boolean;
    hide: () => void;
    error: string | null;
}

export function ExportErrorDialog(props: Props) {
    return (
        <Dialog visible={props.visible}
                onDismiss={props.hide}>
            <Dialog.Title>Export Failed</Dialog.Title>
            <Dialog.ScrollArea style={styles.container}>
                <ScrollView>
                    <Text variant={"bodyLarge"}>
                        {props.error != null ? `An error occurred while exporting the logs:\n${props.error}` : "An error occurred while exporting the logs."}
                    </Text>
                </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
                <Button mode={"text"}
                        onPress={props.hide}
                        style={styles.button}>
                    OK
                </Button>
            </Dialog.Actions>
        </Dialog>
    );
}

const styles = StyleSheet.create({
    button: {
        minWidth: 64
    },
    container: {
        paddingVertical: 16,
        maxHeight: 400
    }
});