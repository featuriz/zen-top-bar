import * as Main from "resource:///org/gnome/shell/ui/main.js";

export const DEBUG = (msg) => {
  if (false) console.log(`[ZenTopBar] ${msg}`);
};

/**
 * Helper to send a system notification for debugging states
 */
export function NOTIFY(message) {
  Main.notify("[ZenTopBar]", message);
}
