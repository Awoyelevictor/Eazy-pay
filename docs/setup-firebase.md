
# Connecting Eazy-pay to Live Firebase

If you are seeing "API Key not valid" or if emails (Reset Password) are not arriving, follow these critical steps.

### 1. Register a Web App in Firebase Console
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Click the **Gear Icon (⚙️)** > **Project Settings**.
3. Scroll down to the **"Your apps"** section and click the **Web icon (</>)**.
4. Register the app (e.g., "Eazy-pay-Web").
5. Copy the `firebaseConfig` object into `src/firebase/config.ts`.

### 2. Enable Email/Password Authentication (CRITICAL)
1. Go to **Build > Authentication** in the Firebase Console.
2. Click **Get Started**.
3. Click the **Sign-in method** tab.
4. Select **Email/Password** and **Enable** it.
5. Click **Save**.

### 3. SET SUPPORT EMAIL (Required for Email Delivery)
If users are not receiving "Reset Password" emails:
1. Go to **Project Settings** (Gear Icon).
2. On the **General** tab, look for **Support email**.
3. Select your email address from the dropdown.
4. **Firebase will not send any emails (Verification or Password Reset) until this is set.**

### 4. Check Authentication Templates
1. Go to **Authentication > Templates**.
2. Ensure the "Password reset" template is active.
3. You can customize the "Sender name" here so it doesn't look like spam.

### 5. Set Up Firestore
1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a location and start in **Production Mode**.
4. Security rules are handled by the app deployment.

### 6. Enable CORS for APIs
Ensure your domain (e.g., your-app.vercel.app) is added to the **Authorized Domains** list in **Authentication > Settings > Authorized Domains**.
