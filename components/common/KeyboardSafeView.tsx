// components/common/KeyboardSafeView.tsx
// Keeps a form's fields above the on-screen keyboard.
//
// iOS: KeyboardAvoidingView.
//
// Android: NOT KeyboardAvoidingView -- merely mounting it (regardless of its
// `behavior` prop, including `undefined`) has been observed to break
// TextInput focus entirely on some devices: tapping a field opens and
// immediately closes the keyboard, in a loop. And the window can't be
// relied on to resize either: this Expo SDK draws edge-to-edge, where
// Android no longer applies adjustResize, so the bottom of a form (e.g.
// Confirm Password) stayed hidden behind the keyboard. Instead this view
// measures how much of itself the keyboard actually covers and pads its
// bottom by exactly that (see utils/keyboardOverlap.ts), so the ScrollView
// inside shrinks to the visible area and can scroll every field into view.
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { keyboardOverlap } from "@/utils/keyboardOverlap";

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

  return <AndroidKeyboardSafeView style={style}>{children}</AndroidKeyboardSafeView>;
}

function AndroidKeyboardSafeView({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const viewRef = useRef<View>(null);
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      viewRef.current?.measureInWindow((_x, y, _width, height) => {
        setBottomInset(keyboardOverlap(y + height, keyboardTop));
      });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setBottomInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View ref={viewRef} style={[style, { paddingBottom: bottomInset }]}>
      {children}
    </View>
  );
}
