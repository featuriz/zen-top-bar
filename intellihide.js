import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

import * as Convenience from "./convenience.js";

const DEBUG = Convenience.DEBUG;

export const Intellihide = class Intellihide extends Signals.EventEmitter {
  constructor(settings, monitorIndex) {
    super();
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._overlaps = false;
    this._threshold = settings.get_double("intellihide-threshold"); // 0.1 = 10%
    this._checkTimeoutId = 0;
    this._enabled = false;

    this._signalsHandler = new Convenience.GlobalSignalsHandler();
    this._tracker = Shell.WindowTracker.get_default();

    // Defer signal connections to idle to ensure global objects are ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      if (this._signalsHandler) {
        this._signalsHandler.add(
          [global.display, "window-created", this._onWindowCreated.bind(this)],
          [global.display, "grab-op-end", this._checkOverlap.bind(this)],
          [global.display, "restacked", this._checkOverlap.bind(this)],
          [this._tracker, "notify::focus-app", this._checkOverlap.bind(this)],
          [
            global.workspace_manager,
            "notify::active-workspace",
            this._checkOverlap.bind(this),
          ],
        );
      }
      return GLib.SOURCE_REMOVE;
    });
  }

  enable() {
    this._enabled = true;
    this._checkOverlap();
  }

  disable() {
    this._enabled = false;
    if (this._checkTimeoutId) {
      GLib.source_remove(this._checkTimeoutId);
      this._checkTimeoutId = 0;
    }
  }

  setThreshold(value) {
    this._threshold = value;
    this._checkOverlap();
  }

  get overlaps() {
    return this._overlaps;
  }

  updateMonitor(monitorIndex) {
    this._monitorIndex = monitorIndex;
    this._checkOverlap();
  }

  _onWindowCreated(display, win) {
    // Connect to move/resize signals
    const id1 = win.connect("position-changed", this._checkOverlap.bind(this));
    const id2 = win.connect("size-changed", this._checkOverlap.bind(this));
    win._zenSignals = [id1, id2];
    win.connect("unmanaged", () => {
      if (win._zenSignals) {
        win.disconnect(win._zenSignals[0]);
        win.disconnect(win._zenSignals[1]);
        delete win._zenSignals;
      }
    });
    this._checkOverlap();
  }

  _checkOverlap() {
    if (!this._enabled) return;

    if (this._checkTimeoutId) {
      GLib.source_remove(this._checkTimeoutId);
    }
    this._checkTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
      this._doCheckOverlap();
      this._checkTimeoutId = 0;
      return GLib.SOURCE_REMOVE;
    });
  }

  _doCheckOverlap() {
    if (!this._enabled) return;

    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return;

    const screenHeight = monitor.height;
    const thresholdPixels = screenHeight * this._threshold; // 10% of screen height
    const topBoundary = monitor.y + thresholdPixels;

    let overlaps = false;
    const windows = global.get_window_actors();

    for (const actor of windows) {
      const win = actor.get_meta_window();
      if (!win || win.get_monitor() !== this._monitorIndex) continue;
      if (win.minimized) continue;
      if (!this._isWindowRelevant(win)) continue;

      const rect = win.get_frame_rect();
      // Check if window top edge is within threshold from screen top
      if (rect.y < topBoundary) {
        overlaps = true;
        break;
      }
    }

    if (overlaps !== this._overlaps) {
      this._overlaps = overlaps;
      this.emit("overlap-changed", overlaps);
    }
  }

  _isWindowRelevant(win) {
    // Skip desktop windows, docks, etc.
    const type = win.get_window_type();
    const handledTypes = [
      Meta.WindowType.NORMAL,
      Meta.WindowType.DIALOG,
      Meta.WindowType.MODAL_DIALOG,
      Meta.WindowType.UTILITY,
    ];
    if (!handledTypes.includes(type)) return false;

    // Skip windows that are skip-taskbar (like desktop icons)
    if (win.is_skip_taskbar()) return false;

    // Check workspace
    const activeWorkspace =
      global.workspace_manager.get_active_workspace_index();
    const winWorkspace = win.get_workspace();
    if (!winWorkspace || winWorkspace.index() !== activeWorkspace) return false;

    return true;
  }

  destroy() {
    this.disable();
    if (this._signalsHandler) this._signalsHandler.destroy();
  }
};
