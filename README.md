# LocalLens 🔍

> **Privacy-First Hybrid AI Data Profiling & Insights Engine**  
> Built for the **#BuildHybridAI 2026 Devpost Hackathon**

LocalLens empowers developers, data analysts, and researchers to explore tabular datasets with immediate local feedback and intelligent AI-driven analysis. By combining deterministic client-side data profiling with **Firebase AI Logic Hybrid Inference**, LocalLens dynamically chooses between on-device inference (Gemini Nano via Chrome Built-in AI) and cloud inference (Gemini Flash/Pro via Firebase), ensuring maximal data privacy, ultra-low latency, and deep analytical depth.

---

## 🚀 Key Highlights

* **🔒 Privacy-Conscious Hybrid Architecture:** Sensitive raw data stays inside the browser sandbox. Deterministic profiles and local queries run on-device; aggregated summaries or complex analytical tasks can selectively leverage cloud models.
* **⚡ Blazing Fast Modern Stack:** Built on React 19, Vite 8, TypeScript, and modern bundler tooling for instant HMR and lightweight bundle sizes.
* **🤖 Firebase AI Logic Ready:** Anchored in Firebase Web SDK v13 (`firebase/ai`) with first-class support for `getAI`, `getGenerativeModel`, and `InferenceMode` routing.

---

## 🛠️ Tech Stack

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vite.dev/)
* **Backend & Cloud:** [Firebase Web SDK](https://firebase.google.com/) (`v13.4+`), Firebase Project `locallens-b4060`
* **AI & Inference:** Firebase AI Logic (`firebase/ai`), on-device Gemini Nano & cloud Gemini models
* **Linting & Quality:** [Oxlint](https://oxc.rs/)

---

## 📊 Current Implementation Status

### ✅ Implemented (Checkpoints 1 & 2)
* [x] **Project Scaffolding:** React 19 + TypeScript + Vite 8 application setup.
* [x] **Firebase Web SDK v13 Integration:** Safe singleton initialization preventing duplicate app instantiation during HMR.
* [x] **Client-Safe Environment Configuration:** Secure `.env.local` loading with strict TypeScript definitions (`src/vite-env.d.ts`).
* [x] **Initialization Diagnostics UI:** Real-time `<FirebaseStatus />` dashboard badge displaying SDK version, project ID, and initialization health.
* [x] **Production Build & Test Pipeline:** Automated Vitest test suite, zero lint warnings (`oxlint`), and clean TypeScript build (`tsc -b && vite build`).
* [x] **Local CSV Data Profiler (Checkpoint 2):**
  * Drag-and-drop CSV upload and file selection.
  * 100% in-browser, zero-server-upload CSV parsing via PapaParse.
  * Instant demo sample datasets for one-click testing.
  * Automatic schema inference (numerical, categorical, boolean, date).
  * Missing value & null rate detection per column and overall dataset health.
  * Numerical summaries: min, max, mean, median, sample std dev, and interactive SVG histograms.
  * Categorical summaries: distinct count, frequency distribution, and top categories.
  * Interactive paginated raw data preview table with in-table search and missing value highlights.
  * Column filtering, search, and sorting controls.

### 🔜 Planned Features (Upcoming Checkpoints)
* [ ] **Firebase AI Logic Hybrid Inference:**
  * Integration with `firebase/ai` (`getAI`, `getGenerativeModel`, `InferenceMode`).
  * Dynamic routing between on-device Gemini Nano and cloud Gemini.
* [ ] **Dataset Intelligence Dashboard:** Automated natural-language narrative insights, correlation analysis, and data quality flags.
* [ ] **Data Export:** Export deterministic summaries and AI insights to Markdown/JSON.

---

## 🏁 Getting Started

### 1. Prerequisites
* Node.js (v20+ recommended)
* npm (v10+ recommended)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/<your-username>/locallens.git
cd locallens
npm install
```

### 3. Environment Setup
Copy the example environment file and configure your Firebase Web App credentials:
```bash
cp .env.example .env.local
```
Fill in the client configuration values from your registered Firebase web app:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=locallens-b4060.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=locallens-b4060
VITE_FIREBASE_STORAGE_BUCKET=locallens-b4060.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```
*(Note: These `VITE_` variables identify your Firebase project to Google APIs and are safe for client-side web distribution. Never commit `.env.local` to source control.)*

### 4. Running the App
* **Development Server:**
  ```bash
  npm run dev
  ```
* **Testing:**
  ```bash
  npm test
  ```
* **Linting:**
  ```bash
  npm run lint
  ```
* **Production Build:**
  ```bash
  npm run build
  ```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
