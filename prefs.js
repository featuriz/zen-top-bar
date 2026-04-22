import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class ZenTopBarPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

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
    const visibilityGroup = new Adw.PreferencesGroup({
      title: _("Visibility"),
      description: _("Configure the visibility of the extension"),
    });
    page.add(appearanceGroup);
    page.add(settingsGroup);
    page.add(visibilityGroup);

    // -- Appearance --
    // Visibility
    const visibilityRow = new Adw.SwitchRow({
      title: _("Visibility"),
      subtitle: _("Whether to show the panel (topbar)"),
    });

    // Panel Position
    const panelPositionRow = new Adw.SpinRow({
      title: _("Panel Position"),
      subtitle: _("0 = top, 100 = bottom. Based on screen height."),
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
        lower: 20,
        upper: 500,
        step_increment: 20,
      }),
      snap_to_ticks: true,
    });
    settingsGroup.add(hideDebounceRow);
    settingsGroup.add(hideMarginRow);
    settingsGroup.add(checkDebounceRow);

    // Visuals
    const animationTimeRow = new Adw.SpinRow({
      title: _("Animation Time (ms)"),
      subtitle: _("Time in milliseconds for panel show/hide slide animations"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 2000,
        step_increment: 50,
      }),
      snap_to_ticks: true,
    });
    // Panel Color
    const colorRow = new Adw.ActionRow({
      title: _("Panel Color"),
      subtitle: _("The background color of the top panel"),
    });
    const colorDialog = new Gtk.ColorDialog();
    const colorButton = new Gtk.ColorDialogButton({
      dialog: colorDialog,
      valign: Gtk.Align.CENTER,
    });
    const rgba = new Gdk.RGBA();
    if (rgba.parse(settings.get_string("panel-color"))) {
      colorButton.rgba = rgba;
    }
    colorButton.connect("notify::rgba", () => {
      settings.set_string("panel-color", colorButton.rgba.to_string());
    });
    colorRow.add_suffix(colorButton);
    colorRow.activatable_widget = colorButton;
    visibilityGroup.add(animationTimeRow);
    visibilityGroup.add(colorRow);

    // Create a settings object and bind the row to the `show-indicator` key
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

    settings.bind(
      "animation-time-ms",
      animationTimeRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
  }
}
