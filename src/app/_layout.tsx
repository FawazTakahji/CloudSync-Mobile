import { Stack } from "expo-router";
import SingletonsProvider from "@/providers/SingletonsProvider";
import StatusBarController from "@/components/StatusBarController";
import React from "react";
import * as Constants from "@/constants";
import SettingsProvider from "@/providers/SettingsProvider";
import { ThemeController } from "@/components/ThemeController";
import { clearLogFile } from "@/utils/logger";
import { setJSExceptionHandler } from "react-native-exception-handler";
import { exceptionHandler } from "@/utils/misc";
import { CloudContextProvider } from "@/providers/CloudContextProvider";

export default function RootLayout() {
    setJSExceptionHandler(exceptionHandler, false);
    Constants.setAllowedStorageModes();
    clearLogFile();

    return (
        <SettingsProvider>
            <CloudContextProvider>
                <SingletonsProvider>
                    <ThemeController>
                        <StatusBarController>
                            <Stack>
                                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            </Stack>
                        </StatusBarController>
                    </ThemeController>
                </SingletonsProvider>
            </CloudContextProvider>
        </SettingsProvider>
    );
}