import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Divider, Text } from "react-native-paper";
import { SaveInfo } from "@/utils/saves";

type Props = React.ComponentProps<typeof FlatList<SaveInfo>> & {
    data: SaveInfo[];
    listEmptyText: string;
    onRefresh: () => void;
    refreshing: boolean;
}

export function SavesList(props: Props) {
    return (
        <FlatList {...props}
                  keyExtractor={item => item.folderName}
                  ItemSeparatorComponent={() => <Divider />}
                  ListEmptyComponent={
                      <View style={styles.MessageContainer}>
                          <Text variant={"bodyLarge"}>
                              {props.listEmptyText}
                          </Text>
                      </View>
                  }
                  contentContainerStyle={props.data.length ? undefined : { flex: 1 }} />
    );
}

const styles = StyleSheet.create({
    MessageContainer: {
        flex: 1,
        padding: 32,
        justifyContent: "center",
        alignItems: "center",
    }
});