# iPhone port — implementation and installation

This is an experimental iOS port with a cloud-built unsigned device IPA, not a
physical-device-verified release.
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

The workflow `.github/workflows/ios.yml` supplies a cloud Mac. This task created
https://github.com/wisutwicpladda-droid/laab-iphone and started native validation.
See `VALIDATION.txt` for the observed result. Use **Actions > iPhone build > Run workflow**.

### Free Apple ID with a Windows computer

1. Run the workflow with `unsigned-ipa` and download the `laab-ios-unsigned-ipa`
   artifact after a successful run. Extract its `.ipa` on Windows.
2. Install Sideloadly from https://sideloadly.io/ and its documented Apple drivers.
3. Connect the iPhone over USB, unlock it, and trust the computer. Load the IPA in
   Sideloadly, select the phone and sign in with your Apple ID in that app.
4. Follow Sideloadly's installation and device-trust instructions. If iOS asks,
   enable Developer Mode. Free-account apps expire in seven days unless refreshed.

This avoids owning a Mac or buying Developer Program membership, but still needs
access to a Windows computer for signing/installing. The unsigned IPA does not
install by itself from Safari. This task has not installed Sideloadly, accessed an
Apple account, or connected to the phone. Do not send Apple credentials in chat.

### TestFlight (paid developer account)


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

If you cannot access a computer, someone must provide a signed distribution such
as a TestFlight invitation. No developer subscription or Apple upload has been
created on your behalf. The GitHub fork and CI run are the only remote changes.

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

Validation is recorded in `VALIDATION.txt`. Cloud Mac tests pass (129 Rust tests),
frontend checks pass (59 tests and production build), and a physical-device ARM64
iOS IPA was built successfully by run 42476363332:
https://github.com/wisutwicpladda-droid/laab-iphone/actions/runs/42476363332

The unsigned IPA's Mach-O platform is iOS (not Simulator), supported platform is
iPhoneOS, and minimum iOS version is 15.0. Native simulator UI validation is tracked separately in `VALIDATION.txt`.
The unsigned non-demo simulator app cannot read Keychain without a valid app
identity; a normal device install must be signed with the actual personal/team
profile. The account-free simulator UI smoke uses upstream's `LAAB_DEMO=1` with
fictional data. Demo mode never opens the normal encrypted data directory. No physical iPhone or real LINE login has
been verified. There is no generated Xcode project or signed IPA in the source
archive; the workflow generates the native project. `unsigned-ipa` makes a debug
build intended for testing/sideloading.

Test on an iPhone before relying on this port: cold launch; email/password login
and phone confirmation; session retention after relaunch; text sending/receiving;
attachments; keyboard in portrait/landscape; switching between LINE and LAAB.

Push notifications and continuous background sync are not implemented. iOS can
suspend the app when switching to LINE to confirm login. The desktop MCP bridge,
LIFF windows/devtools, Finder actions, clipboard images, and image scanning still
need mobile-specific implementations or runtime verification. HEIC conversion
currently falls back to the existing non-macOS path. This is an unofficial LINE
client; upstream's account-risk warning still applies.


## Porting and test notes

The iOS target must use `rusqlite/bundled-sqlcipher-vendored-openssl` so the
SQLCipher build receives its own target crypto headers and static library.
Adding a direct vendored openssl-sys dependency alone does not wire those headers
into libsqlite3-sys. Desktop-only dialog parent, window unminimize and macOS
window-chrome calls must be gated. pnpm's automatic dependency recheck is disabled
for script execution because Xcode sanitizes its build environment; dependencies
are still installed explicitly using the frozen lockfile first.

For this task's Windows setup, Sideloadly and the signed Apple Mobile Device
Support component were installed. The service started and USB device detection
was verified. Apple ID authentication is performed manually by the user.


Native simulator demo verification succeeded in run 42480994336:
https://github.com/wisutwicpladda-droid/laab-iphone/actions/runs/42480994336

The screenshot shows the real Tauri iOS app rendering sample chats, with its native
backend running in demo mode. This validates startup/UI/IPC, not a real LINE
session or a production Keychain identity. On Windows, the user manually reached
the iOS developer-profile trust prompt after signing/installing with Sideloadly;
physical launch confirmation is still pending.
