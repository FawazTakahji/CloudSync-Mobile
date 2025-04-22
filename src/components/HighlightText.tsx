import React from "react";
import { Text } from "react-native-paper";
import { StyleProp } from "react-native/Libraries/StyleSheet/StyleSheet";
import { TextStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";
import { findAll } from "highlight-words-core";

type Props = React.ComponentProps<typeof Text> & {
    children: string;
    caseSensitive?: boolean;
    textToHighlight: string[];
    highlightStyle?: StyleProp<TextStyle>
};

export function HighlightText(props: Props) {
    const chunks = findAll({
        textToHighlight: props.children,
        searchWords: props.textToHighlight,
        caseSensitive: props.caseSensitive,
        autoEscape: true
    });

    return (
        <Text {...props}>
            {chunks.map((chunk, index) => {
                const text = props.children.substring(chunk.start, chunk.end);

                if (chunk.highlight) {
                    return (
                        <Text key={index}
                              style={props.highlightStyle}>
                            {text}
                        </Text>
                    );
                } else {
                    return text;
                }
            })}
        </Text>
    );
}