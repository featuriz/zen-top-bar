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
  <b>A modern GNOME Shell extension that intelligently hides the top bar to give you more screen real estate, while remaining instantly accessible.</b>
</p>

---

## 📖 Overview

**Zen Top Bar** brings an intelligent auto‑hide behavior to the GNOME top panel. When a window touches the top edge of the screen, the panel gracefully slides away, letting you focus on your work. Move your cursor to the very top of the screen, and the panel instantly returns—making it perfect for both mouse‑driven and keyboard‑centric workflows.

This extension is built from the ground up for **GNOME Shell 50**, using modern ES modules and the latest GNOME APIs. It is a lightweight, dependency‑free solution that respects your system’s performance and visual consistency.

---

## ✨ Features

| Feature                       | Description                                                                                                       |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| 🧠 **Smart Window Detection** | Panel hides automatically when any window is positioned against the top screen edge.                              |
| 🖱️ **Edge‑Triggered Reveal**  | Simply bump your cursor against the top screen edge (within 2 pixels) to show the panel.                          |
| 🖥️ **Full‑Screen Aware**      | Panel stays hidden in full‑screen applications and can be temporarily revealed with the same edge gesture.        |
| 📋 **Menu‑Safe**              | Panel remains visible while any system menu (clock, system tray, etc.) is open, preventing accidental hiding.     |
| ✨ **Smooth Animations**      | Fluid easing transitions provide a polished, native feel.                                                         |
| ⚡ **Performance Optimized**  | Minimal overhead; runs efficiently using debounced event listeners and low‑frequency polling only when necessary. |
| 🌍 **Wayland & X11 Ready**    | Fully compatible with both display servers.                                                                       |

---

## 🚀 Supported GNOME Versions

| Version            | Status                          |
| :----------------- | :------------------------------ |
| **GNOME 50**       | ✅ Fully supported and tested   |
| GNOME 47–49        | ✅ Compatible (limited testing) |
| GNOME 46           | ⚠️ May work with minor issues   |
| GNOME 45 and older | ❌ Not supported                |

> **Note:** This extension is actively maintained for **GNOME 50**. Future GNOME releases will be supported as soon as possible after their official release.

---

## 🧪 Tested Environments

The extension has been thoroughly tested in the following configurations:

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

1. Visit the extension page on **[extensions.gnome.org](https://extensions.gnome.org/extension/XXXXX/zen-top-bar/)** (link will be active after review).
2. Toggle the switch to **ON**.
3. The extension will install and activate automatically.

### Manual Installation (Latest .zip Release)

```bash
# Download the latest release
wget https://github.com/featuriz/zen-top-bar/releases/latest/download/zentopbar@featuriz.in.shell-extension.zip

# Install using gnome-extensions
gnome-extensions install zentopbar@featuriz.in.shell-extension.zip

# Enable the extension
gnome-extensions enable zentopbar@featuriz.in
```

Then restart GNOME Shell by pressing `Alt` + `F2`, typing `r`, and pressing `Enter`.

### Build from Source

```bash
git clone https://github.com/featuriz/zen-top-bar.git
cd zen-top-bar
make install
```

_(Requires `gettext` and `glib2` development tools.)_

---

## ⚙️ Configuration

Configuration is available through the **Extensions** application (or `gnome-extensions prefs zentopbar@featuriz.in`):

| Setting                | Description                                    | Default |
| :--------------------- | :--------------------------------------------- | :------ |
| **Animation Duration** | Speed of the show/hide animation (in seconds). | `0.2`   |

> Additional settings (e.g., mouse sensitivity, full‑screen behavior) may be added in future releases.

---

## 🛠️ Building from Source

To build the extension manually:

```bash
# Clone the repository
git clone https://github.com/featuriz/zen-top-bar.git
cd zen-top-bar

# Compile GSettings schema
glib-compile-schemas schemas/

# Create a distributable ZIP archive
make zip
```

The resulting `.shell-extension.zip` file can be installed via the `gnome-extensions` tool or uploaded to the GNOME Extensions website.

---

## 🐛 Troubleshooting

| Symptom                                                | Solution                                                                                                                                             |
| :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel does not hide when a window touches the top      | Ensure no system menu is open. Some applications (e.g., terminals with custom title bars) may not trigger detection. Try moving the window slightly. |
| Panel does not appear when cursor touches the top edge | Move the cursor all the way to the screen edge. If using a multi‑monitor setup, ensure the cursor is on the primary display.                         |
| Extension fails to load after GNOME Shell restart      | Check the log with `journalctl -f -o cat /usr/bin/gnome-shell`. Look for errors containing `zentopbar`.                                              |
| Panel flickers when a menu is open                     | This is a known GNOME Shell behavior; the extension includes mitigations but minor flicker may still occur in some themes.                           |

If problems persist, please [report a bug](https://github.com/featuriz/zen-top-bar/issues/new?template=bug_report.md).

---

## 🤝 Contributing

Contributions are warmly welcomed! Whether it’s a bug report, a feature request, or a pull request, your input helps make Zen Top Bar better.

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgments

- Inspired by the excellent [Hide Top Bar](https://gitlab.gnome.org/tuxor1337/hidetopbar) extension by tuxor1337.
- Built with the [GNOME Shell Extension Guide](https://gjs.guide/extensions/) and modern ES module patterns.
- Thanks to the GNOME community for continuous support and feedback.

---

<p align="center">
  <sub>Made with ❤️ for the GNOME community</sub>
</p>
