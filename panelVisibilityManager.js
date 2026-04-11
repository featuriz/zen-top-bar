import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Clutter from "gi://Clutter";
import Shell from "gi://Shell";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import * as Convenience from "./convenience.js";
import { Intellihide } from "./intellihide.js";

const DEBUG = Convenience.DEBUG;
const PanelBox = Main.layoutManager.panelBox;
const MessageTray = Main.messageTray;

export class PanelVisibilityManager {
  constructor(settings, monitorIndex) {
    this._settings = settings;
    this._monitorIndex = monitorIndex;
    this._baseY = PanelBox.y;
    this._panelHeight = PanelBox.height;
    this._animationActive = false;
    this._preventHide = false;
    this._mouseWatchId = 0;
    this._menuOpen = false;
    this._isFullscreen = false;

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: false,
      trackFullscreen: true,
    });

    this._oldTween = MessageTray._tween;
    MessageTray._tween = (actor, statevar, value, params) => {
      params.y += PanelBox.y < 0 ? 0 : this._panelHeight;
      this._oldTween.apply(MessageTray, arguments);
    };

    this._intellihide = new Intellihide(settings, monitorIndex);
    this._intellihide.connect("overlap-changed", (obj, overlaps) => {
      this._handleIntellihideChange(overlaps);
    });

    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._bindSettingsChanges();
      this._bindUIChanges();
      this._intellihide.enable();
      return GLib.SOURCE_REMOVE;
    });
  }

  _handleIntellihideChange(overlaps) {
    DEBUG(`overlap changed: ${overlaps}`);
    if (overlaps) {
      this.hide(this._getAnimationTime(), "intellihide");
    } else {
      this.show(this._getAnimationTime(), "intellihide");
    }
  }

  _getAnimationTime() {
    return this._settings.get_double("animation-time");
  }

  hide(duration, trigger) {
    DEBUG(`hide(${trigger})`);
    if (this._preventHide || this._animationActive) return;

    if (Main.panel.menuManager.activeMenu) {
      this._menuOpen = true;
      return;
    }

    this._stopMouseWatch();
    this._animationActive = true;

    PanelBox.ease({
      y: this._baseY - this._panelHeight,
      duration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this._animationActive = false;
        if (this._intellihide.overlaps || this._isFullscreen) {
          this._startMouseWatch();
        }
      },
    });
  }

  show(duration, trigger) {
    DEBUG(`show(${trigger})`);
    if (this._animationActive) {
      PanelBox.remove_all_transitions();
    }

    this._stopMouseWatch();
    this._animationActive = true;
    PanelBox.show();

    PanelBox.ease({
      y: this._baseY,
      duration,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this._animationActive = false;
        this._checkMouseAfterShow();
      },
    });
  }

  _checkMouseAfterShow() {
    const [x, y] = global.get_pointer();
    const threshold = this._panelHeight + 10;
    if (y > threshold && !this._isMouseOverPanel(x, y)) {
      this.hide(this._getAnimationTime(), "mouse-left");
    } else {
      this._startMouseWatch();
    }
  }

  _isMouseOverPanel(x, y) {
    return (
      y >= this._baseY &&
      y < this._baseY + this._panelHeight &&
      x >= PanelBox.x &&
      x < PanelBox.x + PanelBox.width
    );
  }

  _startMouseWatch() {
    if (this._mouseWatchId) return;
    this._mouseWatchId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
      this._handleMouseMove();
      return GLib.SOURCE_CONTINUE;
    });
  }

  _stopMouseWatch() {
    if (this._mouseWatchId) {
      GLib.source_remove(this._mouseWatchId);
      this._mouseWatchId = 0;
    }
  }

  _handleMouseMove() {
    if (this._animationActive) return;

    const [x, y] = global.get_pointer();

    // Use fixed pixel thresholds for precise edge detection
    const SHOW_THRESHOLD_PX = 2;
    const HIDE_THRESHOLD_PX = this._panelHeight + 10;

    if (Main.panel.menuManager.activeMenu) {
      if (!this._menuOpen) {
        this._menuOpen = true;
        this.show(0, "menu-open");
      }
      return;
    } else {
      this._menuOpen = false;
    }

    const panelVisible = PanelBox.y >= this._baseY;

    if (!panelVisible) {
      if (y < SHOW_THRESHOLD_PX) {
        this.show(this._getAnimationTime(), "mouse-edge");
      }
    } else {
      if (y > HIDE_THRESHOLD_PX && !this._isMouseOverPanel(x, y)) {
        if (this._intellihide.overlaps || this._isFullscreen) {
          this.hide(this._getAnimationTime(), "mouse-left");
        }
      }
    }
  }

  _bindUIChanges() {
    this._signalsHandler = new Convenience.GlobalSignalsHandler();
    this._signalsHandler.add(
      [
        global.display,
        "window-created",
        (d, win) => this._onWindowCreated(win),
      ],
      [
        global.display,
        "window-left-monitor",
        () => this._updateFullscreenState(),
      ],
      [
        global.display,
        "window-entered-monitor",
        () => this._updateFullscreenState(),
      ],
      [
        Main.layoutManager,
        "monitors-changed",
        () => {
          this._baseY = PanelBox.y;
          this._panelHeight = PanelBox.height;
          this._intellihide.updateMonitor(Main.layoutManager.primaryIndex);
        },
      ],
      [
        Main.panel.menuManager,
        "notify::activeMenu",
        () => {
          if (Main.panel.menuManager.activeMenu) {
            this._menuOpen = true;
            this.show(0, "menu-open");
          } else {
            this._menuOpen = false;
            this._checkMouseAfterShow();
          }
        },
      ],
    );

    this._updateFullscreenState();
  }

  _onWindowCreated(win) {
    const id = win.connect("notify::fullscreen", () => {
      this._updateFullscreenState();
    });
    win._zenFullscreenSignal = id;
  }

  _updateFullscreenState() {
    const monitor = Main.layoutManager.monitors[this._monitorIndex];
    this._isFullscreen = monitor?.inFullscreen || false;

    if (this._isFullscreen) {
      this.hide(this._getAnimationTime(), "fullscreen");
    } else {
      this._handleIntellihideChange(this._intellihide.overlaps);
    }
  }

  _bindSettingsChanges() {
    this._settingsHandler = new Convenience.GlobalSignalsHandler();
    this._settingsHandler.addWithLabel(
      "settings",
      [this._settings, "changed::animation-time", () => {}],
      [
        this._settings,
        "changed::intellihide-threshold",
        () =>
          this._intellihide.setThreshold(
            this._settings.get_double("intellihide-threshold"),
          ),
      ],
    );
  }

  destroy() {
    this._stopMouseWatch();
    this._intellihide.destroy();
    if (this._signalsHandler) this._signalsHandler.destroy();
    if (this._settingsHandler) this._settingsHandler.destroy();

    MessageTray._tween = this._oldTween;

    Main.layoutManager.removeChrome(PanelBox);
    Main.layoutManager.addChrome(PanelBox, {
      affectsStruts: true,
      trackFullscreen: true,
    });

    this.show(0, "destroy");
  }
}
