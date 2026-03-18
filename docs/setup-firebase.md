# Setting up Live Firebase for FyreVTU

Follow these steps to enable real authentication and wallet transactions:

### 1. Create a Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/).
- Click **Add Project** and follow the prompts.

### 2. Enable Services
- **Authentication**: Go to Build > Authentication. Click **Get Started**, then enable the **Google** provider.
- **Firestore Database**: Go to Build > Firestore Database. Click **Create Database**, choose a location, and start in **Production Mode**.

### 3. Register your Web App
- In Project Settings, click the **Web icon (</>)** to add a web app.
- Give it a nickname (e.g., "FyreVTU Web").
- Copy the `firebaseConfig` values.

### 4. Configure Environment Variables
Add these keys to your environment variables in this IDE:

| Variable Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your `appId` |

### 5. Deploy Security Rules
Once your project ID is connected, any change to `docs/backend.json` or a file save will trigger a deployment of the Security Rules to your live project.
