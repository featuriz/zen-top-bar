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

    page.add(group);
    window.add(page);
  }
}
