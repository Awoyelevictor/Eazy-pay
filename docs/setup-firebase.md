# Setting up Live Firebase for FyreVTU

Follow these steps to enable real authentication and wallet transactions. You are currently in the Firebase Console, but you need to register a Web App to get your keys.

### 1. Register your Web App (CRITICAL)
- In the [Firebase Console](https://console.firebase.google.com/), click the **Gear Icon (⚙️)** next to "Project Overview" and select **Project Settings**.
- On the **General** tab, scroll down to the **"Your apps"** section.
- Click the **Web icon (</>)**.
- Give your app a nickname (e.g., "FyreVTU-Web") and click **Register app**.
- You will see a `firebaseConfig` object. Copy the values inside it.

### 2. Configure Environment Variables
Add these values to your environment variables in this IDE:

| Variable Name | Value from firebaseConfig |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

### 3. Enable Services in Firebase Console
- **Authentication**: Go to Build > Authentication > Get Started. Enable **Google** as a sign-in provider.
- **Firestore Database**: Go to Build > Firestore Database > Create Database. Start in **Production Mode** and choose a location near you.

### 4. Deploy Security Rules
Once your project ID is connected, any change you save in this IDE will automatically deploy the Security Rules to your live Firebase project.
