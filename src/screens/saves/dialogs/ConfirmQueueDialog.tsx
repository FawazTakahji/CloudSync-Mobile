import { Button, Dialog, Text } from "react-native-paper";

export interface Confirm {
    farmName: string;
    daysPlayed: number;
    existingDaysPlayed: number;
    resolve: (value: (boolean | PromiseLike<boolean>)) => void
}

interface Props {
    title: string;
    message: string;
    no: () => void;
    yes: () => void;
}

export function ConfirmQueueDialog(props: Props) {
    return (
        <Dialog visible={true}
                onDismiss={props.no}>
            <Dialog.Title>{props.title}</Dialog.Title>
            <Dialog.Content>
                <Text>{props.message}</Text>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={props.no}>
                    No
                </Button>
                <Button onPress={props.yes}>
                    Yes
                </Button>
            </Dialog.Actions>
        </Dialog>
    );
}