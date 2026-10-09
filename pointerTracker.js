// Replacement for resource:///org/gnome/shell/ui/pointerWatcher.js,
// which was removed in GNOME Shell 51. Uses Meta.CursorTracker's
// "position-invalidated" signal (available via global.backend since
// GNOME Shell 48), throttled to mimic the old polling interval.
import GLib from "gi://GLib";

export class PointerTracker {
  /**
   * @param {number} minIntervalMs - minimum time between callbacks
   * @param {(x: number, y: number) => void} callback
   */
  constructor(minIntervalMs, callback) {
    this._interval = minIntervalMs;
    this._callback = callback;
    this._tracker = global.backend.get_cursor_tracker();
    this._timeoutId = 0;
    this._pending = false;

    this._signalId = this._tracker.connect("position-invalidated", () =>
      this._onInvalidated(),
    );
  }

  _onInvalidated() {
    if (this._timeoutId) {
      // Inside the throttle window: remember to emit once more at its end.
      this._pending = true;
      return;
    }
    this._emit();
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      this._interval,
      () => {
        this._timeoutId = 0;
        if (this._pending) {
          this._pending = false;
          this._emit();
        }
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  _emit() {
    const [x, y] = global.get_pointer();
    this._callback(x, y);
  }

  destroy() {
    if (this._signalId) {
      this._tracker.disconnect(this._signalId);
      this._signalId = 0;
    }
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
    this._pending = false;
    this._tracker = null;
    this._callback = null;
  }
}
