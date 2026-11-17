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

### ✅ Implemented (Checkpoint 1)
* [x] **Project Scaffolding:** React 19 + TypeScript + Vite 8 application setup.
* [x] **Firebase Web SDK v13 Integration:** Safe singleton initialization preventing duplicate app instantiation during HMR.
* [x] **Client-Safe Environment Configuration:** Secure `.env.local` loading with strict TypeScript definitions (`src/vite-env.d.ts`).
* [x] **Initialization Diagnostics UI:** Real-time `<FirebaseStatus />` dashboard badge displaying SDK version, project ID, and initialization health.
* [x] **Production Build Pipeline:** Zero lint warnings (`oxlint`) and clean TypeScript build (`tsc -b && vite build`).

### 🔜 Planned Features (Upcoming Checkpoints)
* [ ] **Local Data Profiler:** In-browser CSV file upload, chunked streaming, schema inference, null detection, distribution statistics, and anomaly detection.
* [ ] **Firebase AI Logic Hybrid Inference:**
  * Implementation of `getAI` and `getGenerativeModel`.
  * Dynamic `InferenceMode` (selecting on-device Gemini Nano when hardware allows and falling back to cloud Gemini models).
* [ ] **Dataset Intelligence Dashboard:** Interactive column visualizations, correlation heatmaps, and natural-language narrative insights.
* [ ] **Data Export:** Export deterministic summaries and AI recommendations to Markdown/JSON.

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
