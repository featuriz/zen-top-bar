# TUT

---

## GJS

- https://gjs.guide/
- https://gjs.guide/guides/
- https://gjs.guide/extensions/

---

## XML

**schemas/org.gnome.shell.extensions.zen-top-bar.gschema.xml**

- https://docs.gtk.org/glib/gvariant-format-strings.html
- https://docs.gtk.org/glib/gvariant-format-strings.html#numeric-types

---

## The Library Mix-up

- **Libadwaita/GTK:** These are used for **Applications** (like the Preferences window you built in `prefs.js`).
- **St/Clutter:** These are used for the **Shell Interface** (the actual Top Bar, `PanelBox`, and `extension.js` logic).

---

## ADW

**UI**

- https://gnome.pages.gitlab.gnome.org/libadwaita/
- https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/widget-gallery.html

---

## PANELBOX

- https://gjs-docs.gnome.org/st17~17/st.boxlayout

**API references for `PanelBox`, use these:**

1.  **[St.BoxLayout (The class of PanelBox)](https://gjs-docs.gnome.org/st17~17/st.boxlayout):**
    This contains methods for layout, alignment, and adding children.
2.  **[Clutter.Actor (The base class)](https://gjs-docs.gnome.org/clutter17~17/clutter.actor):**
    This is where `x`, `y`, `opacity`, `visible`, and the `.ease()` animation methods live.
3.  **[GNOME Shell UI Source](https://gjs-docs.gnome.org/shell17~17/):**
    This is the JS documentation for the Shell's internal modules (like `Main`, `Panel`, and `LayoutManager`).

### The PanelBox API Map

Main.layoutManager.panelBox is technically a Shell.GenericContainer (which behaves like an St.BoxLayout in practice) that inherits from St.Widget → Clutter.Actor.

---

### Clean Programming Reference

Since you want a list of constants and methods for `PanelBox`, here is the "Developer's Reference" for a `Clutter.Actor` (which `PanelBox` is):

#### **Essential Methods**

| Method                           | Description                                                                   |
| :------------------------------- | :---------------------------------------------------------------------------- |
| `get_height()` / `get_width()`   | Returns the current allocated size.                                           |
| `set_position(x, y)`             | Moves the actor.                                                              |
| `add_child(actor)`               | Adds a new element inside the box.                                            |
| `remove_all_children()`          | Clears the box.                                                               |
| `raise_top()` / `lower_bottom()` | Changes the Z-stacking within the current layer.                              |
| `ease(props)`                    | The modern way to animate (e.g., `this.ease({ opacity: 0, duration: 500 })`). |

#### **Key Properties**

| Property        | Type             | Usage                                                                                            |
| :-------------- | :--------------- | :----------------------------------------------------------------------------------------------- |
| `y`             | `Number`         | Vertical coordinate.                                                                             |
| `visible`       | `Boolean`        | Toggles rendering and input.                                                                     |
| `opacity`       | `Number (0-255)` | Transparency level.                                                                              |
| `reactive`      | `Boolean`        | If `false`, mouse clicks pass through the panel to windows behind it.                            |
| `translation_y` | `Number`         | An offset from `y`. Great for "slide-up" animations without changing the actual layout position. |

-----------x-------
