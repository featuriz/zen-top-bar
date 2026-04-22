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

    const appearanceGroup = new Adw.PreferencesGroup({
      title: _("Appearance"),
      description: _("Configure the appearance of the extension"),
    });
    const settingsGroup = new Adw.PreferencesGroup({
      title: _("Settings"),
      description: _("Configure the behavior of the extension"),
    });
    page.add(appearanceGroup);
    page.add(settingsGroup);

    // -- Appearance --
    // Visibility
    const visibilityRow = new Adw.SwitchRow({
      title: _("Visibility"),
      subtitle: _("Whether to show the panel (topbar)"),
    });

    // Panel Position
    const panelPositionRow = new Adw.SpinRow({
      title: _("Panel Position"),
      subtitle: _(
        "0 = top, 100 = bottom.\n Based on screen height. For testing only.",
      ),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 100,
        step_increment: 1,
      }),
      snap_to_ticks: true,
    });
    appearanceGroup.add(visibilityRow);
    appearanceGroup.add(panelPositionRow);

    // -- Settings --
    // Hide Debounca Time (ms)
    const hideDebounceRow = new Adw.SpinRow({
      title: _("Hide Delay (ms)"),
      subtitle: _("How long the panel stays visible after the cursor leaves"),
      adjustment: new Gtk.Adjustment({
        lower: 100,
        upper: 2000,
        step_increment: 50,
      }),
      snap_to_ticks: true,
    });
    // Hide Margin (px)
    const hideMarginRow = new Adw.SpinRow({
      title: _("Hide Margin (px)"),
      subtitle: _(
        "The distance the cursor can move away before the panel hides",
      ),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 500,
        step_increment: 5,
      }),
      snap_to_ticks: true,
    });
    const checkDebounceRow = new Adw.SpinRow({
      title: _("Check Interval (ms)"),
      subtitle: _(
        "Lower values increase responsiveness; higher values save CPU",
      ),
      adjustment: new Gtk.Adjustment({
        lower: 10,
        upper: 500,
        step_increment: 10,
      }),
      snap_to_ticks: true,
    });
    settingsGroup.add(hideDebounceRow);
    settingsGroup.add(hideMarginRow);
    settingsGroup.add(checkDebounceRow);

    // Create a settings object and bind the row to the `show-indicator` key
    const settings = this.getSettings();
    settings.bind(
      "show-indicator",
      visibilityRow,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    settings.bind(
      "panel-position",
      panelPositionRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    settings.bind(
      "hide-debounce-ms",
      hideDebounceRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    settings.bind(
      "hide-margin-px",
      hideMarginRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );

    settings.bind(
      "check-debounce-ms",
      checkDebounceRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
  }
}
