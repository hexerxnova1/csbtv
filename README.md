<p align="center">
  <img src="assets/Readme.md-cover.png" alt="Alpha TV Cover Page" width="100%" style="border-radius: 12px; margin-bottom: 20px;">
</p>

# 📺 Alpha TV - Premium Live Streaming Platform

<p align="center">
  <a href="https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases"><img src="https://img.shields.io/badge/Download-AlphaTV--v1.1.4.apk-brightgreen?style=for-the-badge&logo=android&logoColor=white" alt="Download APK"></a>
  <a href="https://shariar-ahamed.github.io/online-tv-streaming-platform/"><img src="https://img.shields.io/badge/Live-Web%20Demo-ff007f?style=for-the-badge&logo=livewire&logoColor=white" alt="Live Demo"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue?style=flat-square&logo=capacitor&logoColor=white">
  <img src="https://img.shields.io/badge/UI-Neumorphic%20%2F%20Glassmorphism-violet?style=flat-square">
  <img src="https://img.shields.io/badge/Version-v1.1.4-brightgreen?style=flat-square">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square">
</p>

<p align="center">
  <img src="https://img.shields.io/github/repo-size/Shariar-Ahamed/online-tv-streaming-platform">
  <img src="https://img.shields.io/github/last-commit/Shariar-Ahamed/online-tv-streaming-platform">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Shariar-Ahamed/online-tv-streaming-platform?style=social">
  <img src="https://img.shields.io/github/forks/Shariar-Ahamed/online-tv-streaming-platform?style=social">
</p>

<p align="center">
  <a href="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/d5fc1849-63b0-4df6-8d52-fe8d5b2162e8"><img src="https://wakatime.com/badge/user/c7433bc5-6f12-4c97-baea-430790fa608c/project/d5fc1849-63b0-4df6-8d52-fe8d5b2162e8.svg" alt="wakatime"></a>
</p>

---

## 📖 Overview

**Alpha TV** is a premium, modern, and highly responsive online Live TV streaming platform. It packages a cyber-dark, glassmorphic Web App into a lightweight native Android App using the Capacitor framework. Featuring a dual-mode layout (2D Flat & 3D Neumorphic), dynamic M3U parsing, HLS streaming playback, and an intelligent channel navigation system, Alpha TV brings local and international television straight to your pocket.

---

## 📱 App Specifications (Android & Play Store Info)

Below are the technical specifications of the native Android application package:

| Specification                  | Details                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| 📦 **App Name**                | `AlphaTV-v1.1.4.apk`                                                                       |
| 🆔 **Package Name**            | `com.alphatv.app`                                                                          |
| 🏷️ **Current Version**         | `1.1.4` (Build Code `15`)                                                                  |
| 📂 **App Size**                | ~31.1 MB                                                                                   |
| ⚙️ **Minimum OS Support**      | Android 7.0 (Nougat - API Level 24) or higher                                              |
| 🎯 **Target SDK**              | Android 15 / 16 (API Level 36)                                                             |
| 🎮 **Category**                | Entertainment / Live TV Streaming                                                          |
| 🌍 **Supported Architectures** | `universal` (arm64-v8a, armeabi-v7a, x86, x86_64)                                          |
| 🚀 **Releases Directory**      | [GitHub Releases](https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases) |

---

## 🌟 Key Features

### 📺 Automatic Picture-in-Picture (PiP) Mode

- **Zero-Click Multitasking:** If you are watching a TV channel and press the phone's **Home button** or **Back button**, the app automatically transitions into a floating Picture-in-Picture window.
- **Cross-Platform Compatibility:** 
  - **Android App:** Works automatically on Home press & Back press (Android 8.0+ / API 26+).
  - **Mobile Web Browser:** Works automatically on Home press (page hide) using the HTML5 `autopictureinpicture` native standard.
- **Clean Layout Adaptation:** Instantly hides header, channel navigation grid, footer, and sidebar options in PiP mode, showing only the clean video stream filling 100% of the floating window.

### ⭐ Favorites Channel List (Bookmarking)

- **Real-Time Bookmarks:** Tap the golden star icon on any channel card to add it to your Favorites list instantly.
- **Persistent Storage:** Bookmarks are saved locally in the browser/app `localStorage`, persisting across page reloads and app restarts.
- **Empty Notice:** A premium empty state helper instructs users how to start favoriting channels.
- **Custom Categories Sequence:** Ordered such that `Favorites` ➔ `All Channels` ➔ `Sports` ➔ `Bangla` are prioritized first in the filter bar.

### 🎛️ 2D / 3D Layout Toggle Switch

- Toggle instantly between a **Modern 2D Glow UI** and a **Tactile 3D Soft Neumorphic UI** directly from the header.
- Features custom color-reversed slider gradients:
  - **3D Mode:** Pink-to-Purple (`#ff007f` to `#9b51e0`) with soft outset highlights and inset cutouts.
  - **2D Mode:** Purple-to-Pink (`#9b51e0` to `#ff007f`) with neon glow shadows.
- Incorporates a **Zero-Flash layout switch mechanism** that disables CSS border transition delays during layout changes while keeping the slider animation smooth.

### 📱 Tailored Mobile Layout

- **Clean Header:** The top header on mobile is kept neat and spacious, placing the logo on the left and the 2D/3D toggle cleanly on the right.
- **Header Live Counter:** Relocated to the active channel details card, sitting horizontally side-by-side with the green `LIVE` badge on the top row of the card for a cohesive, balanced mobile interface.

### 📺 Integrated HLS Player

- Native HLS `.m3u8` live stream decoding powered by `HLS.js`.
- Features built-in smart playback controls (Next, Previous, Play/Pause, Fullscreen).
- Includes dynamic loading spinners and live status badges.

### 🗂️ Smart M3U Playlist Parsing & Categories

- Automatically parses [channels.m3u](file:///e:/Git%20All%20Repo/online-tv-streaming-platform/channels.m3u) on startup.
- Dynamically generates categories and sorts items with an inline swipeable category pill carousel.
- Rounded picture logo formatting (`border-radius: 10px`) across both 2D and 3D states.
- Beautiful custom-generated gradient avatars as fallback icons for channels with broken logo links.

---

## 🛠️ Technology Stack

- **Frontend Core:** HTML5, Vanilla CSS3 (Glassmorphism & Neumorphic Shadow Systems), ES6+ JavaScript.
- **Streaming engine:** `HLS.js` library.
- **Icons:** FontAwesome v6.
- **Native Wrapper:** Capacitor CLI + Capacitor Android Core.

---

## 🖥️ Responsive Preview

### 💻 Laptop & Desktop View

<p align="center">
  <img src="assets/laptop-view.png" alt="Laptop Preview" width="80%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

### 📲 Tablet & Mobile View

<p align="center">
  <img src="assets/tab-view.png" width="45%" alt="Tablet Preview" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/phone-view.png" width="28%" alt="Mobile Preview" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

---

## 📂 Project Directory Structure

```bash
online-tv-streaming-platform/
│
├── 📂 android/               # Native Android Studio Project
│   └── app/build.gradle      # Android compilation & SDK target configurations
│
├── 📂 www/                   # Web Build Output directory
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── 📄 channels.m3u           # M3U Playlist containing channels & groups
├── 📄 index.html             # Source HTML structure
├── 📄 script.js              # Application core logic & parser
├── 📄 style.css              # Custom layout stylesheet
├── 📄 build.js               # Node.js builder to clean and package the Web directory
└── 📄 package.json           # Node scripts and Capacitor core dependencies
```

---

## ⚙️ Getting Started (Local Development)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Shariar-Ahamed/online-tv-streaming-platform.git
cd online-tv-streaming-platform
```

### 2️⃣ Run locally with Live Server

1. Open the project in Visual Studio Code.
2. Ensure you have the **Live Server** extension installed.
3. Right-click inside `index.html` and select **Open with Live Server**.
4. Access the web app at `http://127.0.0.1:5500`.

### 3️⃣ Build and Sync to Android (Capacitor)

If you want to package the app and prepare it for Android builds:

```bash
# Install node dependencies
npm install

# Run the project builder script (copies files to www/)
node build.js

# Sync built files to the native Android directory
npx cap sync

# Open the Android Studio project to compile the APK
npx cap open android
```

---

## 📋 Release History & Changelog

### 🚀 v1.1.4 (Current Release) - Build Code `15`
* **Disclaimer & Telegram Sequence Modal:**
  * Implemented a sequential onboarding flow for first-time users: showing a Disclaimer modal, and upon acceptance, instantly showing an official Telegram Community modal.
  * Persists user agreements in `localStorage` to avoid repeating popups on subsequent visits.
* **Server 1 browser lock & App-Only Indicator:**
  * Added dynamic browser-detection logic to indicate that Server 1 (Toffee Live) requires the Android App.
  * Restricts Server 1 playback in web browsers with a secure popup modal linking to the official Android App release.
  * Server selector UI dynamically updates server titles, locks, and colors.
* **Brand Logo Shimmer & Wave Animation:**
  * Integrated a highly customized, ultra-slow brand text shimmer animation flowing with Neon Pink and Neon Purple.
  * Added a gentle waving animation (`flagWave`) anchored on the left to make the logo text sway gracefully like a flag in a light breeze.
* **Buffering Spinner Color Tuning:**
  * Adjusted the player buffering gyro-spinner color variables to match the Neon Pink (`var(--primary)`) and Neon Cyan (`var(--secondary)`) theme colors.

### 🚀 v1.1.3 - Build Code `14`
* **Mute/Volume Control Button:**
  * Integrated a dedicated Mute/Unmute sound button directly into the custom control bar (re-ordered for optimal UX, placing Fullscreen on the far right).
  * Automatically stores the user's volume state in `localStorage` so it persists between different channels and application restarts.
* **Premium Neon Gyro-Loader:**
  * Replaced the standard loading indicator with a highly responsive, modern concentric neon gyro-spinner (customized orange and blue themes matching the website layout) around a pulsing central core.
  * Added dynamic shining gradient text for buffering updates and a frosted glass overlay with `backdrop-filter: blur(12px)` over the player area.
* **Changelog & Status Updates:**
  * Added server stream notice handling for temporary loading issues.
  * Created dedicated `FIFA 2026` category with new streams.
  * Updated portfolio links to the new domain `www.shariarahamed.me` and Telegram channel to `@Alpha_TV_Official`.

### 🚀 v1.1.2 - Build Code `13`
* **Automatic Picture-in-Picture (PiP) Mode:**
  * Enabled Picture-in-Picture capability for both the Web application and the native Android App wrapper.
  * Pressing the **Home button** in mobile browsers or **Home / Back buttons** inside the Android App will automatically transition the playing stream into a floating PiP window.
  * Web adaptation via HTML5 `autopictureinpicture` and Android Native Activity lifecycle overrides (`onUserLeaveHint()`, `onBackPressed()`, `onPictureInPictureModeChanged()`).
  * Custom CSS class injection (`.pip-active`) dynamically hides all background interface components (header, category lists, grids, footer) and scales the player viewport to fill 100% of the PiP overlay.

### 🚀 v1.1.1 - Build Code `12`
* **Live Playlist Sync (Cache Bypass):**
  * Implemented a cache-busting mechanism (`?t=timestamp`) when fetching `channels.m3u` to bypass CDN caching.
  * Ensures that playlist updates via GitHub reflect instantly on the app without requiring manual local builds or wait times.
* **Channel Fixes & Optimization:**
  * Merged and optimized duplicate channels (e.g. BTV, Gopal Bhar) for better listing.

### 🚀 v1.1.0 - Build Code `11`
* **Global Synchronized Stats & Real-Time Fluctuations:**
  * Implemented a deterministic time-based visitor calculator. Now, all active users see the exact same "Total Visits" and "Live Watching" counts in real-time.
  * Live Watching fluctuates dynamically up and down using a slow 1-hour sine wave (+/- 25 watchers) and a fast 20-second noise (+/- 4 watchers) to simulate real traffic fluctuations.
  * Total Visits grows steadily over time (1 new visit every 90 seconds) based on time elapsed since a fixed benchmark date.

### 🚀 v1.0.9 - Build Code `10`
* **First-Time Visitor Disclaimer Modal:**
  * Implemented an overlay popup modal to display streaming/liability disclaimers for first-time visitors.
  * Integrated `localStorage` visitor tracking (`alpha_tv_disclaimer_accepted`) so the popup appears only once per browser/app installation.
* **UI Refinements & Sizing Alignment:**
  * Aligned Disclaimer modal sizing and responsive layout (`max-width: 500px`) to perfectly match the Privacy Policy modal.
  * Added flex layout, vertical alignment, and a subtle border divider underneath the disclaimer header.
* **Manual Review Trigger:**
  * Added a dedicated footer quick link ("Disclaimer") to allow manual review of disclaimers at any time.

### 🚀 v1.0.8 - Build Code `9`
* **Favorites Channel List:** Added favorite list support with custom golden star toggle design.
* **Categories Reordering:** Favorites ➔ All Channels ➔ Sports ➔ Bangla.

---

## 🔗 Useful Links

- **Latest APK Release:** [Download AlphaTV-v1.1.4.apk](https://github.com/Shariar-Ahamed/online-tv-streaming-platform/releases)
- **Live Web App:** [Alpha TV Live Web App](https://shariar-ahamed.github.io/online-tv-streaming-platform/)
- **Source Code Repository:** [GitHub Repository](https://github.com/Shariar-Ahamed/online-tv-streaming-platform)

---

## ⭐ Support & Feedback

If you find this project useful, please consider giving it a ⭐ on GitHub! Your support keeps the development going.

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use, modify, and build upon this project for your personal or commercial applications.
