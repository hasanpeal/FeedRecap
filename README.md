# FeedRecap

![FeedRecap Logo](https://www.feedrecap.com/feedrecaplogo.png)

**FeedRecap** is a cutting-edge AI-powered newsletter platform that curates top tweets from Twitter, delivering them directly to your inbox. Whether you're following trending categories like politics, tech, finance, or entertainment, or customizing your feed with specific Twitter profiles, FeedRecap ensures you stay informed effortlessly and efficiently.

---

## 🚀 Live Demo

🌐 **Website**: [FeedRecap](https://www.feedrecap.com)

🔗 **Repository**: [GitHub](https://github.com/hasanpeal/FeedRecap.git)

---

## ✨ Features

### 📰 **Category Mode**

- Choose from predefined categories:
  - **Politics**
  - **Geopolitics**
  - **Finance**
  - **AI**
  - **Tech**
  - **Crypto**
  - **Meme**
  - **Sports**
  - **Entertainment**
- Set your preferred newsletter delivery times (Morning, Afternoon, Night).
- Receive AI-curated newsletters with the top 15 tweets from your selected categories and share them easily with friends via WhatsApp, Telegram, or Email.

### 🔧 **Custom Profile Mode**

- Add Twitter profiles via an auto-suggestion feature.
- Follow as many Twitter profiles as you like.
- Get personalized newsletters based on your custom profile feed, curated by AI.

### 📊 **Dashboard**

- Access your personalized dashboard with these tabs:
  1. **Newsfeed**: View top tweets based on your selected categories or custom profiles.
  2. **Latest Newsletter**: Access the most recent newsletters.
  3. **Settings**: Update your categories, custom profiles, timezone, and delivery time.

### 📩 **Newsletter Features**

- **Newsletter**: AI-powered newsletter content delivered straight to your inbox.
- **Top Tweets**: Curated top tweets of the day.
- **Share Easily**: Share tweets or newsletters to:
  - **WhatsApp**
  - **Telegram**
  - **Email**
- **Web Link**: Access your newsletter via a web link for easy sharing with friends.

---

## 🛠️ Tech Stack

### **Frontend**

- **Framework**: Next.js, React
- **Language**: TypeScript
- **State Management**: React Context API
- **HTTP Client**: Axios with JWT interceptors
- **Analytics**: Google Analytics, Vercel Analytics
- **Deployed On**: [Vercel](https://vercel.com)

### **Backend**

- **Framework**: Express.js
- **Authentication**: JWT (JSON Web Tokens), Google OAuth, Email-based login with two-step verification
- **Database**: MongoDB with Mongoose
- **API**: SendGrid (Email), Gemini AI, Axios
- **Language**: TypeScript
- **Dev Tools**: Nodemon, MongoDB Atlas, Postman, Node.js
- **Automation**: Node Cron for scheduling newsletter tasks
- **Generative AI**: Google Gemini AI

---

## 🗂️ Project Structure

```plaintext
FeedRecap/
├── client/                    # Frontend (Next.js)
│   ├── app/                   # Next.js app directory
│   │   ├── api/               # API routes (DeepSeek, Twitter, video-proxy)
│   │   ├── dashboard/         # User dashboard page
│   │   ├── signin/            # Sign-in page
│   │   ├── signup/            # Sign-up page
│   │   └── ...                # Other pages
│   ├── components/            # React components
│   │   └── dashboard/         # Dashboard-specific components
│   ├── context/               # React Context (UserContext)
│   ├── utils/                 # Utility functions (axios, notifications)
│   └── public/                # Static assets
├── server/                    # Backend (Express.js)
│   ├── src/                   # TypeScript source files
│   │   ├── server.ts          # Main server file with JWT auth
│   │   ├── userModel.ts        # User MongoDB model
│   │   ├── newsletterModel.ts  # Newsletter MongoDB model
│   │   ├── tweetModel.ts       # Tweet MongoDB model
│   │   ├── digest.ts          # Newsletter generation logic
│   │   └── db.ts              # Database connection
│   └── dist/                  # Compiled JavaScript files
├── start.sh                   # Startup script for client + server
└── README.md                  # This file
```

---

## 🧑‍💻 Getting Started

### **Prerequisites**

- Node.js (v18 or higher)
- npm or yarn
- MongoDB database (local or MongoDB Atlas)
- Environment variables configured (see Environment Variables section below)

### **Environment Variables**

Before running the application, you need to configure environment variables:

#### **Server Environment Variables** (`server/.env`)

```env
# MongoDB Configuration
MONGO_USERNAME=your_mongodb_username
MONGO_PASSWORD=your_mongodb_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key (or auto-generated if not provided)
JWT_EXPIRES_IN=7d (default: 7 days)

# SendGrid Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email@example.com

# Google OAuth Configuration
CLIENT=your_google_oauth_client_id
SECRET=your_google_oauth_client_secret

# Server URLs
SERVER=http://localhost:3001
ORIGIN=http://localhost:3000
ORIGINTEST=http://localhost:3000 (optional, for testing)
CLIENT_URL=http://localhost:3000
```

#### **Client Environment Variables** (`client/.env.local`)

```env
# Backend Server URL
NEXT_PUBLIC_SERVER=http://localhost:3001

# EmailJS Configuration (optional, for contact forms)
NEXT_PUBLIC_SERVICE_ID=your_emailjs_service_id
NEXT_PUBLIC_TEMPLATE_ID=your_emailjs_template_id
NEXT_PUBLIC_PUBLIC_KEY=your_emailjs_public_key
```

**Note**: Create `.env` file in the `server` directory and `.env.local` file in the `client` directory with the above variables.

### **Quick Start (Recommended)**

Use the provided `start.sh` script to automatically start both client and server:

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Run the application
./start.sh
```

The script will:

- ✅ Check and install dependencies for both client and server
- ✅ Build the TypeScript server code
- ✅ Start the Express.js server on port 3001
- ✅ Start the Next.js client on port 3000
- ✅ Handle graceful shutdown with Ctrl+C

**Access the application:**

- 🌐 **Client**: http://localhost:3000
- 🔧 **Server**: http://localhost:3001

### **Manual Setup**

If you prefer to run the services separately:

#### **Frontend**

1. Navigate to the `client` folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with required environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```
   The client will run on http://localhost:3000

#### **Backend**

1. Navigate to the `server` folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required environment variables
4. Build the TypeScript code:
   ```bash
   npm run build
   ```
5. Start the backend server:
   ```bash
   npm run start
   ```
   The server will run on http://localhost:3001

---

## 🔒 Authentication

FeedRecap uses **JWT (JSON Web Tokens)** for stateless authentication, providing secure and scalable user authentication.

### **Authentication Methods**

#### **1. Email-Based Authentication**

- **Sign Up**: Users register with email and password

  - Two-step email verification (OTP) required for account creation
  - Password is hashed using bcrypt before storage
  - JWT token issued upon successful registration

- **Sign In**: Users sign in with email and password
  - Credentials verified against MongoDB
  - JWT token issued upon successful authentication

#### **2. Google OAuth Authentication**

- Users can sign up or sign in using their Google account
- OAuth flow handled via Passport.js Google Strategy
- JWT token issued after successful OAuth authentication
- New users are automatically created with default settings

### **JWT Implementation**

#### **Backend (Server)**

- **Token Generation**:

  - Tokens are signed with `userId` and `email` in the payload
  - Default expiration: 7 days (configurable via `JWT_EXPIRES_IN`)
  - Secret key stored in environment variable `JWT_SECRET`
  - Issuer: "feedrecap"

- **Token Verification**:

  - `authenticateJWT` middleware protects authenticated routes
  - Validates token signature and expiration
  - Extracts user information from token payload
  - Attaches user data to request object for route handlers

- **Protected Routes**:
  - `/data` - Fetch user dashboard data
  - `/updateProfiles` - Update custom Twitter profiles
  - `/updateFeedType` - Change feed type (category/custom)
  - `/updateCategories` - Update selected categories
  - `/getIsNewUser` - Check if user is new
  - `/getUserDetails` - Get user account details
  - `/updateAccount` - Update account information
  - `/check-session` - Validate current session
  - `/unlinkX` - Unlink Twitter account
  - And more...

#### **Frontend (Client)**

- **Token Storage**:

  - JWT tokens stored in `localStorage` as `token`
  - Persists across browser sessions
  - Automatically removed on logout or expiration

- **Token Usage**:

  - Axios interceptor automatically adds `Authorization: Bearer <token>` header to all API requests
  - Token validated on app initialization
  - Automatic redirect to sign-in page on token expiration (401 errors)

- **Token Management**:
  - Token retrieved from URL parameters after OAuth redirects
  - Token validated via `/check-session` endpoint
  - Email extracted from token for user context

### **Security Features**

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT token expiration (default 7 days)
- ✅ Token signature verification
- ✅ CORS protection with origin validation
- ✅ Request origin/referer validation
- ✅ Automatic token cleanup on expiration
- ✅ Secure HTTP-only token handling

### **Authentication Flow**

1. **Login/Registration** → Server validates credentials → JWT token generated
2. **Token Storage** → Frontend stores token in localStorage
3. **API Requests** → Axios interceptor adds token to Authorization header
4. **Route Protection** → Backend middleware validates token
5. **Token Expiration** → Frontend detects 401 → Removes token → Redirects to sign-in

---

## 📚 Routes

### **Frontend Routes (Client)**

| Route               | Description                            | Auth Required |
| ------------------- | -------------------------------------- | ------------- |
| `/`                 | Homepage                               | No            |
| `/signin`           | User sign-in page                      | No            |
| `/signup`           | User sign-up page                      | No            |
| `/aboutus`          | Learn more about FeedRecap             | No            |
| `/samplenewsletter` | Preview a sample newsletter            | No            |
| `/dashboard`        | User dashboard with 3 tabs:            | Yes (JWT)     |
|                     | - **Newsfeed**: View top tweets        |               |
|                     | - **Latest Newsletter**: Access recent |               |
|                     | - **Settings**: Manage preferences     |               |
| `/readnewsletter`   | Read newsletter by ID                  | No            |
| `/unsubscribe`      | Unsubscribe from newsletters           | No            |

### **Backend API Routes (Server)**

| Route                   | Method | Description                        | Auth Required |
| ----------------------- | ------ | ---------------------------------- | ------------- |
| `/login`                | POST   | Email/password login               | No            |
| `/register`             | POST   | User registration                  | No            |
| `/logout`               | POST   | User logout                        | Yes (JWT)     |
| `/check-session`        | GET    | Validate JWT token                 | Yes (JWT)     |
| `/data`                 | GET    | Get user dashboard data            | Yes (JWT)     |
| `/updateProfiles`       | POST   | Update custom Twitter profiles     | Yes (JWT)     |
| `/updateFeedType`       | POST   | Change feed type (category/custom) | Yes (JWT)     |
| `/updateCategories`     | POST   | Update selected categories         | Yes (JWT)     |
| `/updateTimes`          | POST   | Update newsletter delivery times   | Yes (JWT)     |
| `/updateAccount`        | POST   | Update user account details        | Yes (JWT)     |
| `/getUserDetails`       | GET    | Get user account information       | Yes (JWT)     |
| `/getIsNewUser`         | GET    | Check if user is new               | Yes (JWT)     |
| `/newsletter/:id`       | GET    | Get newsletter by ID               | No            |
| `/sentOTP`              | POST   | Send OTP for email verification    | No            |
| `/resetPassword`        | POST   | Reset user password                | No            |
| `/validateEmail`        | GET    | Check if email exists              | No            |
| `/saveX`                | POST   | Link Twitter account               | No            |
| `/unlinkX`              | POST   | Unlink Twitter account             | Yes (JWT)     |
| `/auth/google/signup`   | GET    | Google OAuth sign-up               | No            |
| `/auth/google/signin`   | GET    | Google OAuth sign-in               | No            |
| `/auth/google/callback` | GET    | Google OAuth callback              | No            |

---

## 🌟 Why Use FeedRecap?

- **AI-Driven**: Save time by getting top tweets curated with AI (Gemini AI).
- **Personalized**: Choose your favorite categories or custom Twitter profiles.
- **Engaging Content**: Access newsletters with trending tweets and easily share them with friends.
- **Seamless Dashboard**: Stay updated with a user-friendly dashboard.
- **Effortless Automation**: Newsletters and updates are automated with Node Cron.
- **Secure Authentication**: JWT-based stateless authentication for scalability and security.
- **Multiple Auth Options**: Sign in with email or Google OAuth.
- **Easy Setup**: One-command startup with `start.sh` script.

---

## 🔑 Keywords

AI-powered-newsletter personalized-newsletters Twitter-curation top-tweets trending-news AI-curated-content category-based-news custom-twitter-profiles AI-news-delivery tech-newsletters sports-newsletters finance-newsletters politics-newsletters Next.js React Express.js MongoDB TypeScript Google-OAuth Vercel SendGrid JWT-authentication newsletter-app social-media-curation open-source news-dashboard feedrecap curated-tweets trending-topics Axios Node-Cron Gemini-AI automation JWT-tokens stateless-authentication personalized-content AI-newsletter-platform generative-AI-tech time-based-newsletters tweet-curation-tools Twitter-news-integration news-sharing-platform newsletter-dashboard curated-news-updates Twitter-profile-suggestions category-based-curation breaking-news-aggregator AI-newsletter-software JWT-based-auth custom-profile-news delivery-time-preferences trending-tweet-insights automation-with-cron MongoDB-database-newsletter AI-driven-social-curation tailored-newsletters Google-OAuth-authentication React-front-end social-media-newsletters Gemini-AI-integration analytics-for-newsletters SendGrid-email-integration efficient-newsletter-system curated-social-updates open-source-newsletter-platform

---

## 🛡️ License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🌟 How to Contribute

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/YourFeatureName
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeatureName
   ```
5. Open a pull request.

---

## ⭐ Support the Project

If you like this project, please consider **starring** 🌟 the repository on GitHub to support its growth and visibility!

---

## 📧 Contact

For questions or suggestions, feel free to reach out:

- **Author**: [Peal Hasan](https://www.linkedin.com/in/hasanpeal/)
- **Email**: [contact@feedrecap.com](mailto:contact@feedrecap.com)
