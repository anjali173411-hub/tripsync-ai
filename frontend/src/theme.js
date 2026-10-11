// Colour and font for the few Mantine parts we use (chips, tag boxes, password box, pop-up, spinner).

import { createTheme } from "@mantine/core";

export const theme = createTheme({
  // Mantine needs 10 shades of a colour, from light (0) to dark (9)
  colors: {
    maroon: ["#fdf2f5", "#f7e1e7", "#efc0cd", "#e49aae", "#d6718d", "#c2416b", "#a82a52", "#8b1e3f", "#741734", "#5c1028"]
  },
  primaryColor: "maroon",
  primaryShade: 7, // "#8b1e3f", our main colour
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  // Same height as our plain input boxes
  components: { PasswordInput: { defaultProps: { size: "md" } } }
});
