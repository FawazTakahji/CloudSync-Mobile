import { IconButton, List } from "react-native-paper";
import React from "react";
import { HighlightText } from "@/components/HighlightText";

interface Props {
    title: string;
    subtitle: string;
    icon: string;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
    onLongPress: () => void;
    searchText?: string;
    highlightColor?: string;
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
                       <IconButton {...rightProps}
                                   icon={props.icon}
                                   loading={props.loading}
                                   disabled={props.disabled}
                                   onPress={props.onPress} />}
                   onLongPress={props.onLongPress} />
    );
}