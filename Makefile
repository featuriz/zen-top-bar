UUID = zentopbar@featuriz.in
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
ZIP_NAME = $(UUID).shell-extension.zip

.PHONY: all install clean zip

all: zip

zip:
	gnome-extensions pack --force \
		--extra-source=extension.js \
		--extra-source=metadata.json \
		--extra-source=panelVisibilityManager.js \
		--extra-source=prefs.js \
		--extra-source=utils.js \
		--extra-source=schemas \
		--extra-source=LICENSE \
		--out-dir=. \
		.

install: zip
	@echo "Installing extension to $(EXT_DIR)"
	gnome-extensions install $(ZIP_NAME) --force

clean:
	rm -f $(ZIP_NAME) schemas/gschemas.compiled
	rm -rf $(EXT_DIR)
	@echo "Extension uninstalled. Please restart GNOME Shell."

test: clean install
	dbus-run-session gnome-shell --devkit --wayland
