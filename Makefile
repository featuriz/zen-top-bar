UUID = zentopbar@featuriz.in
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all install clean

all: compile-schemas

compile-schemas:
	glib-compile-schemas schemas/

install: compile-schemas
	@echo "Installing extension to $(EXT_DIR)"
	mkdir -p $(EXT_DIR)
	cp -r extension.js metadata.json panelVisibilityManager.js intellihide.js convenience.js prefs.js $(EXT_DIR)/
	cp -r schemas $(EXT_DIR)/

clean:
	rm -f schemas/gschemas.compiled
	rm -rf $(EXT_DIR)
	@echo "Extension uninstalled. Please restart GNOME Shell."
