import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="cloud-provider" options={{ headerShown: false }} />
        </Stack>
    );
}