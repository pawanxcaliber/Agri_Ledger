# 🌾 Agri Ledger

**Agri Ledger** is a comprehensive, offline-first farm management application built with **React Native (Expo)**. It empowers farmers and agricultural managers to track finances, manage workers, record attendance, monitor weather, and secure their data with full backup/restore capabilities—all without needing a continuous internet connection.

---

## 🚀 Key Features

*   **💸 Financial Management**
    *   **Track Income & Expenses**: Log detailed transactions with Types (e.g., Expense/Income) and Categories (e.g., Seeds, Labor, Equipment).
    *   **Media Attachments**: Attach **Images** (Camera/Gallery) and **Voice Notes** to every transaction for proof and record-keeping.
    *   **Visual Analytics**: View interactive Pie Charts breaking down cash flow by Date (Day/Month/Year), Type, and Category.
    *   **PDF Reports**: Generate and print detailed HTML-based transaction reports directly from the app.

*   **👷 Worker Management**
    *   **Attendance Tracking**: Record daily work duration (Full Day, Half Day, Overtime) for workers.
    *   **Worker Directory**: Add, edit, and delete worker profiles.
    *   **Performance Calendar**: View individual worker attendance history on an interactive calendar.

*   **☁️ Weather Integration**
    *   **Real-time Forecasts**: Get live weather updates and 7-day forecasts using the open-source **Open-Meteo API**.
    *   **Global Search**: Search for any city worldwide with autocomplete suggestions.
    *   **Detailed Metrics**: Temperature, Humidity, Wind Speed, and Weather Conditions.

*   **🎨 Dynamic Theming & UX**
    *   **DarkMode Support**: Fully integrated dark/light mode that persists across restarts.
    *   **Custom Accent Colors**: Users can choose their preferred primary color (Green, Blue, etc.) via an HSL slider.
    *   **Immersive Design**: The System Navigation Bar and Status Bar adapt to the chosen theme for a seamless look.

*   **🔒 Security & Data**
    *   **Offline Database**: All data is stored locally in a `db.json` file.
    *   **PIN Protection**: Secure the app with a 4-digit PIN code upon entry.
    *   **Full Backup & Restore**: Export your entire database **PLUS** all media attachments (images/audio) as a single `.zip` file.
    *   **Merge Logic**: Importing a backup intelligently merges data, skipping duplicates and preserving existing records.

---

## 🛠 Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
*   **Navigation**: React Navigation (Native Stack)
*   **Data Storage**: `db.json` (Local File System) via `expo-file-system`
*   **State Management**: React Context (`ThemeContext`) + Local State
*   **Libraries**:
    *   `expo-file-system`: Local DB and Media storage.
    *   `expo-av`: Audio recording and playback.
    *   `expo-print`: PDF generation.
    *   `expo-image-picker`: Camera and Gallery access.
    *   `react-native-chart-kit`: Financial visualization.
    *   `react-native-calendars`: Attendance visualization.
    *   `date-fns`: Date manipulation.

---

## 📂 Project Structure

```bash
agri_ledger/
├── App.js                  # Main Entry Point & Navigation Setup
├── index.js                # Expo Root Registration
├── app.json                # Expo Configuration
├── eas.json                # EAS Build Configuration
│
├── context/
│   └── ThemeContext.js     # Global Theme State (Colors, DarkMode, Persistence)
│
├── services/
│   └── Database.js         # Core Data Layer. Handles JSON reading/writing, 
│                           # Media Management, and Backup (.zip) Logic.
│
└── screens/
    ├── LoginScreen.js              # PIN Authentication
    ├── HomeScreen.js               # Dashboard & Side Menu (Backup/Settings)
    ├── WeatherScreen.js            # Weather Forecast Integration
    │
    ├── PaymentScreen.js            # Add/Edit Transactions, Attachments, History
    ├── PaymentVisualizationScreen.js # Financial Charts & Analytics
    │
    ├── WorkerManagementScreen.js   # Daily Attendance Entry
    ├── WorkerListScreen.js         # Manage Worker Profiles
    └── WorkerDataScreen.js         # View/Delete Attendance Logs
```

---

## 🔧 Installation & Setup

1.  **Prerequisites**:
    *   [Node.js](https://nodejs.org/) (LTS recommended)
    *   [Expo CLI](https://docs.expo.dev/get-started/installation/)

2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/agri-ledger.git
    cd agri-ledger
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Run the App**:
    ```bash
    npx expo start
    ```
    *   Scan the QR code with the **Expo Go** app on your Android/iOS device.
    *   Press `a` to run on Android Emulator or `i` for iOS Simulator (requires setup).

---

## 💡 Usage Guide

### 1. Initial Setup
*   On first launch, you will be asked to **Set a 4-Digit PIN**.
*   This PIN will be required every time you open the app.

### 2. Managing Finances
*   Go to **Payments**.
*   Enter Amount, select Type (Income/Expense) and Category.
*   **Media**: Tap the Camera/Gallery icons to add photos. Tap the Mic icon to record a voice note.
*   **Save**: Tap "Save Transaction".
*   **Reports**: Tap the Print icon (top right) to generate a PDF report for a specific date range.

### 3. Backing Up Data
*   On the Home Screen, tap the **Menu Icon (☰)** (top left).
*   Select **Export / Backup Data**.
*   Choose **Save to Device** (saves to specific folder) or **Share via App** (send to Drive, WhatsApp, etc.).
*   *Note: This creates a timestamped `.zip` file containing your DB and all media.*

### 4. Restoring Data
*   On the Menu, select **Import / Restore Data**.
*   Pick a valid `.zip` backup file.
*   The app will **merge** the new data with your existing data.

---

## 🐛 Troubleshooting

*   **Audio Recording Failed**: Ensure you have granted Microphone permissions to the Expo Go app.
*   **Map/Weather Issues**: Ensure you have a working internet connection for the Open-Meteo API (this is the only feature requiring internet).
*   **Backup fails**: On Android 11+, ensure you grant "All Files Access" if prompted, or save to the "Downloads" folder where permissions are standard.

---

## 🔮 Future Roadmap (Planned Features)

*   [ ] Google Drive Cloud Sync Integration
*   [ ] Multi-Language Support (Hindi, Marathi, etc.)
*   [ ] Inventory Management System
*   [ ] Advanced Farm Analytics (Crop yield vs. Expense)

---

**Developed by Pawan**
