#!/bin/bash

# Configuration
EXTENSION_NAME="Node Validator"
MANIFEST_PATH="manifest.json"
HTML_PATH="./public/panel.html"
CHANGELOG_PATH="CHANGELOG.md"

# Exit on error
set -e

# Function to increment version number
increment_version() {
  local version=$1
  local major=$(echo "$version" | cut -d. -f1)
  local minor=$(echo "$version" | cut -d. -f2)
  local patch=$(echo "$version" | cut -d. -f3)
  
  patch=$((patch + 1))
  
  if [ "$patch" -gt 9 ]; then
    patch=0
    minor=$((minor + 1))
  fi
  
  if [ "$minor" -gt 9 ]; then
    minor=0
    major=$((major + 1))
  fi
  
  echo "$major.$minor.$patch"
}

# Get current commit message (excluding [skip ci] if present)
COMMIT_MESSAGE=$(git log -1 --pretty=%B | sed 's/\[skip ci\]//g' | xargs)

# Update version in manifest
CURRENT_VERSION=$(jq -r '.version' "$MANIFEST_PATH")
NEW_VERSION=$(increment_version "$CURRENT_VERSION")

# Update manifest version
jq --arg new_version "$NEW_VERSION" '.version = $new_version' "$MANIFEST_PATH" > temp.json && mv temp.json "$MANIFEST_PATH"

# Update version in HTML file if it exists
if [ -f "$HTML_PATH" ]; then
  sed -i "s|<span class=\"version\">v[0-9]\+\.[0-9]\+\.[0-9]\+</span>|<span class=\"version\">v$NEW_VERSION</span>|g" "$HTML_PATH"
fi

# Update changelog
if [ ! -f "$CHANGELOG_PATH" ]; then
  echo "# Changelog" > "$CHANGELOG_PATH"
  echo "" >> "$CHANGELOG_PATH"
  echo "All notable changes to this project will be documented in this file." >> "$CHANGELOG_PATH"
  echo "" >> "$CHANGELOG_PATH"
fi

# Add new version entry to changelog
{
  echo "## [$NEW_VERSION] - $(date +%Y-%m-%d)"
  echo "- $COMMIT_MESSAGE"
  echo ""
  cat "$CHANGELOG_PATH"
} > temp_changelog.md && mv temp_changelog.md "$CHANGELOG_PATH"

# Create extensions directory and version directory
EXTENSIONS_DIR="extensions"
VERSION_DIR="$EXTENSIONS_DIR/v$NEW_VERSION"
mkdir -p "$VERSION_DIR"

# Set zip file path in version directory
ZIP_FILE="$VERSION_DIR/$EXTENSION_NAME.zip"

# Remove old zip if exists
if [ -f "$ZIP_FILE" ]; then
  rm -f "$ZIP_FILE"
fi

echo "Creating extension package..."
echo "Target: $ZIP_FILE"

# Create zip from root directory
zip -r -v "$ZIP_FILE" \
    manifest.json \
    src/background \
    src/content \
    src/panel \
    src/utils \
    public/images \
    public/styles \
    public/*.html \
    lib \
    || { echo "Error: Zip creation failed"; exit 1; }

echo "Extension package created successfully at: $ZIP_FILE"

# Verify zip contents
unzip -l "$ZIP_FILE"

# Configure git
git config --global user.name "GitHub Actions"
git config --global user.email "actions@github.com"

# Stage and commit changes including extensions
git add manifest.json
git add "$HTML_PATH"
git add "$CHANGELOG_PATH"
git add -f "$ZIP_FILE"
git commit -m "Auto-update: Version $NEW_VERSION [skip ci]" || echo "No changes to commit"