import { Modal, Surface, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import React from "react";
import { StyleProp } from "react-native/Libraries/StyleSheet/StyleSheet";
import { ViewStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";

interface Props {
    header: React.ReactNode | string;
    visible: boolean;
    setVisible: (visible: boolean) => void;
    onDismiss?: () => void;
    contentContainerStyle?: StyleProp<ViewStyle>
    children: React.ReactNode;
}

export function SettingsModal(props: Props) {
    return (
        <Modal contentContainerStyle={styles.contentContainer}
               visible={props.visible}
               onDismiss={props.onDismiss ? props.onDismiss : () => props.setVisible(false)}>
            <Surface style={styles.container}>
                {typeof props.header === "string" ?
                    <Text variant={"headlineLarge"}
                          style={styles.title}>
                        {props.header}
                    </Text> : props.header}

                <View style={props.contentContainerStyle}>
                    {props.children}
                </View>
            </Surface>
        </Modal>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        padding: 16
    },
    container: {
        padding: 16,
        borderRadius: 15
    },
    title: {
        textAlign: "center",
        marginBottom: 16
    }
});