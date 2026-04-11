// panelVisibilityManager.js
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PointerWatcher from "resource:///org/gnome/shell/ui/pointerWatcher.js";

export class PanelVisibilityManager {
  constructor(panel, settings) {
    this._panel = panel;
    this._settings = settings;
    this._panelBox = Main.layoutManager.panelBox;

    this._hovering = false;
    this._updateId = 0;
    this._signals = new Map();

    this._pointerWatcher = PointerWatcher.getPointerWatcher();
    this._initPanelVisibility();
  }

  _initPanelVisibility() {
    // Remove panel from normal layout and add as floating chrome
    Main.layoutManager.removeChrome(this._panelBox);
    Main.layoutManager.addTopChrome(this._panelBox, { affectsStruts: false });

    // Set up the PointerWatcher for a reliable hover trigger
    this._setupPointerWatcher();

    // Connect to relevant signals
    this._addSignal(global.display, "notify::focus-window", () =>
      this._queueUpdate(),
    );
    this._addSignal(global.window_manager, "size-change", () =>
      this._queueUpdate(),
    );
    this._addSignal(Main.overview, "showing", () => this._queueUpdate());
    this._addSignal(Main.overview, "hiding", () => this._queueUpdate());
  }

  _setupPointerWatcher() {
    const primaryMonitor = Main.layoutManager.primaryMonitor;
    this._pointerWatch = this._pointerWatcher.addWatch(
      primaryMonitor.width,
      {
        x: primaryMonitor.x,
        y: primaryMonitor.y,
        width: primaryMonitor.width,
        height: 5, // A generous 5px hot zone at the top
      },
      (x, y) => {
        const isHovering = y >= primaryMonitor.y && y < primaryMonitor.y + 5;
        if (isHovering !== this._hovering) {
          this._hovering = isHovering;
          this._queueUpdate();
        }
      },
    );
  }

  _addSignal(object, signal, callback) {
    if (object && typeof object.connect === "function") {
      const id = object.connect(signal, callback);
      this._signals.set(id, object);
    }
  }

  _queueUpdate() {
    if (this._updateId) GLib.source_remove(this._updateId);
    this._updateId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
      this._updateVisibility();
      this._updateId = 0;
      return GLib.SOURCE_REMOVE;
    });
  }

  _updateVisibility() {
    let shouldBeVisible = false;

    if (this._hovering) {
      shouldBeVisible = true;
    } else {
      const overviewVisible = Main.overview.visible;
      const panelMenuActive = Main.panel.menuManager.activeMenu !== null;
      const appMenu = Main.panel.statusArea.appMenu;
      const appMenuOpen =
        appMenu && appMenu._appMenu && appMenu._appMenu.isOpen;

      if (overviewVisible || panelMenuActive || appMenuOpen) {
        shouldBeVisible = true;
      } else {
        const win = global.display.get_focus_window();
        if (!win || win.minimized) {
          shouldBeVisible = true;
        } else {
          const isMaximized = win.maximized_vertically;
          const frame = win.get_frame_rect();
          const monitor = Main.layoutManager.primaryMonitor;
          if (isMaximized || frame.y <= monitor.y + 10) {
            shouldBeVisible = false;
          } else {
            shouldBeVisible = true;
          }
        }
      }
    }

    this._animatePanel(shouldBeVisible);
  }

  _animatePanel(show) {
    this._panelBox.remove_all_transitions();
    const targetY = show ? 0 : -this._panelBox.height;
    if (this._panelBox.translation_y === targetY) return;

    this._panelBox.ease({
      translation_y: targetY,
      duration: 200,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });
  }

  destroy() {
    if (this._updateId) GLib.source_remove(this._updateId);
    for (const [id, object] of this._signals) {
      object.disconnect(id);
    }
    this._signals.clear();

    if (this._pointerWatch) {
      this._pointerWatcher._removeWatch(this._pointerWatch);
      this._pointerWatch = null;
    }

    Main.layoutManager.removeChrome(this._panelBox);
    Main.layoutManager.addChrome(this._panelBox, { affectsStruts: true });
    this._panelBox.remove_all_transitions();
    this._panelBox.translation_y = 0;
  }
}
