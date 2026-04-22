// --
// 0. INIT
// 1. Panel show and hide by settings
// 2. Panel position by settings
// 3. Monitors
// 4. Fix Notification problem
// 5. PANEL VISIBLE - based on window position
// 6. Pressure Barrier
// 7. Panel Menu - FIX
//
// --
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PointerWatcher from "resource:///org/gnome/shell/ui/pointerWatcher.js";
import { logErrorUnlessCancelled } from "resource:///org/gnome/shell/misc/errorUtils.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const MessageTray = Main.messageTray;
const PanelBox = Main.layoutManager.panelBox;

let _originalMessageTrayUpdateState = null;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._panelHeight = PanelBox.height || 30;
    this._signalsHandler = new GlobalSignalsHandler();

    // 5. Focused window tracking
    this._focusWin = null;
    this._checkDebounceId = 0;

    // 6. Pressure Barrier
    this._metaBarrier = null;
    this._pressureBarrier = null;
    this._userForced = false;
    this._pointerListener = null;
    this._hideDebounceId = 0;
    this._pressureWatchId = null;

    // Defer setup to ensure shell is fully ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._setup();
      this._fixNotification();
      this._trackFocusWindow();
      this._teardownPressureBarrier();
      return GLib.SOURCE_REMOVE;
    });
  }

  _setup() {
    DEBUG("---ZEN TOP BAR INITIALIZED---");

    // 0. When ready update panel height
    for (const pbs of ["notify::allocation", "notify::height"]) {
      this._signalsHandler.add(PanelBox, pbs, () => {
        this._syncPanelHeight();
      });
    }

    // 1. Sync visibility from settings
    this._signalsHandler.add(
      this._settings,
      "changed::show-indicator",
      (settings, key) => {
        DEBUG(`${key} = ${settings.get_value(key).print(true)}`);
        PanelBox.visible = this._settings.get_boolean("show-indicator");
        this._onToggleShowNotification();
      },
    );

    // 2. Update panel position from settings
    this._signalsHandler.add(
      this._settings,
      "changed::panel-position",
      (settings, key) => {
        this._updatePanelPosition(settings.get_int(key));
      },
    );

    // 3. Monitor changed - TODOS
    this._signalsHandler.add(Main.layoutManager, "monitors-changed", () => {
      this._onMonitorsChanged();
      this._syncPanelHeight();
      this._trackFocusWindow();
    });

    // 5. Focus changed
    this._signalsHandler.add(global.display, "notify::focus-window", () => {
      this._trackFocusWindow();
    });

    // -- SETTINGS --

    Main.layoutManager.removeChrome(PanelBox); // Remove default panel
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: false, // Panel doesn't affect struts
      trackFullscreen: true, // Panel tracks fullscreen
    });
  }

  // 1. Toggle show notification
  _onToggleShowNotification() {
    const stateText = PanelBox.visible
      ? "Action1 (Visible)"
      : "Action0 (Hidden)";
    NOTIFY(`Panel state changed to: ${stateText}`);
    DEBUG(`Panel state changed to: ${stateText}`);
  }

  // 2. Update panel position
  _updatePanelPosition(position) {
    DEBUG("...UPDATING PANEL POSITION...");
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    // Check if monitor exists and ensure panelHeight is a number
    if (!monitor || typeof this._panelHeight !== "number") {
      return;
    }
    // Ensure the panel height is accounted for so it doesn't push off-screen at 100
    const maxY = monitor.height - this._panelHeight;
    const targetY = (maxY * position) / 100;
    if (PanelBox.y >= 0) {
      this._transition(targetY);
    }
  }

  // 3. Monitor changed
  _onMonitorsChanged() {
    DEBUG("...MONITORS CHANGED...");
    this._monitorIndex = Main.layoutManager.primaryIndex;
    // Safety check: Ensure the index is within the current monitors array
    if (this._monitorIndex >= Main.layoutManager.monitors.length) {
      this._monitorIndex = 0; // Fallback to first monitor if index is invalid
    }
  }

  // 4. FIX NOTIFICATION - monkey patch
  _fixNotification() {
    DEBUG("--- APPLYING NOTIFICATION FIX ---");
    if (!_originalMessageTrayUpdateState) {
      _originalMessageTrayUpdateState = MessageTray._updateState;
    }

    MessageTray._updateState = () => {
      _originalMessageTrayUpdateState.call(MessageTray);

      if (MessageTray._bannerBin && PanelBox.visible) {
        // Adjust notifications so they don't overlap the floating panel
        const currentY = PanelBox.y;
        const monitor = Main.layoutManager.monitors[this._monitorIndex];
        const isTopHalf = currentY < monitor.height / 2;

        MessageTray._bannerBin.margin_top = isTopHalf
          ? Math.max(0, currentY + this._panelHeight)
          : 0;
      }
      DEBUG(`Adjusted Notification Y to: ${MessageTray._bannerBin.y}`);
    };
  }

  // 5. Track Focus Window
  _trackFocusWindow() {
    DEBUG("...TRACK FOCUS WINDOW...");
    // Disconnect signals from previous focused window
    if (this._focusWin) {
      this._signalsHandler.remove_by_obj(this._focusWin);
    }
    this._focusWin = global.display.focus_window;
    if (!this._focusWin) {
      this._syncPanel(true);
      return;
    }

    const checkWinBound = this._scheduleCheck.bind(this);

    ["position-changed", "size-changed"].forEach((sig) => {
      this._signalsHandler.add(this._focusWin, sig, checkWinBound);
    });
    this._signalsHandler.add(this._focusWin, "unmanaged", () => {
      this._signalsHandler.remove_by_obj(this._focusWin);
      this._focusWin = null;
      this._syncPanel(true);
    });
    // Manually run it once to sync the state immediately upon focus
    this._scheduleCheck();
  }

  // 5.1
  _checkWin() {
    DEBUG("...CHECK...");
    if (
      !this._focusWin ||
      this._focusWin.get_monitor() !== this._monitorIndex ||
      this._focusWin.is_destroyed?.()
    ) {
      this._userForced = false;
      this._syncPanel(true);
      return;
    }
    const rect = this._focusWin.get_frame_rect();
    const isFS = this._focusWin.fullscreen || this._focusWin.is_fullscreen();
    const isMax =
      this._focusWin.maximized_vertically &&
      this._focusWin.maximized_horizontally;
    const isNearTop = rect.y < this._panelHeight;

    if (isFS || isMax || isNearTop) {
      if (this._userForced) {
        DEBUG("HIDE BLOCKED BY USER FORCED");
        return;
      }
      DEBUG("HIDE");
      this._syncPanel(false);
      this._setupPressureBarrier();
    } else {
      DEBUG("SHOW");
      this._userForced = false;
      this._stopPointerWatch();
      this._syncPanel(true);
      this._teardownPressureBarrier();
    }
    DEBUG(
      `Fullscreen: ${isFS}, Is Maximized: ${isMax}, Y: ${rect.y}, Panel Height: ${this._panelHeight}`,
    );
  }

  // 6. Pressure Barrier
  _setupPressureBarrier() {
    DEBUG("...SETUP BARRIERS...");
    if (this._pressureWatchId) return;
    this._pressureWatchId = PointerWatcher.getPointerWatcher().addWatch(
      16,
      (x, y) => {
        const monitor = Main.layoutManager.monitors[this._monitorIndex];
        if (!monitor) return;
        const relativeY = y - monitor.y;
        // If mouse is within 1px of the top edge → trigger barrier hit
        if (relativeY <= 1 && !this._waitingForPressureHit) {
          this._waitingForPressureHit = true;
          this._onBarrierHit();
          // Debounce: don't retrigger for 500ms
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._waitingForPressureHit = false;
            return GLib.SOURCE_REMOVE;
          });
        }
      },
    );
  }

  // 6.x
  _teardownPressureBarrier() {
    DEBUG("...CLEAR BARRIERS...");
    if (this._pressureWatchId) {
      PointerWatcher.getPointerWatcher()._removeWatch(this._pressureWatchId);
      this._pressureWatchId = null;
    }
    this._waitingForPressureHit = false;
  }

  // 6.1
  _onBarrierHit() {
    DEBUG("Barrier hit!");
    this._teardownPressureBarrier();
    this._userForced = true;
    this._syncPanel(true);
    this._startPointerWatch();
  }

  // 6.2
  // -- POINTER WATCH --
  _startPointerWatch() {
    DEBUG("...START POINTER WATCH...");
    if (this._pointerListener) return;
    this._pointerListener = PointerWatcher.getPointerWatcher().addWatch(
      100,
      (_x, y) => this._onPointerMove(y),
    );
  }
  _stopPointerWatch() {
    DEBUG("...STOP POINTER WATCH...");
    if (this._pointerListener) {
      PointerWatcher.getPointerWatcher()._removeWatch(this._pointerListener);
      this._pointerListener = null;
    }
    this._clearHideDebounce();
  }
  _onPointerMove(y) {
    DEBUG("...ON POINTER MOVE...");
    // Safety guard: panel was hidden by some other path; stop watching.
    if (!PanelBox.visible) {
      this._stopPointerWatch();
      return;
    }

    // Menu is open → panel must stay visible, cancel any pending hide.
    if (Main.panel.menuManager.activeMenu) {
      this._clearHideDebounce();
      return;
    }
    const HIDE_MARGIN_PX = this._settings.get_int("hide-margin-px");
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return;
    const relativeY = y - monitor.y; // Normalize Y to the monitor's top edge

    if (relativeY < this._panelHeight + HIDE_MARGIN_PX) {
      DEBUG("--- MOUSE IN PANEL ---");
      // Mouse is in or near the panel area — cancel pending hide.
      this._clearHideDebounce();
    } else {
      DEBUG("--- MOUSE OUT OF PANEL ---");
      // Mouse has left the panel area — schedule a hide.
      this._startHideDebounce();
    }
  }
  _startHideDebounce() {
    // // -DEBUG("...START HIDE DEBOUNCE...");
    if (this._hideDebounceId) return; // already scheduled
    const HIDE_DEBOUNCE_MS = this._settings.get_int("hide-debounce-ms");
    this._hideDebounceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      HIDE_DEBOUNCE_MS,
      () => {
        DEBUG("...HIDE DEBOUNCE: INNER BLOCK...");
        this._hideDebounceId = 0;
        // FINAL RE-CHECK: If user moved back in or a menu opened, ABORT.
        if (this._isMouseInPanelArea() || Main.panel.menuManager.activeMenu) {
          DEBUG("--- HIDE ABORTED: Mouse returned or Menu open ---");
          return GLib.SOURCE_REMOVE;
        }

        DEBUG("--- HIDING PANEL ---");
        this._userForced = false;
        this._syncPanel(false);
        this._stopPointerWatch();
        this._setupPressureBarrier();
        return GLib.SOURCE_REMOVE;
      },
    );
  }
  _clearHideDebounce() {
    // // -DEBUG("...CLEAR HIDE DEBOUNCE...");
    if (this._hideDebounceId) {
      GLib.source_remove(this._hideDebounceId);
      this._hideDebounceId = 0;
    }
  }
  // -- POINTER WATCH END --

  // -- Helpers  --
  // 5.1.1
  _syncPanel(show) {
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return;
    const position = this._settings.get_int("panel-position");
    let targetY;

    if (show) {
      // Calculate the actual "Show" target based on your settings
      const maxY = monitor.height - this._panelHeight;
      targetY = monitor.y + (maxY * position) / 100;
    } else {
      const isTopHalf = PanelBox.y < monitor.y + monitor.height / 2;
      targetY = isTopHalf
        ? monitor.y - this._panelHeight
        : monitor.y + monitor.height;
    }
    // Now the guard works perfectly regardless of the slider position
    if (Math.abs(PanelBox.y - targetY) < 0.1) return;

    DEBUG(show ? `>>> SHOWING at ${targetY}` : `<<< HIDING at ${targetY}`);
    this._transition(targetY);
  }

  // Sync panel height
  _syncPanelHeight() {
    if (
      PanelBox.visible &&
      PanelBox.height > 0 &&
      PanelBox.height !== this._panelHeight
    ) {
      this._panelHeight = PanelBox.height;
    }
  }

  // DELAYED CHECK
  _scheduleCheck() {
    // // -DEBUG("...SCHEDULE CHECK...");
    if (this._checkDebounceId) {
      GLib.source_remove(this._checkDebounceId);
      this._checkDebounceId = 0;
    }
    const CHECK_DEBOUNCE_MS = this._settings.get_int("check-debounce-ms");
    this._checkDebounceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      CHECK_DEBOUNCE_MS,
      () => {
        // DEBUG("...SCHEDULE CHECK: INNER BLOCK...");
        this._checkWin(); // 5.1
        this._checkDebounceId = 0;
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  // Check if mouse is in panel area
  _isMouseInPanelArea() {
    const HIDE_MARGIN_PX = this._settings.get_int("hide-margin-px");
    const [, y] = global.get_pointer();
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return false;

    const relativeY = y - monitor.y;
    return relativeY < this._panelHeight + HIDE_MARGIN_PX;
  }

  // Animate panel
  async _transition(targetY) {
    try {
      PanelBox.remove_all_transitions();
      await PanelBox.easeAsync({
        y: targetY,
        duration: 250,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      });
    } catch (e) {
      logErrorUnlessCancelled(e);
    }
  }

  // -- SETTINGS --
  _updatePanelStyle() {
    const color = this._settings.get_string("panel-color");
    const opacity = this._settings.get_double("panel-opacity-overlap");
    Main.panel.set_style(`background-color: ${color}; opacity: ${opacity};`);
  }

  destroy() {
    if (this._checkDebounceId) {
      GLib.source_remove(this._checkDebounceId);
      this._checkDebounceId = 0;
    }

    this._signalsHandler.destroy();
    this._teardownPressureBarrier();
    this._stopPointerWatch();

    if (MessageTray._bannerBin) {
      MessageTray._bannerBin.margin_top = 0;
    }

    if (_originalMessageTrayUpdateState) {
      MessageTray._updateState = _originalMessageTrayUpdateState;
      // Optionally reset the tracker so it can be re-patched cleanly
      _originalMessageTrayUpdateState = null;
    }

    // -- Settings are handled by system. So ignored here

    this._settings.set_boolean("show-indicator", true);
    this._settings.set_int("panel-position", 0);
    PanelBox.visible = true;
    PanelBox.y = 0;

    // Reset at the end
    this._monitorIndex = null;
    this._focusWin = null;
    this._metaBarrier = null;
    this._pressureBarrier = null;
    this._userForced = false;
    this._pointerListener = null;
    this._clearHideDebounce();
    this._pressureWatchId = null;

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: true,
      trackFullscreen: true,
    });
    Main.layoutManager._queueUpdateRegions();

    DEBUG("---ZEN TOP BAR DESTROYED---");
  }
}
