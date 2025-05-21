import { IconButton, List } from "react-native-paper";
import React from "react";
import { HighlightText } from "@/components/HighlightText";
import { View } from "react-native";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";

interface Props {
    title: string;
    subtitle: string;
    buttons: ButtonProps[];
    onLongPress: () => void;
    searchText?: string;
    highlightColor?: string;
}

interface ButtonProps {
    key: string;
    icon: IconSource;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
}

export function SaveItem(props: Props) {
    return (
        <List.Item title={props.searchText && props.highlightColor ?
            (titleProps) =>
                <HighlightText {...titleProps}
                               textToHighlight={[props.searchText!]}
                               highlightStyle={{ backgroundColor: props.highlightColor }}
                               style={{ fontSize: titleProps.fontSize, color: titleProps.color }}>
                    {props.title}
                </HighlightText> : props.title}
                   description={props.searchText && props.highlightColor ? (descriptionProps) =>
                       <HighlightText {...descriptionProps}
                                      textToHighlight={[props.searchText!]}
                                      highlightStyle={{ backgroundColor: props.highlightColor }}
                                      style={{ fontSize: descriptionProps.fontSize, color: descriptionProps.color }}>
                           {props.subtitle}
                       </HighlightText> : props.subtitle}
                   right={rightProps =>
                       <View style={{
                           flexDirection: "row"
                       }}>
                           {props.buttons.map(button =>
                               <IconButton {...rightProps}
                                           key={button.key}
                                           icon={button.icon}
                                           loading={button.loading}
                                           disabled={button.disabled}
                                           onPress={button.onPress}
                                           style={[rightProps.style, {
                                               margin: 0,
                                               marginLeft: 5
                                           }]}
                               />
                               )}
                       </View>}
                   onLongPress={props.onLongPress} />
    );
}