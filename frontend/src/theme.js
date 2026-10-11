// The look of all Mantine components (buttons, inputs, cards ...) in one place.
// Mantine is the UI component library the app uses: https://mantine.dev
//
// To change the app's main colour, change the "maroon" shades below
// (and the --primary colours at the top of index.css).

import { createTheme } from "@mantine/core";

export const theme = createTheme({
  // Mantine needs 10 shades of a colour, from very light (0) to very dark (9)
  colors: {
    maroon: [
      "#fdf2f5",
      "#f7e1e7",
      "#efc0cd",
      "#e49aae",
      "#d6718d",
      "#c2416b",
      "#a82a52",
      "#8b1e3f", // our main colour (--primary)
      "#741734",
      "#5c1028"
    ]
  },
  primaryColor: "maroon",
  primaryShade: 7, // use "#8b1e3f" for buttons, ticks, focus rings ...

  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', fontWeight: "800" },

  defaultRadius: "md", // rounded corners everywhere

  // Default settings for some components, so pages don't repeat them
  components: {
    Button: { defaultProps: { radius: "md" } },
    Card: { defaultProps: { radius: "lg", shadow: "sm", withBorder: true, padding: "lg" } },
    TextInput: { defaultProps: { size: "md" } },
    PasswordInput: { defaultProps: { size: "md" } },
    Textarea: { defaultProps: { size: "md" } },
    TagsInput: { defaultProps: { size: "md" } },
    NumberInput: { defaultProps: { size: "md" } },
    Select: { defaultProps: { size: "md" } },
    DatePickerInput: { defaultProps: { size: "md" } }
  }
});
