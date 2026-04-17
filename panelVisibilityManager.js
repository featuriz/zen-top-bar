import Gio from "gi://Gio";
import GLib from "gi://GLib";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const PanelBox = Main.layoutManager.panelBox;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._panelHeight = PanelBox.height;
    this._signalsHandler = new GlobalSignalsHandler();

    const initialPos = this._settings.get_int("panel-position");
    this._updatePanelPosition(initialPos);
    this._syncVisibility();

    // Defer setup to ensure shell is fully ready
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._setup();
      return GLib.SOURCE_REMOVE;
    });
  }

  _setup() {
    DEBUG("---ZEN TOP BAR INITIALIZED---");
    this._panelIndicatorId = this._signalsHandler.add(
      this._settings,
      "changed::show-indicator",
      (settings, key) => {
        DEBUG(`${key} = ${settings.get_value(key).print(true)}`);
        this._syncVisibility();
        this._onToggleShowNotification();
      },
    );

    this._panelPositionId = this._signalsHandler.add(
      this._settings,
      "changed::panel-position",
      (settings, key) => {
        this._updatePanelPosition(settings.get_int(key)); // usend type "n" in schema
      },
    );

    this._monitorId = this._signalsHandler.add(
      Main.layoutManager,
      "monitors-changed",
      this._onMonitorsChanged.bind(this),
    );
  }

  _onToggleShowNotification() {
    const stateText = this._isPanelVisible()
      ? "Action1 (Visible)"
      : "Action0 (Hidden)";
    NOTIFY(`Panel state changed to: ${stateText}`);
    DEBUG(`Panel state changed to: ${stateText}`);
  }

  _isPanelVisible() {
    return this._settings.get_boolean("show-indicator");
  }
  _syncVisibility() {
    PanelBox.visible = this._settings.get_boolean("show-indicator");
  }

  _onMonitorsChanged() {
    DEBUG("...MONITORS CHANGED...");
    this._panelHeight = PanelBox.height;
    this._monitorIndex = Main.layoutManager.primaryIndex;
    // Rebuild barrier geometry for the new monitor layout if panel is hidden.
    // if (!this._isPanelVisible()) {
    //   this._setupPressureBarrier();
    // }
  }

  _updatePanelPosition(position) {
    DEBUG("...UPDATING PANEL POSITION...");
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    if (!monitor) return;
    // Ensure the panel height is accounted for so it doesn't push off-screen at 100
    const panelHeight = PanelBox.get_height() || 30; // Fallback if height is 0 initially
    const maxY = monitor.height - panelHeight;
    const targetY = (maxY * position) / 100;
    // Move the panel
    PanelBox.translation_y = targetY;
  }

  destroy() {
    if (this._panelPositionId) {
      this._settings.disconnect(this._panelPositionId);
      this._panelPositionId = null;
    }
    if (this._panelIndicatorId) {
      this._settings.disconnect(this._panelIndicatorId);
      this._panelIndicatorId = null;
    }
    if (this._monitorId) {
      Main.layoutManager.disconnect(this._monitorId);
      this._monitorId = null;
    }

    this._monitorIndex = null;
    // -- Settings are handled by system. So ignored here

    this._settings.set_boolean("show-indicator", true);
    this._settings.set_int("panel-position", 0);
    PanelBox.visible = true;
    PanelBox.translation_y = 0;

    DEBUG("---ZEN TOP BAR DESTROYED---");
  }
}
