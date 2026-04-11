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
import { PanelVisibilityManager } from "./panelVisibilityManager.js";

export default class ZenTopBarExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    // Pass the panel actor and settings to the manager
    this._visibilityManager = new PanelVisibilityManager(
      Main.panel,
      this._settings,
    );
  }

  disable() {
    // Clean up the manager
    if (this._visibilityManager) {
      this._visibilityManager.destroy();
      this._visibilityManager = null;
    }
    this._settings = null;
  }
}
