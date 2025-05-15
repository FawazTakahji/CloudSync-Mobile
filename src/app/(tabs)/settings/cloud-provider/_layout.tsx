import { Stack } from "expo-router";
import { Appbar, useTheme } from "react-native-paper";
import React from "react";

export default function RootLayout() {
    const theme = useTheme();

    return (
        <Stack>
            <Stack.Screen name={"dropbox"}
                          options={{
                              title: "Dropbox",
                              header: (props) => <Header title={"Dropbox"} pop={() => props.navigation.pop()} />
                          }} />
            <Stack.Screen name={"google-drive"}
                          options={{
                              title: "Google Drive",
                              header: (props) => <Header title={"Google Drive"} pop={() => props.navigation.pop()} />
                          }} />
        </Stack>
    );

    function Header(props: { title: string, pop: () => void }) {
        return (
            <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level2 }}>
                <Appbar.BackAction onPress={props.pop} />
                <Appbar.Content title={props.title} />
            </Appbar.Header>
        )
    }
}