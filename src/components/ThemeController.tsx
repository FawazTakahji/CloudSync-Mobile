import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import React from "react";
import { SettingsContext } from "@/providers/SettingsProvider";
import { Theme } from "@/enums";
import { useColorScheme } from "react-native";
import type { MD3Theme } from "react-native-paper/src/types";


export function ThemeController(props: { children: React.ReactNode }) {
    const { theme } = React.useContext(SettingsContext);
    const colorScheme = useColorScheme();

    let appTheme: MD3Theme;
    if (theme === Theme.Auto) {
        appTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;
    } else {
        appTheme = theme === Theme.Dark ? MD3DarkTheme : MD3LightTheme;
    }

    return (
        <PaperProvider theme={appTheme}>
            {props.children}
        </PaperProvider>
    );
}