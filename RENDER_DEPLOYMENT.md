# Render Deployment Guide for Eazy-pay

This document outlines the steps to deploy your Next.js application to [Render](https://render.com).

## 1. Project Configuration on Render

When creating a new **Web Service** on Render, use the following settings:

- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

## 2. Environment Variables

You MUST add the following environment variables in the Render Dashboard (**Environment** section). You can copy the values from your local `.env.local` file.

| Key | Value Source / Description |
|-----|---------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From `.env.local` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | From `.env.local` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | From `.env.local` |
| `PAYSTACK_SECRET_KEY` | From `.env.local` |
| `CONNECT_BRIDGE_API_KEY` | **[CRITICAL]** Add your Connect Bridge API Key here |
| `VTPASS_API_KEY` | From `.env.local` (Needed for Cable/Electricity) |
| `NEXT_PUBLIC_VTPASS_PUBLIC_KEY` | From `.env.local` |
| `VTPASS_SECRET_KEY` | From `.env.local` |
| `GOOGLE_GENAI_API_KEY` | From `.env.local` |
| `GEMINI_API_KEY` | From `.env.local` |

## 3. Important Notes

- **Connect Bridge API**: We have started switching Airtime and AI Quick Buy to use Connect Bridge. Ensure you have the API key from `https://connectbridge.com.ng/` set in Render.
- **Node Version**: Ensure Render is using a Node version compatible with Next.js 15 (Node 18.18+ or 20+). You can set a `NODE_VERSION` environment variable to `20` on Render if needed.
- **Database**: Ensure your Firestore rules are set to allow production traffic.
