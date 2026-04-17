import Gio from "gi://Gio";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { GlobalSignalsHandler, DEBUG, NOTIFY } from "./utils.js";

const PanelBox = Main.layoutManager.panelBox;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;

    this._signalsHandler = new GlobalSignalsHandler();

    this._settingsBind = this._settings.bind(
      "show-indicator",
      PanelBox,
      "visible",
      Gio.SettingsBindFlags.DEFAULT,
    );

    this._settings.connect("changed::show-indicator", (settings, key) => {
      DEBUG(`${key} = ${settings.get_value(key).print(true)}`);
    });

    this._signalsHandler.add(this._settings, "changed::show-indicator", () =>
      this._onToggleShowNotification(),
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

  destroy() {
    if (this._settingsBind) {
      this._settingsBind.unbind();
      this._settingsBind = null;
    }

    this._signalsHandler.destroy();
    this._signalsHandler = null;

    this._monitorIndex = null;
    // -- Settings are handled by system. So ignored here

    this._settings.set_boolean("show-indicator", true); // UI reset

    DEBUG("---ZEN TOP BAR DESTROYED---");
  }
}
