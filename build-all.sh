#!/bin/sh

# Rust toolchains
# Install nightly toolchain and architectures
# > rustup toolchain install nightly
# > rustup target add TARGETS

# ** For in-macOS build **
# For windows build, install mingw-w64 in macOS
# > brew install mingw-w64
# For linux build, install musl in macOS
# > brew install FiloSottile/musl-cross/musl-cross

# ** For in-Linux build **
# For windows build, install mingw-w64 in Linux
# > sudo apt install -y gdb-mingw-w64 gcc-mingw-w64-x86-64
# For linux build, install musl in Linux
# > sudo apt install -y musl-tools

set -x

TARGETS=(
	aarch64-apple-darwin
	x86_64-pc-windows-gnu
	x86_64-unknown-linux-musl
	aarch64-unknown-linux-musl
)

export RUSTFLAGS="-Zlocation-detail=none"

for target in "${TARGETS[@]}"; do
	cargo +nightly build \
		-Z build-std-features=panic_immediate_abort \
		-Z build-std=std,panic_abort \
		--release \
		--target $target
done
