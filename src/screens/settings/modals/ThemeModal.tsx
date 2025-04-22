import { Theme } from "@/enums/Theme";
import { SettingsModal } from "@/screens/settings/modals/SettingsModal";
import { Button } from "react-native-paper";

interface Props {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    selectedTheme: Theme;
    setSelectedTheme: (theme: Theme) => void;
}

interface ThemeSelectorButtonProps {
    theme: Theme;
    text: string;
    icon: string;
}

export function ThemeModal(props: Props) {
    return (
        <SettingsModal header={"Theme"}
                       visible={props.visible}
                       setVisible={props.setVisible} >
            <ThemeSelectorButton theme={Theme.Auto}
                                 text={"Auto"}
                                 icon={"theme-light-dark"} />
            <ThemeSelectorButton theme={Theme.Light}
                                 text={"Light"}
                                 icon={"weather-sunny"} />
            <ThemeSelectorButton theme={Theme.Dark}
                                 text={"Dark"}
                                 icon={"weather-night"} />
        </SettingsModal>
    );

    function ThemeSelectorButton({ theme, text, icon }: ThemeSelectorButtonProps) {
        return (
            <Button mode={props.selectedTheme === theme ? "contained" : "outlined"}
                    icon={icon}
                    onPress={() => props.setSelectedTheme(theme)}
                    style={{ marginBottom: 10 }}>
                {text}
            </Button>
        )
    }
}