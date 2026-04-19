export const DEBUG = function (message) {
  // Set to true for debugging
  if (false) console.log(`[zentopbar] ${message}`);
};

export class GlobalSignalsHandler {
  constructor() {
    this._signals = {};
  }

  add(...args) {
    this._addSignals("generic", args);
  }

  addWithLabel(label, ...args) {
    this._addSignals(label, args);
  }

  _addSignals(label, elements) {
    if (!this._signals[label]) this._signals[label] = [];
    for (const element of elements) {
      const [object, event, callback] = element;
      if (!object) {
        console.warn(
          `[zentopbar] Cannot connect to null object for signal: ${event}`,
        );
        continue;
      }
      if (typeof object.connect !== "function") {
        console.warn(
          `[zentopbar] Object has no connect() for signal: ${event}`,
        );
        continue;
      }
      try {
        const id = object.connect(event, callback);
        this._signals[label].push([object, id]);
      } catch (e) {
        console.error(`[zentopbar] Failed to connect '${event}': ${e}`);
      }
    }
  }

  disconnectWithLabel(label) {
    if (this._signals[label]) {
      for (const [obj, id] of this._signals[label]) {
        try {
          obj.disconnect(id);
        } catch (e) {
          // Ignore errors during disconnect (object may already be destroyed)
        }
      }
      delete this._signals[label];
    }
  }

  destroy() {
    for (const label in this._signals) {
      this.disconnectWithLabel(label);
    }
  }
}
