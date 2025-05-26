import { StyleSheet, View } from "react-native";
import { Icon, IconButton, Text, useTheme, Tooltip } from "react-native-paper";
import React from "react";

interface Props {
    icon: string;
    text: string;
    isLoading: boolean;
    onPress: () => void;
}

export function StorageHeader(props: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, {backgroundColor: colors.background}]}>
            <Icon size={24}
                  source={props.icon} />
            <Text variant={"titleMedium"}
                  style={styles.text}>
                {props.text}
            </Text>
            {!props.isLoading ? (
                <View style={styles.button}>
                    <Tooltip title={"Refresh"}>
                        <IconButton icon={"refresh"}
                                    onPress={props.onPress} />
                    </Tooltip>
                </View>
            ) : undefined}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 68
    },
    text: {
        marginLeft: 16
    },
    button: {
        marginLeft: "auto",
        marginRight: 0
    }
});