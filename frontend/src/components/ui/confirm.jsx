// A nice "Are you sure?" pop-up (Mantine modal), used instead of the browser's window.confirm.
//
// Usage:
//   confirmAction({
//     title: "Delete this trip?",
//     text: "This cannot be undone.",
//     confirmLabel: "Delete",
//     danger: true,                 // red button
//     onConfirm: () => deleteTrip()  // runs only if the user clicks the button
//   });

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

export function confirmAction(options) {
  let buttonColor = "maroon";
  if (options.danger) {
    buttonColor = "red";
  }

  modals.openConfirmModal({
    title: options.title,
    centered: true,
    children: <Text size="sm">{options.text}</Text>,
    labels: { confirm: options.confirmLabel, cancel: "Cancel" },
    confirmProps: { color: buttonColor },
    onConfirm: options.onConfirm
  });
}
