# macOS Installer Build Guide

## Quick Start

### ARM64 (Apple Silicon - M1/M2/M3)
```bash
npm run build:mac:arm64
```

### Intel x64
```bash
npm run build:mac
```

### Universal (Intel + ARM)
```bash
npm run build:mac:universal
```

---

## Building for Different Architectures

### 1. ARM64 Only (Recommended for M-series Macs)
For building on or for Apple Silicon Macs:
```bash
npm run build:mac:arm64
```
- Output: `Aura-1.1.0-arm64.dmg`
- Size: ~200MB (optimized for ARM)
- Fastest performance on Apple Silicon

### 2. x64 Only (Intel Macs)
For Intel-based Macs:
```bash
npm run build:mac
```
- Output: `Aura-1.1.0.dmg`
- Default build when no architecture specified
- Supports Intel and older Apple Macs

### 3. Universal (Dual-Architecture)
Creates a single installer supporting both Intel and Apple Silicon:
```bash
npm run build:mac:universal
```
- Output: `Aura-1.1.0.dmg`
- Size: ~400MB (includes both architectures)
- Works on any Intel or Apple Silicon Mac
- **Note:** Requires proper code signing certificate

---

## System Requirements

### For Building
- **Node.js:** v18+
- **macOS:** 10.13+
- **Xcode Command Line Tools** (for code signing)

Install Xcode tools if needed:
```bash
xcode-select --install
```

### For Running
- **macOS:** 10.13+
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB+ free space

---

## Code Signing & Notarization

### Without Code Signing (Development)
The current setup allows building without signing certificates:
```json
"identity": null
```

This is fine for:
- Development and testing
- Internal distribution
- CI/CD pipelines

### With Code Signing (Distribution)

1. **Obtain a Certificate**
   - Developer Account: https://developer.apple.com
   - Certificate type: "Developer ID Application"

2. **Install Certificate**
   - Double-click `.cer` file to install in Keychain
   - Or use Xcode preferences

3. **Update package.json**
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAM_ID)"
   }
   ```

4. **Enable Hardened Runtime** (for App Store)
   ```json
   "hardenedRuntime": true,
   "gatekeeperAssess": true
   ```

---

## Troubleshooting

### ARM64 Build on Intel Mac
If building universal on Intel Mac:
```bash
npm run build:mac:universal
```
This cross-compiles for ARM64 automatically.

### "PROVISIONING_PROFILE not found"
- Remove code signing requirement: `"identity": null`
- Or install proper Xcode and certificates

### "better-sqlite3 native module failed"
This is automatically rebuilt via `npm install`:
```bash
npm run rebuild-native
```

If issues persist:
```bash
npm install
npm run rebuild-native
npm run build:mac:arm64
```

### Large DMG File
- ARM64 DMG should be ~200MB
- Universal DMG with both architectures ~400MB
- This is normal

---

## Distribution

### Local Testing
1. Download the `.dmg` file
2. Double-click to mount
3. Drag "Aura" to Applications folder
4. Launch from Applications

### Upload to Web Server
```bash
# After build completes
# Upload ./dist/Aura-1.1.0-arm64.dmg to your server
```

### Notarization (Recommended for Distribution)
To avoid "cannot be opened because the developer cannot be verified":

1. **Automatic notarization** (requires Apple ID):
   ```json
   "notarize": {
     "teamId": "TEAM_ID"
   }
   ```

2. **Manual process** if certificate-based:
   - Use `xcrun altool` or `notarytool`
   - Requires Developer ID Application certificate

---

## What's Included

The installer includes:
- ✅ Electron main process (precompiled for target architecture)
- ✅ React + TypeScript frontend (Vite bundled)
- ✅ SQLite database engine (better-sqlite3)
- ✅ All assets and localization files
- ✅ Node native modules (architecture-specific)

---

## Performance Notes

### Apple Silicon Performance
- ARM64 build: ~100% native performance
- Rosetta 2 emulation (running x64): ~80-90% performance
- **Recommendation:** Always use ARM64 build for M-series Macs

### Build Times
- ARM64 build: ~2-3 minutes
- x64 build: ~2-3 minutes
- Universal build: ~4-5 minutes (builds both architectures)

---

## Advanced: Custom Builds

### Build for Specific Architecture Only
```bash
# From command line with environment variable
ELECTRON_BUILDER_ARGS="--mac --arm64" npm run build:mac
```

### Skip Code Signing
```bash
electron-builder --mac --arm64 --sign-ignore="**/*.node"
```

### Generate ZIP Instead of DMG
```bash
# Edit package.json mac.target to include "zip"
electron-builder --mac --arm64 -t zip
```

---

## Files Generated

After successful build:
```
dist/
├── Aura-1.1.0-arm64.dmg     # ARM64 installer
├── Aura-1.1.0-arm64.zip     # ARM64 portable
└── latest-mac.yml           # Update manifest
```

---

## See Also
- [electron-builder documentation](https://www.electron.build/)
- [Apple Silicon support](https://support.apple.com/en-us/HT211238)
- [Code signing guide](https://www.electron.build/code-signing)
