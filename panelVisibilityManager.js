import Clutter from "gi://Clutter";
import GLib from "gi://GLib";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { logErrorUnlessCancelled } from "resource:///org/gnome/shell/misc/errorUtils.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const MessageTray = Main.messageTray;
const PanelBox = Main.layoutManager.panelBox;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._panelHeight = PanelBox.height || 30;
    this._signalsHandler = new GlobalSignalsHandler();
    this._originalUpdateState = MessageTray._updateState;

    // Defer setup to ensure shell is fully ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._setup();
      this._fixNotification();
      return GLib.SOURCE_REMOVE;
    });
  }

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

  // FIX NOTIFICATION - monkey patch
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
    // PanelBox.translation_y = targetY;
    this._transition(targetY);
  }

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

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: true,
      trackFullscreen: true,
    });

    DEBUG("---ZEN TOP BAR DESTROYED---");
  }
}
