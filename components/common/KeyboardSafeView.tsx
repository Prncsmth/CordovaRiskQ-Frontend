// components/common/KeyboardSafeView.tsx
// KeyboardAvoidingView, iOS-only. On Android, merely mounting
// KeyboardAvoidingView (regardless of its `behavior` prop, including
// `undefined`) has been observed to break TextInput focus entirely on some
// devices -- tapping a field opens and immediately closes the keyboard, in
// a loop. Android already resizes the window via the manifest's
// `windowSoftInputMode="adjustResize"`, so it doesn't need this wrapper.
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export default function KeyboardSafeView({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView style={style} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    );
  }

  return <View style={style}>{children}</View>;
}
