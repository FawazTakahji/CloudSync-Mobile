import React from "react";
import { StatusBar } from "react-native";
import { useTheme } from "react-native-paper";

export default function StatusBarController(props: { children: React.ReactNode }) {
    const theme = useTheme();

    return (
        <>
            {props.children}
            <StatusBar backgroundColor={theme.colors.elevation.level2}
                       barStyle={theme.dark ? "light-content" : "dark-content"} />
        </>
    );
}