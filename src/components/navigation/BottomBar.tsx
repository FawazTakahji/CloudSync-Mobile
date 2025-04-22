import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomNavigation, TouchableRipple } from "react-native-paper";
import { CommonActions } from "@react-navigation/native";

export function BottomBar(props: BottomTabBarProps) {
    return (
        <BottomNavigation.Bar shifting={true}
                              navigationState={props.state}
                              safeAreaInsets={props.insets}
                              onTabPress={({ route, preventDefault }) => {
                                  const event = props.navigation.emit({
                                      type: "tabPress",
                                      target: route.key,
                                      canPreventDefault: true
                                  });

                                  if (event.defaultPrevented) {
                                      preventDefault();
                                  } else {
                                      props.navigation.dispatch({
                                          ...CommonActions.navigate(route.name, route.params),
                                          target: props.state.key
                                      });
                                  }
                              }}
                              renderIcon={({ route, focused, color}) => {
                                  const { options } = props.descriptors[route.key];
                                  if (options.tabBarIcon) {
                                      return options.tabBarIcon({ focused, color, size: 24 });
                                  }

                                  return null;
                              }}
                              getLabelText={({ route }) => {
                                  const { options } = props.descriptors[route.key];
                                  return options.tabBarLabel !== undefined && typeof options.tabBarLabel === "string"
                                  ? options.tabBarLabel
                                      : options.title !== undefined
                                  ? options.title
                                          : route.name;
                              }}
                              renderTouchable={({ key, ...renderProps }) => <TouchableRipple key={key} {...renderProps} />}
        />
    );
}