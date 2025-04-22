import { Tabs } from "expo-router";
import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomBar } from "@/components/navigation/BottomBar";

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}
              tabBar={(props: BottomTabBarProps) => <BottomBar {...props} />}
              backBehavior={"none"}>
            <Tabs.Screen name="index"
                         options={{
                             title: "Saves",
                             tabBarIcon: ({ color, size }) => <MaterialIcons name={"save"} size={size} color={color}/>
                         }}/>
            <Tabs.Screen name="settings"
                         options={{
                             title: "Settings",
                             tabBarIcon: ({ color, size }) => <MaterialIcons name={"settings"} size={size} color={color}/>
                         }}/>
        </Tabs>
    );
}
