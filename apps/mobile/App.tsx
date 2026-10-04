import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>BazaarLink</Text>
      <Text style={styles.title}>Commerce for local businesses.</Text>
      <Text style={styles.body}>
        Phase 1 foundation is running. Design, localization, authentication, and
        role-aware experiences will be added in the next focused tasks.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#ffffff"
  },
  eyebrow: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700"
  },
  title: {
    marginBottom: 12,
    fontSize: 30,
    fontWeight: "700"
  },
  body: {
    maxWidth: 520,
    fontSize: 17,
    lineHeight: 26
  }
});
