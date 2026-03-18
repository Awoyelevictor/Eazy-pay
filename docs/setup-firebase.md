# Connecting FyreVTU to Live Firebase

If you are seeing "API Key not valid" or "Firebase Project: undefined", follow these steps to manually connect your project.

### 1. Register a Web App in Firebase Console
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Click the **Gear Icon (⚙️)** > **Project Settings**.
3. Scroll down to the **"Your apps"** section and click the **Web icon (</>)**.
4. Register the app (e.g., "FyreVTU-Web").
5. You will see a `firebaseConfig` object. Copy those values.

### 2. Add Environment Variables
Add these values to your environment variables in this IDE:

| Key | Value from firebaseConfig |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

### 3. Enable Authentication
1. Go to **Build > Authentication** in the Firebase Console.
2. Click **Get Started**.
3. Enable **Google** as a Sign-in provider.

Once you add the variables and restart the dev server, the app will automatically switch to "Live Mode".
