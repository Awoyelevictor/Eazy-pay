# Connecting Eazy-pay to Live Firebase

If you are seeing "API Key not valid" or "Firebase: Error (auth/operation-not-allowed)", follow these steps to manually connect your project.

### 1. Register a Web App in Firebase Console
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Click the **Gear Icon (⚙️)** > **Project Settings**.
3. Scroll down to the **"Your apps"** section and click the **Web icon (</>)**.
4. Register the app (e.g., "Eazy-pay-Web").
5. You will see a `firebaseConfig` object. Copy those values into `src/firebase/config.ts`.

### 2. Enable Email/Password Authentication (CRITICAL)
1. Go to **Build > Authentication** in the Firebase Console.
2. Click **Get Started** (if you haven't already).
3. Click the **Sign-in method** tab.
4. Click **Add new provider** and select **Email/Password**.
5. **Enable** the first toggle (Email/Password).
6. Click **Save**.
7. **IMPORTANT:** If you don't do this, you will see the `auth/operation-not-allowed` error during signup.

### 3. Set Up Firestore
1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location and start in **Production Mode**.
4. Security rules will be automatically handled by the system.

### 4. Enable Support Email
1. In **Project Settings > General**, ensure a "Support email" is selected. This is required for authentication services.
