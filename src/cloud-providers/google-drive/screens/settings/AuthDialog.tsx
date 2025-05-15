import { StyleSheet } from "react-native";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React from "react";
import { ActivityIndicator, Button, Dialog, Text } from "react-native-paper";
import log from "@/utils/logger";

interface Props {
    clientId: string;
    showAuthErrorDialog: () => void;
    saveToken: (token: string) => void;
    hide: () => void;
}

WebBrowser.maybeCompleteAuthSession();

export function AuthDialog(props: Props) {
    React.useEffect(() => {
        WebBrowser.warmUpAsync();

        return () => {
            WebBrowser.coolDownAsync();
        }
    }, []);

    const [authenticating, setAuthenticating] = React.useState(false);
    const [request, , promptAsync] = AuthSession.useAuthRequest({
        clientId: props.clientId,
        redirectUri: AuthSession.makeRedirectUri({
            scheme: "auth.svcloudsync.google"
        }),
        usePKCE: true,
        scopes: [
            "https://www.googleapis.com/auth/drive.file"
        ]
    }, {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth"
    });

    if (!authenticating) {
        return (
            <Dialog visible={true}
                    onDismiss={props.hide}>
                <Dialog.Title>Authentication</Dialog.Title>
                <Dialog.Content style={styles.container}>
                    <Text variant={"bodyLarge"}>
                        Please sign in to your Google account and grant access to this app.
                    </Text>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button mode={"text"}
                            onPress={props.hide}
                            style={styles.button}>
                        Cancel
                    </Button>
                    <Button mode={"text"}
                            onPress={authenticate}
                            style={styles.button}>
                        OK
                    </Button>
                </Dialog.Actions>
            </Dialog>
        );
    } else {
        return (
            <Dialog visible={true}
                    dismissable={false}>
                <Dialog.Title>Authenticating</Dialog.Title>
                <Dialog.Content style={styles.container}>
                    <ActivityIndicator size={"large"} />
                </Dialog.Content>
            </Dialog>
        );
    }

    async function authenticate() {
        try {
            setAuthenticating(true);

            let result;
            try {
                result = await promptAsync();
            } catch (e) {
                log.error("Google authentication error:", e);
                props.showAuthErrorDialog();
                return;
            }

            if (result.type === "cancel" || result.type === "dismiss") {
                return;
            } else if (result.type === "error") {
                log.error("Google authentication error:", result.error);
                props.showAuthErrorDialog();
                return;
            } else if (result.type !== "success") {
                return;
            }
            if (!result.params.code) {
                log.error("Failed to retrieve the code from authentication endpoint.");
                props.showAuthErrorDialog();
                return;
            }

            if (request && request.codeVerifier) {
                let tokenResponse;
                try {
                    tokenResponse = await AuthSession.exchangeCodeAsync({
                        clientId: request.clientId,
                        redirectUri: request.redirectUri,
                        code: result.params.code,
                        extraParams: {
                            code_verifier: request.codeVerifier,
                            grant_type: "authorization_code"
                        }
                    }, {
                        tokenEndpoint: "https://oauth2.googleapis.com/token"
                    });
                } catch (e) {
                    log.error("An error occurred while exchanging the google code:", e);
                    props.showAuthErrorDialog();
                    return;
                }

                if (!tokenResponse.refreshToken) {
                    log.error("Google refresh token is null.");
                    props.showAuthErrorDialog();
                    return;
                } else {
                    try {
                        props.saveToken(tokenResponse.refreshToken);
                    } catch (e) {
                        log.error("Failed to save the refresh token:", e);
                        props.showAuthErrorDialog();
                        return;
                    }
                }
            } else {
                if (!request) {
                    log.error("Google request is null.");
                    props.showAuthErrorDialog();
                } else {
                    log.error("Google request code verifier is null.");
                    props.showAuthErrorDialog();
                }
            }
        } finally {
            props.hide();
        }
    }
}

const styles = StyleSheet.create({
    button: {
        minWidth: 64
    },
    container: {
        maxHeight: 400
    }
});