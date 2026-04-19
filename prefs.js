import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class ZenTopBarPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: _("General"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("Appearance"),
      description: _("Configure the appearance of the extension"),
    });
    page.add(group);

    // Visibility
    const row = new Adw.SwitchRow({
      title: _("Visibility"),
      subtitle: _("Whether to show the panel (topbar)"),
    });
    group.add(row);

    // Panel Position
    const panelPositionRow = new Adw.SpinRow({
      title: _("Panel Position"),
      subtitle: _(
        "0 = top, 100 = bottom. Based on screen height. For testing only.",
      ),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 100,
        step_increment: 1,
      }),
      snap_to_ticks: true,
    });
    group.add(panelPositionRow);

    // Create a settings object and bind the row to the `show-indicator` key
    const settings = this.getSettings();
    settings.bind(
      "show-indicator",
      row,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    settings.bind(
      "panel-position",
      panelPositionRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
  }
}
