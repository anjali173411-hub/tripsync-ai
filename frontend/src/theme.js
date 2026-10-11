// Colour and font for the few Mantine parts we use (chips, tag boxes, password box, pop-up, spinner).

import { createTheme } from "@mantine/core";

export const theme = createTheme({
  // Mantine needs 10 shades of a colour, from light (0) to dark (9)
  colors: {
    brand: ["#ebf7ef", "#dcf2e4", "#b9e4c9", "#92d4ab", "#6cc390", "#3aa26a", "#28894f", "#1e7a46", "#18663a", "#14532d"]
  },
  primaryColor: "brand",
  primaryShade: 7, // "#1e7a46", our main green
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  // Same height as our plain input boxes
  components: { PasswordInput: { defaultProps: { size: "md" } } }
});
