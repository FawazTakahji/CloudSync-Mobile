import { View, TextInput as RNTextInput } from "react-native";
import { IconButton, TextInput } from "react-native-paper";
import React from "react";

type Props = React.ComponentProps<typeof TextInput> & {
    buttonDisabled: boolean;
    onRestore: () => void;
    innerRef?: React.RefObject<RNTextInput>;
}

export function TextInputWithRestore(props: Props) {
    return (
        <View style={{flexDirection: "row"}}>
            <TextInput {...props}
                       ref={props.innerRef}
                       autoCapitalize={"none"}
                       autoCorrect={false}
                       style={{flex: 1}}/>
            <IconButton icon={"restore"}
                        disabled={props.buttonDisabled}
                        onPress={props.onRestore} />
        </View>
    );
}