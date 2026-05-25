# Installing Axis-AI

Axis-AI is currently in private beta. These instructions cover macOS, Windows, and Linux.

The app is not yet code-signed (saves us paying $170/yr in signing certificates during testing). This means your OS will warn you the first time you launch — see the bypass instructions per OS below. Once approved, subsequent launches and auto-updates are silent.

---

## macOS

### Pick your installer
- **Apple Silicon** (M1, M2, M3, M4): `Axis-AI_x.x.x_aarch64.dmg`
- **Intel Mac**: `Axis-AI_x.x.x_x64.dmg`

Not sure? Click Apple menu → About This Mac. If it says "Apple M…" you're on Silicon. If "Intel Core…" you're on Intel.

### Install steps

1. Download the `.dmg` from the [latest release](https://github.com/Shaykhouna/axis-ai/releases/latest)
2. Open the `.dmg`, drag **Axis-AI.app** into Applications
3. **First launch only:** macOS will show: *"Axis-AI.app cannot be opened because the developer cannot be verified."*
4. Click OK to dismiss
5. Open Finder → Applications → **right-click Axis-AI.app → Open**
6. macOS will show: *"macOS cannot verify the developer of Axis-AI…"* with **Open** button enabled
7. Click **Open**
8. Done — macOS remembers this and won't ask again

> [SCREENSHOT — macOS unverified dialog, with arrow pointing at Open button]

If you don't see an **Open** button (only Cancel), you may need to allow it from System Settings → Privacy & Security → scroll down → "Axis-AI was blocked…" → click **Open Anyway**.

---

## Windows

### Pick your installer
- `Axis-AI_x.x.x_x64-setup.exe` (recommended, handles install + uninstall)
- `Axis-AI_x.x.x_x64_en-US.msi` (alternative, same result)

### Install steps

1. Download the installer from the [latest release](https://github.com/Shaykhouna/axis-ai/releases/latest)
2. Double-click to launch
3. **Windows SmartScreen will block it**: *"Windows protected your PC"*
4. Click **More info** (small text under the title)
5. Click **Run anyway** (button appears after the More info click)
6. Follow the installer prompts — defaults are fine

> [SCREENSHOT — SmartScreen warning, with arrow at More info]
> [SCREENSHOT — Run anyway button]

If you don't see "Run anyway" at all, your system may have stricter SmartScreen settings. Open PowerShell → run:
```powershell
Unblock-File -Path "$HOME\Downloads\Axis-AI_x.x.x_x64-setup.exe"
```
Then re-run the installer.

---

## Linux

### Pick your installer
- **Universal**: `axis-ai_x.x.x_amd64.AppImage` (works on any distro)
- **Debian/Ubuntu**: `axis-ai_x.x.x_amd64.deb`

### Install — AppImage

```bash
chmod +x axis-ai_*.AppImage
./axis-ai_*.AppImage
```

### Install — .deb

```bash
sudo dpkg -i axis-ai_*.deb
# If dpkg complains about missing deps:
sudo apt-get install -f
```

Or just double-click the `.deb` in your file manager — most desktop environments will offer to install it.

---

## After install

### First-run setup
1. The app launches and shows the onboarding wizard
2. Walk through it (~2 minutes)
3. Optional: install Ollama for chat — `curl -fsSL https://ollama.com/install.sh | sh` then `ollama pull llama3.2:1b`

### Auto-updates
Axis-AI checks for updates on launch and offers to install them. You can also manually check from **Settings → Updates → Check for Updates**.

### Found a bug?
Click the feedback button (📩 in the nav) or open an issue at https://github.com/Shaykhouna/axis-ai/issues

### Want to nuke everything and start over?
- **macOS**: `rm -rf ~/Library/Application\ Support/app.axisai`
- **Linux**: `rm -rf ~/.config/app.axisai`
- **Windows**: `rmdir /s %APPDATA%\app.axisai`

---

## Troubleshooting

**"Axis-AI is damaged and can't be opened" on macOS:**
You probably skipped the right-click → Open step. Run this once in Terminal:
```bash
xattr -cr /Applications/Axis-AI.app
```
Then launch normally.

**Auto-update fails:**
Try Settings → Updates → Check for Updates manually. If it still fails, the next release usually includes the manual download link — reinstall from the release page.

**App won't launch / black screen:**
Run from terminal to see errors:
- macOS: `/Applications/Axis-AI.app/Contents/MacOS/Axis-AI`
- Linux AppImage: `./axis-ai_*.AppImage`
- Linux .deb: `axis-ai` (from any terminal)

Send the output to https://github.com/Shaykhouna/axis-ai/issues.