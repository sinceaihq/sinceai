#!/bin/bash
# Fast software WebGL for the campus twin's QA on a GPU-less Debian/Ubuntu server, without root:
# downloads Mesa's lavapipe (Vulkan) + EGL packages with apt-get download and unpacks them under
# ~/mesa-local. gpu.mjs then launches Chromium on lavapipe (≈7× faster frames than SwiftShader,
# pixel-identical output). Override the location with TWIN_MESA=<dir>/root.
set -euo pipefail
DIR=${TWIN_MESA_DIR:-$HOME/mesa-local}
mkdir -p "$DIR/debs" "$DIR/root"
cd "$DIR/debs"
apt-get download mesa-vulkan-drivers libvulkan1 libegl-mesa0 libegl1 libwayland-client0 libwayland-server0 \
  libx11-xcb1 libxcb-dri3-0 libxcb-present0 libxcb-sync1 libxshmfence1 libxcb-randr0 libxcb-shm0 libxcb-xfixes0
for d in *.deb; do dpkg -x "$d" "$DIR/root"; done
LIB="$DIR/root/usr/lib/x86_64-linux-gnu"
cat > "$DIR/lvp_icd.json" <<JSON
{ "ICD": { "api_version": "1.4.305", "library_path": "$LIB/libvulkan_lvp.so" }, "file_format_version": "1.0.0" }
JSON
cat > "$DIR/50_mesa.json" <<JSON
{ "file_format_version": "1.0.0", "ICD": { "library_path": "$LIB/libEGL_mesa.so.0" } }
JSON
echo "Mesa ready in $DIR — gpu.mjs uses it automatically (TWIN_GL=lavapipe|llvmpipe|swiftshader to choose)."
