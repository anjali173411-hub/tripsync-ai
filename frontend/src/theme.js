import { createTheme } from "@mantine/core";

export const theme = createTheme({
  colors: {
    brand: ["#ebf7ef", "#dcf2e4", "#b9e4c9", "#92d4ab", "#6cc390", "#3aa26a", "#28894f", "#1e7a46", "#18663a", "#14532d"]
  },
  primaryColor: "brand",
  primaryShade: 7,
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  components: { PasswordInput: { defaultProps: { size: "md" } } }
});
