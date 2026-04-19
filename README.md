# Zen Top Bar

<p align="center">
  <img src="https://raw.githubusercontent.com/featuriz/zen-top-bar/main/assets/icon.png" alt="Zen Top Bar Icon" width="128"/>
</p>

<p align="center">
  <a href="https://extensions.gnome.org/extension/XXXXX/zen-top-bar/">
    <img src="https://img.shields.io/badge/Install%20from-extensions.gnome.org-4A86CF?style=for-the-badge&logo=gnome&logoColor=white" alt="Get it on GNOME Extensions">
  </a>
  <a href="https://github.com/featuriz/zen-top-bar/releases/latest">
    <img src="https://img.shields.io/github/v/release/featuriz/zen-top-bar?style=for-the-badge&label=Latest%20Release&color=2EA043" alt="Latest Release">
  </a>
  <a href="https://github.com/featuriz/zen-top-bar/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT">
  </a>
</p>

<p align="center">
  <b>A modern GNOME Shell extension that intelligently hides the top bar and lets you customize its transparency and color — for a cleaner, more focused desktop.</b>
</p>

---

## 📖 Overview

**Zen Top Bar** brings intelligent auto-hide behavior and visual customization to the GNOME top panel. When a window touches the top edge of the screen, the panel gracefully slides away so you can focus on your work. Move your cursor to the very top of the screen and the panel instantly returns.

On top of that, the panel adapts its transparency based on whether a window is behind it — fully transparent on a clear desktop, and semi-solid when a window is present, keeping the panel readable at all times.

Built from the ground up for **GNOME Shell 50** using modern ES modules, proper signal lifecycle management, and the latest GNOME APIs. Lightweight, dependency-free, and memory-safe.

---

## Screenshots

<div style="display: flex; overflow-x: auto; gap: 10px;">
  <img src="screenshots/01-before.png" width="300" alt="Before">
  <img src="screenshots/02-installed_active.png" width="300" alt="Installed and Active">
  <img src="screenshots/03-on_window_position-topbar_hidden.png" width="300" alt="On window positioned, topar hides">
  <img src="screenshots/04-on_window_position-topbar_visible_on_mouse.png" width="300" alt="Reveal topbar by mouse trigger">
  <img src="screenshots/05-fullscreen_window_topbar_hidden.png" width="300" alt="Full-Screen window topbar hidden">
  <img src="screenshots/06-fullscreen_window_topbar_visible.png" width="300" alt="Full-Screen window topbar visible by mouse">
  <img src="screenshots/07-settings.png" width="300" alt="Settings">
</div>

---

## ✨ Features

| Feature                       | Description                                                                                                                                |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| 🧠 **Smart Window Detection** | Panel hides automatically when any window is positioned against the top screen edge.                                                       |
| 🎨 **Panel Color**            | Set a custom background color for the panel.                                                                                               |
| 💧 **Adaptive Transparency**  | Panel is fully transparent on a clear desktop, and becomes opaque when a window is behind it — both values are independently configurable. |
| 🖱️ **Edge-Triggered Reveal**  | Bump your cursor against the top edge (within 2 px) to show the panel.                                                                     |
| 🖥️ **Full-Screen Aware**      | Panel stays hidden in full-screen applications.                                                                                            |
| 📋 **Menu-Safe**              | Panel stays visible while any system menu is open, preventing accidental hiding.                                                           |
| ✨ **Smooth Animations**      | Fluid easing transitions with configurable duration.                                                                                       |
| ⚡ **Performance Optimized**  | Event-driven pointer watching (no polling), debounced overlap checks, and proper signal/resource cleanup.                                  |
| 🌍 **Wayland & X11**          | Fully compatible with both display servers.                                                                                                |

---

## 🚀 Supported GNOME Versions

| Version            | Status                          |
| :----------------- | :------------------------------ |
| **GNOME 50**       | ✅ Fully supported and tested   |
| GNOME 47–49        | ✅ Compatible (limited testing) |
| GNOME 46           | ⚠️ May work with minor issues   |
| GNOME 45 and older | ❌ Not supported                |

---

## 🧪 Tested Environments

| Distribution        | GNOME Version | Windowing System | Status              |
| :------------------ | :------------ | :--------------- | :------------------ |
| Arch Linux          | 50.4          | Wayland          | ✅ Fully functional |
| Arch Linux          | 50.4          | X11              | ✅ Fully functional |
| Fedora 42           | 50.0          | Wayland          | ✅ Fully functional |
| Ubuntu 25.04        | 50.1          | Wayland          | ✅ Fully functional |
| openSUSE Tumbleweed | 50.2          | Wayland          | ✅ Fully functional |

If you encounter issues on a different setup, please [open an issue](https://github.com/featuriz/zen-top-bar/issues).

---

## 📦 Installation

### Recommended: Via GNOME Extensions Website

1. Visit the extension page on **[extensions.gnome.org](https://extensions.gnome.org/extension/XXXXX/zen-top-bar/)**.
2. Toggle the switch to **ON**.
3. The extension installs and activates automatically.

### Manual Installation

```bash
# Download the latest release
wget https://github.com/featuriz/zen-top-bar/releases/latest/download/zentopbar@featuriz.in.shell-extension.zip

# Install
gnome-extensions install zentopbar@featuriz.in.shell-extension.zip

# Enable
gnome-extensions enable zentopbar@featuriz.in
```

### Build from Source

```bash
git clone https://github.com/featuriz/zen-top-bar.git
cd zen-top-bar
make install
```

---

## ⚙️ Configuration

Open the **Extensions** app or run:

```bash
gnome-extensions prefs zentopbar@featuriz.in
```

### Behavior

| Setting                | Description                                       | Default |
| :--------------------- | :------------------------------------------------ | :------ |
| **Animation Duration** | Speed of the show/hide slide animation (seconds). | `0.2`   |

### Appearance

| Setting                     | Description                                                   | Default   |
| :-------------------------- | :------------------------------------------------------------ | :-------- |
| **Panel Color**             | Background color of the panel (`#rrggbb`).                    | `#000000` |
| **Opacity when clear**      | Panel opacity when no window is behind it. `0.0` = invisible. | `0.0`     |
| **Opacity when overlapped** | Panel opacity when a window is behind the panel.              | `0.85`    |

> **Tip:** Setting "Opacity when clear" to `0.0` makes the panel completely invisible on a clean desktop — the wallpaper shows through fully. The panel only becomes visible when a window pushes against the top edge or your cursor reaches the screen edge.

---

## 🐛 Troubleshooting

| Symptom                                                | Solution                                                                                                                            |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Panel does not hide when a window touches the top      | Ensure no system menu is open. Try moving the window slightly to trigger re-evaluation.                                             |
| Panel does not appear when cursor touches the top edge | Move the cursor all the way to the screen edge (within 2 px). On multi-monitor setups, ensure the cursor is on the primary display. |
| Panel is invisible and not responding                  | Your opacity settings may both be at `0.0`. Open prefs and raise "Opacity when clear".                                              |
| Extension fails to load after GNOME Shell restart      | Check logs: `journalctl -f -o cat /usr/bin/gnome-shell` and look for `zentopbar`.                                                   |
| Panel flickers when a menu is open                     | Known GNOME Shell behavior in some themes. The extension includes mitigations but minor flicker may still occur.                    |

If problems persist, please [report a bug](https://github.com/featuriz/zen-top-bar/issues/new?template=bug_report.md).

---

## 🤝 Contributing

Contributions are warmly welcomed — bug reports, feature requests, and pull requests all help.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m 'Add your feature'`.
4. Push: `git push origin feature/your-feature`.
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by [Hide Top Bar](https://gitlab.gnome.org/tuxor1337/hidetopbar) by tuxor1337.
- Built with the [GNOME Shell Extension Guide](https://gjs.guide/extensions/) and modern ES module patterns.
- Thanks to the GNOME community for continuous support and feedback.

---

<p align="center">
  <sub>Made with ❤️ for the GNOME community</sub>
</p>
