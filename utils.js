import * as Main from "resource:///org/gnome/shell/ui/main.js";

export const DEBUG = (msg) => console.log(`[ZenTopBar] ${msg}`);

export class GlobalSignalsHandler {
  constructor() {
    this._signals = [];
  }

  add(object, signal, callback) {
    let id = object.connect(signal, callback);
    this._signals.push({ object, id });
    return id;
  }

  destroy() {
    for (let signal of this._signals) {
      signal.object.disconnect(signal.id);
    }
    this._signals = [];
  }
}

/**
 * Helper to send a system notification for debugging states
 */
export function NOTIFY(message) {
  Main.notify("[ZenTopBar]", message);
}
