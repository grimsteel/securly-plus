#!/bin/bash

shopt -s extglob
set -e

targets=("chrome" "firefox")

rm -rf build/

version=$(jq ".version" package.json -r)

for target in ${targets[@]}; do
  echo "Building target $target"
  
  mkdir -p build/$target/
  
  # copy normal files
  cp -r src/!(manifest*.json) build/$target/

  # merge manifests
  jq -s '.[0] * .[1]' src/manifest.json src/manifest.$target.json > build/$target/manifest.json

  pushd build/$target/ > /dev/null
  # handle  $$VERSION$$
   sed -i "s/__VERSION__/$version/g" $(find . -type f)
  
  zip -q -r ../$target.zip .
  popd > /dev/null
done
