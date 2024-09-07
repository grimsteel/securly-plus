#!/bin/bash

shopt -s extglob

targets=("chrome" "firefox")

rm -rf build/

for target in ${targets[@]}; do
  echo "Building target $target"
  
  mkdir -p build/$target/
  
  # copy normal files
  cp -r src/!(manifest*.json) build/$target/

  # merge manifests
  jq -s '.[0] * .[1]' src/manifest.json src/manifest.$target.json > build/$target/manifest.json
done
