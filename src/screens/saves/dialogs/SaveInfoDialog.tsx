import { SaveInfo } from "@/utils/saves";
import { Button, Dialog, Divider } from "react-native-paper";
import { StyleSheet } from "react-native";
import ListItem from "react-native-paper/src/components/List/ListItem";

export interface Props {
    info: SaveInfo;
    hide: () => void;
}

export function SaveInfoDialog(props: Props) {
    return (
        <Dialog visible={true}
                onDismiss={props.hide}>
            <Dialog.Content>
                <ListItem title={"Farm"}
                          description={props.info.farmName} />
                <Divider />
                <ListItem title={"Farmer"}
                          description={props.info.farmerName} />
                <Divider />
                <ListItem title={"Days Played"}
                          description={props.info.daysPlayed.toString()} />
                <Divider />
                <ListItem title={"Folder"}
                          description={props.info.folderName} />
            </Dialog.Content>
            <Dialog.Actions>
                <Button mode={"text"}
                        onPress={props.hide}
                        style={styles.button}>
                    OK
                </Button>
            </Dialog.Actions>
        </Dialog>
    );
}

const styles = StyleSheet.create({
    button: {
        minWidth: 64
    }
});