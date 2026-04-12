import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class ZenTopBarPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    // -------------------------------------------------------------------------
    // Behavior group
    // -------------------------------------------------------------------------

    const behaviorGroup = new Adw.PreferencesGroup({ title: "Behavior" });

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
    behaviorGroup.add(animationRow);

    // -------------------------------------------------------------------------
    // Appearance group
    // -------------------------------------------------------------------------

    const appearanceGroup = new Adw.PreferencesGroup({ title: "Appearance" });

    // --- Panel color ---------------------------------------------------------

    const colorRow = new Adw.ActionRow({
      title: "Panel color",
      subtitle: "Background color applied to the panel",
    });

    const colorDialog = new Gtk.ColorDialog({ modal: true });
    const colorButton = new Gtk.ColorDialogButton({
      dialog: colorDialog,
      valign: Gtk.Align.CENTER,
    });

    // Set initial color from stored hex
    const initialRgba = new Gdk.RGBA();
    initialRgba.parse(settings.get_string("panel-color"));
    colorButton.set_rgba(initialRgba);

    colorButton.connect("notify::rgba", (btn) => {
      const c = btn.get_rgba();
      const r = Math.round(c.red * 255)
        .toString(16)
        .padStart(2, "0");
      const g = Math.round(c.green * 255)
        .toString(16)
        .padStart(2, "0");
      const b = Math.round(c.blue * 255)
        .toString(16)
        .padStart(2, "0");
      settings.set_string("panel-color", `#${r}${g}${b}`);
    });

    // Keep the button in sync if settings change from outside (e.g. dconf)
    settings.connect("changed::panel-color", () => {
      const rgba = new Gdk.RGBA();
      rgba.parse(settings.get_string("panel-color"));
      colorButton.set_rgba(rgba);
    });

    colorRow.add_suffix(colorButton);
    appearanceGroup.add(colorRow);

    // --- Opacity when no windows overlap (clear) ------------------------------

    const clearRow = new Adw.ActionRow({
      title: "Opacity when clear",
      subtitle: "0.0 = fully transparent · 1.0 = fully solid",
    });
    const clearSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0.0,
        upper: 1.0,
        step_increment: 0.05,
      }),
      digits: 2,
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "panel-opacity-clear",
      clearSpin,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
    clearRow.add_suffix(clearSpin);
    appearanceGroup.add(clearRow);

    // --- Opacity when a window overlaps ---------------------------------------

    const overlapRow = new Adw.ActionRow({
      title: "Opacity when overlapped",
      subtitle: "Applied when a window is behind the panel",
    });
    const overlapSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0.0,
        upper: 1.0,
        step_increment: 0.05,
      }),
      digits: 2,
      valign: Gtk.Align.CENTER,
    });
    settings.bind(
      "panel-opacity-overlap",
      overlapSpin,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
    overlapRow.add_suffix(overlapSpin);
    appearanceGroup.add(overlapRow);

    // -------------------------------------------------------------------------
    // Assemble page
    // -------------------------------------------------------------------------

    const page = new Adw.PreferencesPage();
    page.add(behaviorGroup);
    page.add(appearanceGroup);
    window.add(page);
  }
}
