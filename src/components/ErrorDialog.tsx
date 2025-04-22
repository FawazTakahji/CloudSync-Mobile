import { ScrollView, StyleSheet } from "react-native";
import { Button, Dialog, Text } from "react-native-paper";
import React from "react";

interface Props {
    title: string;
    visible: boolean;
    hide: () => void;
    children: string;
}

export function ErrorDialog(props: Props) {
    return (
        <Dialog visible={props.visible}
                onDismiss={props.hide}>
            <Dialog.Title>{props.title}</Dialog.Title>
            <Dialog.ScrollArea style={styles.container}>
                <ScrollView>
                    <Text variant={"bodyLarge"}>
                        {props.children}
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
        maxHeight: 400,
        paddingVertical: 8
    }
})