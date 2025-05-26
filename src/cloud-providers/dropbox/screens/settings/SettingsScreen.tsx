import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, List, Portal, Surface } from "react-native-paper";
import { TextInput as RNTextInput } from "react-native";
import { DropboxContext } from "@/cloud-providers/dropbox/providers/DropboxSettingsProvider";
import { TextInputWithRestore } from "@/components/TextInputWithRestore";
import { AuthDialog } from "@/cloud-providers/dropbox/screens/settings/dialogs/AuthDialog";
import { ErrorDialog } from "@/components/ErrorDialog";
import { SingletonsContext } from "@/providers/SingletonsProvider";
import { Dropbox } from "dropbox";
import log from "@/utils/logger";

export function SettingsScreen() {
    const settings = React.useContext(DropboxContext);
    const { isTransferringSaves, isTransferringBackups } = React.useContext(SingletonsContext);
    const [clientId, setClientId] = React.useState<string>(settings.clientId);
    const [refreshToken, setRefreshToken] = React.useState<string>(settings.refreshToken);

    const isSignedIn = refreshToken !== "";
    const canSaveRestore = clientId !== settings.clientId || refreshToken !== settings.refreshToken;
    const canReset = clientId !== process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID || refreshToken !== "";

    const [errorDialogVisible, setErrorDialogVisible] = React.useState(false);
    const [isAuthenticating, setIsAuthenticating] = React.useState(false);
    const [authErrorDialogVisible, setAuthErrorDialogVisible] = React.useState(false);

    const refreshTokenInputRef = React.useRef<RNTextInput>(null);

    return (
        <Surface style={styles.container}>
            <Portal>
                {isAuthenticating && <AuthDialog clientId={clientId}
                                                 showAuthErrorDialog={() => setAuthErrorDialogVisible(true)}
                                                 saveToken={saveToken}
                                                 hide={() => setIsAuthenticating(false)} />}
                <ErrorDialog title={"Save Error"}
                             visible={errorDialogVisible}
                             hide={() => setErrorDialogVisible(false)}>
                    An error occurred while saving your settings, check the logs for more information.
                </ErrorDialog>

                <ErrorDialog title={"Something went wrong"}
                             visible={authErrorDialogVisible}
                             hide={() => setAuthErrorDialogVisible(false)}>
                    An error occurred while authenticating, check the logs for more information.
                </ErrorDialog>
            </Portal>

            <View style={{flex: 2, justifyContent: "center"}}>
                {!isSignedIn && <Button mode={"contained-tonal"}
                                        icon={"login"}
                                        disabled={clientId === ""}
                                        style={styles.horizontalMargin}
                                        onPress={signIn}>
                    Sign In
                </Button>}
                {isSignedIn && <Button mode={"contained"}
                                       icon={"logout"}
                                       style={styles.horizontalMargin}
                                       onPress={signOut}>
                    Sign Out
                </Button>}
            </View>

            <Surface elevation={2} mode={"flat"}>
                <List.Accordion title={"Advanced Settings"}>
                    <View style={{gap: 10}}>
                        <TextInputWithRestore label={"Client ID"}
                                              value={clientId}
                                              buttonDisabled={settings.clientId === clientId}
                                              submitBehavior={"submit"}
                                              enterKeyHint={"next"}
                                              onSubmitEditing={() => refreshTokenInputRef.current?.focus()}
                                              onChangeText={value => setClientId(value)}
                                              onRestore={() => setClientId(settings.clientId)} />
                        <TextInputWithRestore label={"Refresh Token"}
                                              value={refreshToken}
                                              multiline={true}
                                              innerRef={refreshTokenInputRef}
                                              buttonDisabled={settings.refreshToken === refreshToken}
                                              submitBehavior={"blurAndSubmit"}
                                              onChangeText={value => setRefreshToken(value)}
                                              onRestore={() => setRefreshToken(settings.refreshToken)} />

                    </View>
                </List.Accordion>

                <View style={styles.buttonsContainer}>
                    <Button disabled={!canReset}
                            onPress={reset}
                            style={{marginRight: "auto"}}>
                        Reset
                    </Button>
                    <Button disabled={!canSaveRestore}
                            onPress={restore}
                            style={{marginRight: 10}}>
                        Restore
                    </Button>
                    <Button disabled={isTransferringSaves || isTransferringBackups || !canSaveRestore}
                            onPress={save}>
                        Save
                    </Button>
                </View>
                <Divider />
            </Surface>
        </Surface>
    );


    function reset() {
        setClientId(process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID);
        setRefreshToken("");
    }

    function restore() {
        if (clientId !== settings.clientId) {
            setClientId(settings.clientId);
        }

        if (refreshToken !== settings.refreshToken) {
            setRefreshToken(settings.refreshToken);
        }
    }

    function save() {
        if ((clientId !== settings.clientId || refreshToken !== settings.refreshToken) && settings.clientId && settings.refreshToken) {
            const dbx = new Dropbox({
                clientId: settings.clientId,
                refreshToken: settings.refreshToken
            });

            dbx.authTokenRevoke().catch(e => log.warn("An error occurred while revoking the old token:", e));
        }

        try {
            if (clientId !== settings.clientId) {
                settings.setClientId(clientId);
            }

            if (refreshToken !== settings.refreshToken) {
                settings.setRefreshToken(refreshToken);
            }
        } catch (e) {
            log.warn("An error occurred while saving settings:", e);
            setErrorDialogVisible(true);
        }
    }

    function saveToken(token: string) {
        setRefreshToken(token);
        settings.setRefreshToken(token);
    }

    function signIn() {
        setIsAuthenticating(true);
    }

    function signOut() {
        setRefreshToken("");
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center"
    },
    buttonsContainer: {
        flexDirection: "row",
        alignSelf: "stretch",
        justifyContent: "flex-end",
        margin: 10
    },
    horizontalMargin: {
        marginHorizontal: 10
    }
});