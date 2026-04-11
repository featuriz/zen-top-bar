import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class ZenTopBarPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
      title: "Behavior",
    });

    // Animation time
    const animationRow = new Adw.ActionRow({
      title: "Animation duration",
      subtitle: "Time in seconds for show/hide animations",
    });
    const animationSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0.0,
        upper: 2.0,
        step_increment: 0.1,
      }),
      digits: 1,
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "animation-time",
      animationSpin,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
    animationRow.add_suffix(animationSpin);
    group.add(animationRow);

    // Intellihide threshold
    const thresholdRow = new Adw.ActionRow({
      title: "Hide threshold",
      subtitle:
        "Distance from top (as fraction of screen height) to trigger hide",
    });
    const thresholdSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0.01,
        upper: 0.5,
        step_increment: 0.01,
      }),
      digits: 2,
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "intellihide-threshold",
      thresholdSpin,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
    thresholdRow.add_suffix(thresholdSpin);
    group.add(thresholdRow);

    page.add(group);
    window.add(page);
  }
}
