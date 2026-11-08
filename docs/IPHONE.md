# iPhone port — implementation and installation

This is an experimental source port, not a released or device-verified iOS app.
The upstream snapshot is recorded in `UPSTREAM_COMMIT.txt`.

## What changed

- Apple Keychain database key retrieval now includes iOS. SQLCipher remains enabled;
  OpenSSL is built for the iOS target instead of linking a Mac Homebrew library.
- App data uses Tauri's iOS sandbox path. Desktop updater, process and window-state
  plugins and permissions are excluded from mobile builds.
- macOS-only window chrome calls are platform gated.
- iPhone layout shows the chat list or a conversation, with Back and Send buttons,
  safe-area padding, and keyboard viewport sizing. Email/password login is selected
  initially because an iPhone cannot scan a QR displayed on its own screen.
- Albums, media and calendar commands navigate inside the main view on mobile.

## Only have an iPhone: build on GitHub's Mac runner

The workflow `.github/workflows/ios.yml` supplies a cloud Mac. It is prepared but
has **not been run** in this workspace. Put these changes into your own GitHub fork
(including the hidden `.github` folder), then use **Actions > iPhone build > Run workflow**.

1. Start with `simulator`. It runs the frontend tests, macOS Rust tests, iOS Rust
   compilation, and then attempts an iOS simulator app build. Its ZIP **cannot be
   installed on a physical iPhone**. Resolve any native errors reported by this run
   before proceeding to distribution.
2. For a signed device build, enroll in the Apple Developer Program and register
   your own app identifier and app record. Add repository variable `IOS_BUNDLE_ID`
   with that identifier; do not try to claim upstream's `tech.softnetics.laab`.
3. Add repository Actions secrets `APPLE_DEVELOPMENT_TEAM`, `APPLE_API_ISSUER`,
   `APPLE_API_KEY` (key ID, not the private key), and `APPLE_API_PRIVATE_KEY`
   (the downloaded `.p8` file's contents). Tauri documents automatic signing using
   an App Store Connect API key. Keep these in GitHub Secrets, never in source/chat.
4. Run the workflow with `signed-ipa`. The artifact contains an App Store Connect
   IPA if signing/build succeeds. The workflow does **not** upload it to Apple.
5. The IPA must then be uploaded to your app record in App Store Connect using an
   authenticated Mac/cloud runner, processed by Apple, and assigned to TestFlight
   testers. Open the resulting invitation in TestFlight on the iPhone. Downloading
   an App Store IPA to Files or Safari alone does not install it.

Without a signing account or someone providing a signed TestFlight build, there
is no installable native app from this deliverable. No developer subscription,
remote repository, build, or upload has been created on your behalf.

Official references:
- https://v2.tauri.app/start/prerequisites/#ios
- https://v2.tauri.app/distribute/sign/ios/
- https://v2.tauri.app/distribute/app-store/

## If a Mac becomes available

Install Xcode, accept its license, install Node 24, pnpm 11.25.0, Rust and XcodeGen.
From `desktop/`:

```sh
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
pnpm install --frozen-lockfile
pnpm tauri ios init
pnpm tauri ios dev --open
```

Choose your signing team and connected iPhone in Xcode. Use a unique bundle ID in
`src-tauri/tauri.ios.conf.json`. Keep macOS builds on `scripts/build-desktop.sh`.

## Validation and limitations

Local Windows validation is recorded in `VALIDATION.txt`. Neither Rust/iOS native
compilation nor real LINE login has been verified here. There is no generated
Xcode project or signed IPA in this source archive; the Mac workflow generates it.

Test on an iPhone before relying on this port: cold launch; email/password login
and phone confirmation; session retention after relaunch; text sending/receiving;
attachments; keyboard in portrait/landscape; switching between LINE and LAAB.

Push notifications and continuous background sync are not implemented. iOS can
suspend the app when switching to LINE to confirm login. The desktop MCP bridge,
LIFF windows/devtools, Finder actions, clipboard images, and image scanning still
need mobile-specific implementations or runtime verification. HEIC conversion
currently falls back to the existing non-macOS path. This is an unofficial LINE
client; upstream's account-risk warning still applies.
