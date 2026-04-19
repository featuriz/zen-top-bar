import GLib from "gi://GLib";
<<<<<<< HEAD

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const MessageTray = Main.messageTray;
=======
import Clutter from "gi://Clutter";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PointerWatcher from "resource:///org/gnome/shell/ui/pointerWatcher.js";

import * as Convenience from "./convenience.js";
import { Intellihide } from "./intellihide.js";

const DEBUG = Convenience.DEBUG;
>>>>>>> origin/main
const PanelBox = Main.layoutManager.panelBox;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
<<<<<<< HEAD
    this._panelHeight = PanelBox.height || 30;
    this._signalsHandler = new GlobalSignalsHandler();
    this._originalUpdateState = MessageTray._updateState;

    // Defer setup to ensure shell is fully ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._setup();
      this._fixNotification();
=======
    this._baseY = PanelBox.y;
    this._panelHeight = PanelBox.height;
    this._animationActive = false;
    this._panelAtRest = false;
    this._initIdleId = 0;
    this._overlapChangedId = 0;

    // Event-driven pointer watching
    this._pointerWatcher = PointerWatcher.getPointerWatcher();
    this._pointerListener = null;

    // Adjust panel chrome so it doesn't reserve strut space.
    // trackFullscreen: true lets GNOME handle fullscreen hiding automatically,
    // workspace-aware — no manual fullscreen tracking needed.
    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: false,
      trackFullscreen: true,
    });

    this._intellihide = new Intellihide(
      settings,
      monitorIndex,
      this._panelHeight,
    );
    this._overlapChangedId = this._intellihide.connect(
      "overlap-changed",
      (_obj, overlaps) => this._handleIntellihideChange(overlaps),
    );

    this._initIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._initIdleId = 0;
      this._bindSettingsChanges();
      this._bindUIChanges();
      this._intellihide.enable();
      this.show(0, "init");
>>>>>>> origin/main
      return GLib.SOURCE_REMOVE;
    });
  }

<<<<<<< HEAD
  _setup() {
    DEBUG("---ZEN TOP BAR INITIALIZED---");

    // When ready update panel height
    this._signalsHandler.add(PanelBox, "notify::allocation", () => {
      this._syncPanelHeight();
    });

    // Sync visibility from settings
    this._signalsHandler.add(
      this._settings,
      "changed::show-indicator",
      (settings, key) => {
        DEBUG(`${key} = ${settings.get_value(key).print(true)}`);
        this._syncVisibility();
        this._onToggleShowNotification();
      },
    );

    // Update panel position from settings
    this._signalsHandler.add(
      this._settings,
      "changed::panel-position",
      (settings, key) => {
        this._updatePanelPosition(settings.get_int(key));
      },
    );

    // Monitor changed - TODOS
    this._signalsHandler.add(Main.layoutManager, "monitors-changed", () => {
      this._onMonitorsChanged.bind(this);
      this._syncPanelHeight();
    });

    Main.layoutManager.removeChrome(PanelBox); // Remove default panel
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: false, // Panel doesn't affect struts
      trackFullscreen: true, // Panel doesn't track fullscreen
    });
  }

  // FIX NOTIFICATION
  _fixNotification() {
    DEBUG("--- APPLYING NOTIFICATION FIX ---");

    MessageTray._updateState = () => {
      // Execute original logic first to let the shell decide show/hide status
      this._originalUpdateState.call(MessageTray);

      if (MessageTray._bannerBin && PanelBox.visible) {
        if (
          PanelBox.translation_y <
          Main.layoutManager.primaryMonitor.height / 2
        ) {
          // If panel is in the top half, push notifications down by the panel's visual bottom
          MessageTray._bannerBin.margin_top =
            PanelBox.translation_y + PanelBox.height;
        } else {
          // If panel is in the bottom half, notifications stay at the very top (0)
          MessageTray._bannerBin.margin_top = 0;
        }

        DEBUG(`Adjusted Notification Y to: ${MessageTray._bannerBin.y}`);
      }
    };
  }

  _onToggleShowNotification() {
    const stateText = PanelBox.visible
      ? "Action1 (Visible)"
      : "Action0 (Hidden)";
    NOTIFY(`Panel state changed to: ${stateText}`);
    DEBUG(`Panel state changed to: ${stateText}`);
  }

  _syncVisibility() {
    PanelBox.visible = this._settings.get_boolean("show-indicator");
  }

  _syncPanelHeight() {
    if (
      PanelBox.visible &&
      PanelBox.height > 0 &&
      PanelBox.height !== this._panelHeight
    ) {
      this._panelHeight = PanelBox.height;
    }
  }

  _onMonitorsChanged() {
    DEBUG("...MONITORS CHANGED...");
    this._monitorIndex = Main.layoutManager.primaryIndex;
    // Safety check: Ensure the index is within the current monitors array
    if (this._monitorIndex >= Main.layoutManager.monitors.length) {
      this._monitorIndex = 0; // Fallback to first monitor if index is invalid
    }
  }

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
    // Move the panel
    PanelBox.translation_y = targetY;
  }

  destroy() {
    this._signalsHandler.destroy();

    if (MessageTray._bannerBin) {
      MessageTray._bannerBin.margin_top = 0;
    }
    MessageTray._updateState = this._originalUpdateState;

    this._monitorIndex = null;
    // -- Settings are handled by system. So ignored here

    this._settings.set_boolean("show-indicator", true);
    this._settings.set_int("panel-position", 0);
    PanelBox.visible = true;
    PanelBox.translation_y = 0;
=======
  // ---------------------------------------------------------------------------
  // Core show / hide
  // ---------------------------------------------------------------------------

  hide(duration, trigger) {
    DEBUG(`hide(${trigger})`);

    // Never hide while a panel menu is open
    if (Main.panel.menuManager.activeMenu) return;

    // Cancel any in-progress animation rather than dropping the request
    if (this._animationActive) {
      PanelBox.remove_all_transitions();
      this._animationActive = false;
    }

    this._panelAtRest = false;
    this._stopPointerWatch();
    this._animationActive = true;

    PanelBox.ease({
      y: this._baseY - this._panelHeight,
      duration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this._animationActive = false;
        // Start watching so mouse at top edge can reveal the panel
        this._startPointerWatch();
      },
    });
  }

  show(duration, trigger) {
    DEBUG(`show(${trigger})`);

    // Cancel any in-progress animation
    if (this._animationActive) {
      PanelBox.remove_all_transitions();
      this._animationActive = false;
    }

    this._panelAtRest = false;
    this._stopPointerWatch();
    this._animationActive = true;
    PanelBox.show();

    PanelBox.ease({
      y: this._baseY,
      duration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this._animationActive = false;
        this._panelAtRest = true;
        // Apply correct transparency now that panel is fully visible
        this._updatePanelStyle();
        // Start watching so we know when the mouse leaves the panel area
        this._startPointerWatch();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Transparency
  // ---------------------------------------------------------------------------

  _updatePanelStyle() {
    // Only apply style when the panel is fully visible and at rest (Option B).
    // Avoids visual glitches during the slide animation.
    if (!this._panelAtRest) return;

    const hex = this._settings.get_string("panel-color");
    const opacity = this._intellihide.overlaps
      ? this._settings.get_double("panel-opacity-overlap")
      : this._settings.get_double("panel-opacity-clear");

    const { r, g, b } = this._hexToRgb(hex);
    Main.panel.set_style(
      `background-color: rgba(${r}, ${g}, ${b}, ${opacity});`,
    );
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }; // Fallback to black on invalid hex
  }

  // ---------------------------------------------------------------------------
  // Pointer watching (event-driven via PointerWatcher, not a polling timer)
  // ---------------------------------------------------------------------------

  _startPointerWatch() {
    if (this._pointerListener) return;
    this._pointerListener = this._pointerWatcher.addWatch(
      10,
      this._handlePointer.bind(this),
    );
  }

  _stopPointerWatch() {
    if (this._pointerListener) {
      this._pointerWatcher._removeWatch(this._pointerListener);
      this._pointerListener = null;
    }
  }

  _handlePointer(x, y) {
    if (this._animationActive) return;
    if (Main.panel.menuManager.activeMenu) return;

    // Small tolerance for floating-point panel position
    const panelVisible = PanelBox.y >= this._baseY - 1;

    // How many px from the top edge trigger a show
    const SHOW_EDGE_PX = 2;
    // How many px below the panel bottom before we consider the mouse gone
    const HIDE_THRESHOLD_PX = this._panelHeight + 10;

    if (!panelVisible) {
      // Panel is hidden — reveal it when mouse touches the screen edge
      if (y <= SHOW_EDGE_PX) {
        this.show(this._getAnimationTime(), "mouse-edge");
      }
    } else {
      // Panel is visible — hide only if intellihide requires it and mouse left
      if (y > HIDE_THRESHOLD_PX && this._intellihide.overlaps) {
        this.hide(this._getAnimationTime(), "mouse-left");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Intellihide and fullscreen state
  // ---------------------------------------------------------------------------

  _handleIntellihideChange(overlaps) {
    DEBUG(`overlap changed: ${overlaps}`);
    if (overlaps) {
      this.hide(this._getAnimationTime(), "intellihide");
    } else {
      this.show(this._getAnimationTime(), "intellihide");
    }
  }

  // ---------------------------------------------------------------------------
  // Signal binding
  // ---------------------------------------------------------------------------

  _bindSettingsChanges() {
    this._settingsHandler = new Convenience.GlobalSignalsHandler();
    this._settingsHandler.addWithLabel(
      "settings",
      [this._settings, "changed::panel-color", () => this._updatePanelStyle()],
      [
        this._settings,
        "changed::panel-opacity-clear",
        () => this._updatePanelStyle(),
      ],
      [
        this._settings,
        "changed::panel-opacity-overlap",
        () => this._updatePanelStyle(),
      ],
    );
  }

  _bindUIChanges() {
    this._signalsHandler = new Convenience.GlobalSignalsHandler();
    this._signalsHandler.add(
      // Update geometry when monitors change
      [
        Main.layoutManager,
        "monitors-changed",
        () => {
          this._baseY = PanelBox.y;
          this._panelHeight = PanelBox.height;
          this._intellihide.updatePanelHeight(this._panelHeight);
          this._intellihide.updateMonitor(Main.layoutManager.primaryIndex);
        },
      ],
      // Update cached panel height if it changes (e.g. HiDPI scale changes)
      [
        PanelBox,
        "notify::height",
        () => {
          this._panelHeight = PanelBox.height;
          this._intellihide.updatePanelHeight(this._panelHeight);
        },
      ],
      // Always show panel when overview opens
      [
        Main.overview,
        "showing",
        () => this.show(this._getAnimationTime(), "overview-showing"),
      ],
      // Re-evaluate after overview closes
      [
        Main.overview,
        "hiding",
        () => this._handleIntellihideChange(this._intellihide.overlaps),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _getAnimationTime() {
    // Settings value is in seconds; Clutter ease() expects milliseconds
    return this._settings.get_double("animation-time") * 1000;
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy() {
    // 1. Cancel pending init idle to prevent callbacks after destroy
    if (this._initIdleId) {
      GLib.source_remove(this._initIdleId);
      this._initIdleId = 0;
    }

    // 2. Disconnect all global and settings signals — nothing should fire after this
    if (this._signalsHandler) {
      this._signalsHandler.destroy();
      this._signalsHandler = null;
    }
    if (this._settingsHandler) {
      this._settingsHandler.destroy();
      this._settingsHandler = null;
    }

    // 3. Stop pointer watching
    this._stopPointerWatch();

    // 4. Disconnect the overlap-changed listener, then destroy intellihide
    if (this._overlapChangedId) {
      this._intellihide.disconnect(this._overlapChangedId);
      this._overlapChangedId = 0;
    }
    this._intellihide.destroy();

    // 5. Restore panel style, position, and chrome
    Main.panel.set_style(null);
    PanelBox.remove_all_transitions();
    PanelBox.show();
    PanelBox.y = this._baseY;
>>>>>>> origin/main

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: true,
      trackFullscreen: true,
    });
<<<<<<< HEAD

    DEBUG("---ZEN TOP BAR DESTROYED---");
=======
>>>>>>> origin/main
  }
}
