/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { PanelVisibilityManager } from "./panelVisibilityManager.js";
import * as Convenience from "./convenience.js";

const DEBUG = Convenience.DEBUG;

export default class ZenTopBarExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    console.log(`ZenTopBar: Initiating ${this.uuid}`);
  }

  enable() {
    DEBUG("enable()");
    this._settings = this.getSettings();
    this._monitorIndex = Main.layoutManager.primaryIndex;
    this._pvManager = new PanelVisibilityManager(
      this._settings,
      this._monitorIndex,
    );
  }

  disable() {
    DEBUG("disable()");
    if (this._pvManager) {
      this._pvManager.destroy();
      this._pvManager = null;
    }
    this._settings = null;
  }
}
