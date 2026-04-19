import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

import * as Convenience from "./convenience.js";

const DEBUG = Convenience.DEBUG;

export class Intellihide extends Signals.EventEmitter {
  constructor(settings, monitorIndex, panelHeight) {
    super();
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._panelHeight = panelHeight;
    this._overlaps = false;
    this._checkTimeoutId = 0;
    this._enabled = false;
    this._idleId = 0;

    this._signalsHandler = new Convenience.GlobalSignalsHandler();
    this._tracker = Shell.WindowTracker.get_default();

    // Map<MetaWindow, signalId[]> — tracked so we can clean up on destroy
    this._windowSignals = new Map();

    // Defer signal connections to ensure the shell is fully ready
    this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._idleId = 0;
      if (!this._signalsHandler) return GLib.SOURCE_REMOVE;

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

  get overlaps() {
    return this._overlaps;
  }

  updatePanelHeight(height) {
    this._panelHeight = height;
    this._checkOverlap();
  }

  updateMonitor(monitorIndex) {
    this._monitorIndex = monitorIndex;
    this._checkOverlap();
  }

  _onWindowCreated(display, win) {
    const id1 = win.connect("position-changed", this._checkOverlap.bind(this));
    const id2 = win.connect("size-changed", this._checkOverlap.bind(this));
    this._windowSignals.set(win, [id1, id2]);

    win.connect("unmanaged", () => this._removeWindowSignals(win));
    this._checkOverlap();
  }

  _removeWindowSignals(win) {
    const ids = this._windowSignals.get(win);
    if (ids) {
      for (const id of ids) {
        try {
          win.disconnect(id);
        } catch (e) {}
      }
      this._windowSignals.delete(win);
    }
  }

  _checkOverlap() {
    if (!this._enabled) return;

    // Debounce: cancel pending check and reschedule
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

    const topBoundary = monitor.y + this._panelHeight;
    let overlaps = false;
    const windows = global.get_window_actors();

    for (const actor of windows) {
      const win = actor.get_meta_window();
      if (!win || win.get_monitor() !== this._monitorIndex) continue;
      if (win.minimized) continue;
      if (!this._isWindowRelevant(win)) continue;

      const rect = win.get_frame_rect();
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
    const type = win.get_window_type();
    const handledTypes = [
      Meta.WindowType.NORMAL,
      Meta.WindowType.DIALOG,
      Meta.WindowType.MODAL_DIALOG,
      Meta.WindowType.UTILITY,
    ];
    if (!handledTypes.includes(type)) return false;
    if (win.is_skip_taskbar()) return false;

    // Both checks are required together:
    // - workspace index alone misses sticky/always-on-top windows
    // - showing_on_its_workspace() alone is unreliable for fullscreen windows
    //   and during workspace transitions — windows on other workspaces can
    //   incorrectly pass the filter, causing the panel to hide on the wrong workspace
    const activeWsIndex = global.workspace_manager.get_active_workspace_index();
    const winWorkspace = win.get_workspace();
    if (!winWorkspace || winWorkspace.index() !== activeWsIndex) return false;
    if (!win.showing_on_its_workspace()) return false;

    return true;
  }

  destroy() {
    // 1. Cancel pending idle before anything else
    if (this._idleId) {
      GLib.source_remove(this._idleId);
      this._idleId = 0;
    }

    // 2. Stop overlap checking timeout
    this.disable();

    // 3. Clean up per-window signals for all currently open windows
    for (const [win, ids] of this._windowSignals) {
      for (const id of ids) {
        try {
          win.disconnect(id);
        } catch (e) {}
      }
    }
    this._windowSignals.clear();

    // 4. Disconnect global signals
    if (this._signalsHandler) {
      this._signalsHandler.destroy();
      this._signalsHandler = null;
    }
  }
}
