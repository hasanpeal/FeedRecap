# FeedRecap

![FeedRecap Logo](https://www.feedrecap.com/feedrecaplogo.png)

**FeedRecap** is an AI-powered newsletter platform that curates top tweets from Twitter and delivers them to your inbox. You can follow trending categories like politics, tech, finance, or entertainment, or build a custom feed from specific Twitter profiles.

---

## Live Demo

- Website: [feedrecap.com](https://www.feedrecap.com)
- Repository: [GitHub](https://github.com/hasanpeal/FeedRecap.git)

---

## Features

### Category Mode

- Choose from predefined categories: Politics, Geopolitics, Finance, AI, Tech, Crypto, Meme, Sports, Entertainment
- Set preferred newsletter delivery times (Morning, Afternoon, Night)
- Receive AI-curated newsletters with the top tweets from your selected categories

### Custom Profile Mode

- Add Twitter profiles via an auto-suggestion search
- Follow any number of Twitter profiles
- Get newsletters based on your custom profile feed

### Dashboard

- **Newsfeed**: View top tweets based on your selected categories or custom profiles
- **Newsletter**: Access the most recent newsletter sent to you
- **Settings**: Update categories, custom profiles, timezone, and delivery time

### Newsletter

- AI-generated newsletter content delivered to your inbox
- Curated top tweets of the day
- Web link for easy sharing
- Share on X directly from the dashboard

### Audit Logging

All major user actions are logged automatically:

- Page visits
- Account creation, login, and logout
- Password changes and account updates
- Twitter account linking/unlinking
- Category and profile updates
- Feed type changes
- Newsletter views and link clicks

Each log entry stores the user ID, email, activity type, page/route, IP address, user agent, timestamp, and relevant metadata. Logs are stored in MongoDB with indexed fields.

### Admin Dashboard

Accessible only to users with `isAdmin: true` in the database, at the `/admin` route.

- Page views analytics with time period filters (1d, 3d, 7d, 30d, 6m, 1y)
- Link click tracking with user info and timestamps
- Activity distribution statistics
- User metrics: total users, feed type breakdown, Twitter linking stats
- Live audit log feed, filterable by user or activity type

---

## Tech Stack

### Frontend

- Framework: Next.js, React
- Language: TypeScript
- State Management: React Context API
- HTTP Client: Axios with JWT interceptors
- Analytics: Google Analytics, Vercel Analytics
- Deployed on: Vercel

### Backend

- Framework: Express.js
- Authentication: JWT, Google OAuth, email-based login with OTP verification
- Database: MongoDB with Mongoose
- Email: SendGrid
- AI: OpenAI-compatible API (configurable model)
- Language: TypeScript
- Automation: node-cron for newsletter scheduling

---

## Project Structure

```
FeedRecap/
├── client/                    # Frontend (Next.js)
│   ├── app/                   # Next.js app directory
│   │   ├── api/               # API routes (DeepSeek, Twitter, video-proxy)
│   │   ├── dashboard/         # User dashboard page
│   │   ├── admin/             # Admin dashboard page
│   │   ├── signin/            # Sign-in page
│   │   ├── signup/            # Sign-up page
│   │   └── ...                # Other pages
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── PageVisitLogger.tsx
│   ├── context/               # React Context (UserContext)
│   ├── utils/                 # Utility functions (axios, notifications)
│   └── public/                # Static assets
├── server/                    # Backend (Express.js)
│   ├── src/
│   │   ├── server.ts          # Main server file with JWT auth
│   │   ├── userModel.ts       # User MongoDB model
│   │   ├── newsletterModel.ts # Newsletter MongoDB model
│   │   ├── tweetModel.ts      # Tweet MongoDB model
│   │   ├── auditLogModel.ts   # Audit log MongoDB model
│   │   ├── auditLogger.ts     # Audit logging utilities
│   │   ├── digest.ts          # Newsletter generation logic
│   │   └── db.ts              # Database connection
│   └── dist/                  # Compiled JavaScript
├── start.sh                   # Startup script
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- MongoDB (Railway or local)
- Environment variables configured (see below)

### Environment Variables

#### Server (`server/.env`)

```env
MONGO_URL=mongodb://user:password@host:port

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email@example.com

CLIENT=your_google_oauth_client_id
SECRET=your_google_oauth_client_secret

SERVER=http://localhost:3001
ORIGIN=http://localhost:3000
CLIENT_URL=http://localhost:3000
```

#### Client (`client/.env.local`)

```env
NEXT_PUBLIC_SERVER=http://localhost:3001
```

### Quick Start

```bash
chmod +x start.sh
./start.sh
```

This will install dependencies for both client and server, build the TypeScript server, and start both services.

- Client: http://localhost:3000
- Server: http://localhost:3001

### Manual Setup

#### Frontend

```bash
cd client
npm install
npm run dev
```

#### Backend

```bash
cd server
npm install
npm run build
npm run start
```

### Setting Up Admin Access

Update the `isAdmin` field for a user in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isAdmin: true } }
)
```

Once set, the user can access `/admin` to view analytics, audit logs, and user metrics.

---

## Authentication

FeedRecap uses JWT for stateless authentication.

### Methods

**Email-based**: Sign up with email and password. OTP verification required. Password hashed with bcrypt.

**Google OAuth**: Sign up or sign in via Google. Handled with Passport.js. JWT issued after successful authentication.

### JWT Details

- Payload: `userId`, `email`
- Default expiration: 7 days
- All authenticated routes use the `authenticateJWT` middleware
- Frontend stores the token in `localStorage` and attaches it as `Authorization: Bearer <token>` on every request
- On 401 responses, the token is removed and the user is redirected to sign-in

---

## API Routes

### Frontend Routes

| Route               | Description                      | Auth Required |
| ------------------- | -------------------------------- | ------------- |
| `/`                 | Homepage                         | No            |
| `/signin`           | Sign-in page                     | No            |
| `/signup`           | Sign-up page                     | No            |
| `/aboutus`          | About page                       | No            |
| `/samplenewsletter` | Sample newsletter preview        | No            |
| `/dashboard`        | User dashboard                   | Yes (JWT)     |
| `/readnewsletter`   | Read newsletter by ID            | No            |
| `/unsubscribe`      | Unsubscribe from newsletters     | No            |
| `/admin`            | Admin dashboard                  | Yes (Admin)   |

### Backend API Routes

| Route                          | Method | Description                        | Auth          |
| ------------------------------ | ------ | ---------------------------------- | ------------- |
| `/login`                       | POST   | Email/password login               | No            |
| `/register`                    | POST   | User registration                  | No            |
| `/logout`                      | POST   | User logout                        | JWT           |
| `/check-session`               | GET    | Validate JWT token                 | JWT           |
| `/data`                        | GET    | Get user dashboard data            | JWT           |
| `/updateProfiles`              | POST   | Update custom Twitter profiles     | JWT           |
| `/updateFeedType`              | POST   | Change feed type                   | JWT           |
| `/updateCategories`            | POST   | Update selected categories         | JWT           |
| `/updateTimes`                 | POST   | Update newsletter delivery times   | JWT           |
| `/updateAccount`               | POST   | Update account details             | JWT           |
| `/getUserDetails`              | GET    | Get account information            | JWT           |
| `/getIsNewUser`                | GET    | Check if user is new               | JWT           |
| `/newsletter/:id`              | GET    | Get newsletter by ID               | No            |
| `/sentOTP`                     | POST   | Send OTP for email verification    | No            |
| `/resetPassword`               | POST   | Reset password                     | No            |
| `/validateEmail`               | GET    | Check if email exists              | No            |
| `/saveX`                       | POST   | Link Twitter account               | No            |
| `/unlinkX`                     | POST   | Unlink Twitter account             | JWT           |
| `/auth/google/signup`          | GET    | Google OAuth sign-up               | No            |
| `/auth/google/signin`          | GET    | Google OAuth sign-in               | No            |
| `/auth/google/callback`        | GET    | Google OAuth callback              | No            |
| `/logPageVisit`                | POST   | Log page visit                     | JWT           |
| `/logLinkClick`                | POST   | Log link click                     | JWT           |
| `/logFeedback`                 | POST   | Log feedback                       | JWT           |
| `/admin/analytics/pageviews`   | GET    | Page views analytics               | Admin         |
| `/admin/analytics/linkclicks`  | GET    | Link clicks analytics              | Admin         |
| `/admin/analytics/activities`  | GET    | Activity statistics                | Admin         |
| `/admin/audit-logs`            | GET    | Audit log feed                     | Admin         |
| `/admin/users`                 | GET    | All users and metrics              | Admin         |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

---

## Contact

- Author: [Peal Hasan](https://www.linkedin.com/in/hasanpeal/)
- Email: [contact@feedrecap.com](mailto:contact@feedrecap.com)
