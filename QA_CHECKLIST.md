# QA Checklist for iOS App Store Release

## Core Gameplay
- [ ] Survival mode: Aircraft can land successfully at FL1.
- [ ] Survival mode: Round progression works correctly.
- [ ] Runway selection: Clicking a runway sets it as the target.
- [ ] Altitude controls: FL1/FL2/FL3 buttons work and respect `altitudeEnabled`.

## UI & Visuals
- [ ] Unified HUD: Top bar looks consistent across Campaign and Survival.
- [ ] Daily Missions: Panel appears in the bottom right corner and updates correctly.
- [ ] Background Themes: All 5 themes (Classic, Satellite, Tactical, Night Ops, Amber CRT) render correctly in `RadarScreen` and menus.
- [ ] Safe Area: UI elements do not overlap with the iPhone notch or home indicator.

## Multiplayer
- [ ] Create Room: Generates a 6-digit code and joins as host.
- [ ] Join Room: Successfully joins an existing room using the code.
- [ ] Lobby: Players list updates, Ready toggles work, Host can start the game.
- [ ] Sync: Host inputs and game state broadcast correctly to guests.

## iOS Specifics
- [ ] App Icons: All required sizes are present in Xcode.
- [ ] Splash Screen: Displays correctly on launch.
- [ ] Privacy Policy: Accessible via `privacy.html`.
- [ ] Performance: Runs smoothly at 60fps on target devices.
- [ ] Offline Mode: Game functions gracefully without internet (except online features).
