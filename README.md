# Prizm CRM Mobile

React Native mobile app for Prizm Energy CRM, built with Expo SDK 54.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env to set your API URL
```

## Configuration

Set `EXPO_PUBLIC_API_URL` in `.env` to your Prizm CRM API server:

```
EXPO_PUBLIC_API_URL=https://your-prizm-crm-server.com
```

## Development

```bash
npx expo start
```

## Build

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Tech Stack

- **Framework**: Expo SDK 54 + React Native
- **Routing**: expo-router (file-based)
- **API**: tRPC client
- **Styling**: NativeWind (Tailwind CSS)
- **Auth**: OAuth via expo-auth-session
- **State**: React Query + tRPC

## Screens

- Dashboard (home)
- Tasks, Projects
- Leads, Clients
- Invoices, Estimates, Contracts
- Expenses, Tickets
- Calendar, Notifications
- Settings
