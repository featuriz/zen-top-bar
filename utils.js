import * as Main from "resource:///org/gnome/shell/ui/main.js";

export const DEBUG = (msg) => {
  if (true) console.log(`[ZenTopBar] ${msg}`);
};

export class GlobalSignalsHandler {
  constructor() {
    this._signals = [];
  }

  add(object, signal, callback) {
    let id = object.connect(signal, callback);
    this._signals.push({ object, id });
    return id;
  }

  remove_by_obj(object) {
    this._signals = this._signals.filter((sig) => {
      if (sig.object === object) {
        try {
          sig.object.disconnect(sig.id);
        } catch (e) {
          // Object might already be destroyed/garbage collected
        }
        return false; // Remove from array
      }
      return true; // Keep in array
    });
  }

  destroy() {
    for (let signal of this._signals) {
      try {
        signal.object.disconnect(signal.id);
      } catch (e) {}
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
