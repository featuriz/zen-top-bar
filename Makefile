#
# all: compile-schemas
#
# compile-schemas:
# 	glib-compile-schemas schemas/
#
# zip: compile-schemas
#
UUID = zentopbar@featuriz.in
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
ZIP_NAME = $(UUID).shell-extension.zip

.PHONY: all install clean zip

all: zip

zip:
	gnome-extensions pack --force \
		--extra-source=extension.js \
		--extra-source=convenience.js \
		--extra-source=intellihide.js \
		--extra-source=panelVisibilityManager.js \
		--extra-source=prefs.js \
		--extra-source=metadata.json \
		--extra-source=LICENSE \
		--extra-source=schemas \
		--out-dir=. \
		.

install: zip
	@echo "Installing extension to $(EXT_DIR)"
	mkdir -p $(EXT_DIR)
	unzip -q $(ZIP_NAME) -d $(EXT_DIR)

clean:
	rm -f $(ZIP_NAME) schemas/gschemas.compiled
	rm -rf $(EXT_DIR)
	@echo "Extension uninstalled. Please restart GNOME Shell."
