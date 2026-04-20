// --
// 0. INIT
// 1. Panel show and hide by settings
// 2. Panel position by settings
// 3. Monitors
// 4. Fix Notification problem
// 5. PANEL VISIBLE - based on window position
// 6. Barrier
//
// --
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Layout from "resource:///org/gnome/shell/ui/layout.js";
import { logErrorUnlessCancelled } from "resource:///org/gnome/shell/misc/errorUtils.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const MessageTray = Main.messageTray;
const PanelBox = Main.layoutManager.panelBox;

// Debounce for position/size-changed signals during window drag/resize.
const CHECK_DEBOUNCE_MS = 100;

const PRESSURE_THRESHOLD = 1;
const PRESSURE_TIMEOUT_MS = 1000;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._panelHeight = PanelBox.height || 30;
    this._signalsHandler = new GlobalSignalsHandler();
    this._originalUpdateState = MessageTray._updateState;

    // 5. Focused window tracking
    this._focusWin = null;
    this._checkDebounceId = 0;

    // 6. Pressure Barrier
    this._metaBarrier = null;
    this._pressureBarrier = null;

    // Defer setup to ensure shell is fully ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._setup();
      this._fixNotification();
      this._trackFocusWindow();
      this._setupPressureBarrier(); // 6. Testing
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
        this._syncVisibility();
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

    Main.layoutManager.removeChrome(PanelBox); // Remove default panel
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: false, // Panel doesn't affect struts
      trackFullscreen: true, // Panel doesn't track fullscreen
    });
  }

  // 1. Sync visibility
  _syncVisibility() {
    PanelBox.visible = this._settings.get_boolean("show-indicator");
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
    if (PanelBox.translation_y >= 0) {
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
    MessageTray._updateState = () => {
      this._originalUpdateState.call(MessageTray);

      if (MessageTray._bannerBin && PanelBox.visible) {
        // Adjust notifications so they don't overlap the floating panel
        const isTopHalf =
          PanelBox.translation_y < Main.layoutManager.primaryMonitor.height / 2;
        MessageTray._bannerBin.margin_top = isTopHalf
          ? Math.max(0, PanelBox.translation_y + PanelBox.height)
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
    if (!this._focusWin || this._focusWin.is_destroyed?.()) {
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
      DEBUG("HIDE");
      this._syncPanel(false);
    } else {
      DEBUG("SHOW");
      this._syncPanel(true);
    }
    DEBUG(
      `Fullscreen: ${isFS}, Is Maximized: ${isMax}, Y: ${rect.y}, Panel Height: ${this._panelHeight}`,
    );
  }

  // 6. Pressure Barrier
  _setupPressureBarrier() {
    DEBUG("...SETUP BARRIERS...");
    this._teardownPressureBarrier();
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return;
    this._metaBarrier = new Meta.Barrier({
      backend: global.backend,
      x1: monitor.x,
      x2: monitor.x + monitor.width - 1,
      y1: monitor.y + 1,
      y2: monitor.y + 1,
      directions:
        Meta.BarrierDirection.POSITIVE_Y | Meta.BarrierDirection.NEGATIVE_Y,
    });
    this._pressureBarrier = new Layout.PressureBarrier(
      PRESSURE_THRESHOLD,
      Shell.PressureBarrierTimeout,
      Shell.ActionMode.NORMAL,
    );
    this._pressureBarrier.addBarrier(this._metaBarrier);
    this._pressureBarrier.connect("trigger", () => {
      this._onBarrierHit();
    });
  }

  // 6.x
  _teardownPressureBarrier() {
    DEBUG("...CLEAR BARRIERS...");
    if (this._metaBarrier) {
      if (this._pressureBarrier)
        this._pressureBarrier.removeBarrier(this._metaBarrier);
      this._metaBarrier.destroy();
      this._metaBarrier = null;
    }
    if (this._pressureBarrier) {
      this._pressureBarrier.destroy();
      this._pressureBarrier = null;
    }
  }

  // 6.1
  _onBarrierHit() {
    DEBUG("Barrier hit!");
  }

  // -- Helpers  --
  // 5.1.1
  _syncPanel(show) {
    let targetY;

    if (show) {
      // Calculate the actual "Show" target based on your settings
      const position = this._settings.get_int("panel-position");
      const monitor = Main.layoutManager.monitors[this._monitorIndex];
      if (!monitor || typeof this._panelHeight !== "number") {
        return;
      }
      const maxY = monitor.height - this._panelHeight;
      targetY = (maxY * position) / 100;
    } else {
      const isTopHalf =
        PanelBox.translation_y < Main.layoutManager.primaryMonitor.height / 2;
      targetY = isTopHalf
        ? -this._panelHeight
        : Main.layoutManager.primaryMonitor.height;
    }
    // Now the guard works perfectly regardless of the slider position
    if (Math.abs(PanelBox.translation_y - targetY) < 0.1) return;

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

  // Animate panel
  async _transition(targetY) {
    try {
      PanelBox.remove_all_transitions();
      await PanelBox.easeAsync({
        translation_y: targetY,
        duration: 250,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      });
    } catch (e) {
      logErrorUnlessCancelled(e);
    }
  }

  destroy() {
    if (this._checkDebounceId) {
      GLib.source_remove(this._checkDebounceId);
      this._checkDebounceId = 0;
    }

    this._teardownPressureBarrier();
    this._signalsHandler.destroy();

    if (MessageTray._bannerBin) {
      MessageTray._bannerBin.margin_top = 0;
    }
    MessageTray._updateState = this._originalUpdateState;

    this._monitorIndex = null;
    this._focusWin = null;
    // -- Settings are handled by system. So ignored here

    this._settings.set_boolean("show-indicator", true);
    this._settings.set_int("panel-position", 0);
    PanelBox.visible = true;
    PanelBox.translation_y = 0;

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: true,
      trackFullscreen: true,
    });

    DEBUG("---ZEN TOP BAR DESTROYED---");
  }
}
