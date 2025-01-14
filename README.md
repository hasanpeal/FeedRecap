# FeedRecap

![FeedRecap Logo](https://www.feedrecap.com/icons8-feed-50.png)

**FeedRecap** is an AI-powered newsletter platform that curates top tweets from Twitter, delivering them directly to your inbox. Whether you're interested in categories like politics, tech, sports, or entertainment, or you prefer following custom Twitter profiles, FeedRecap makes staying informed effortless and personalized.

---

## 🚀 Live Demo

🌐 **Website**: [FeedRecap](https://www.feedrecap.com)

🔗 **Repository**: [GitHub - FeedRecap](https://github.com/hasanpeal/FeedRecap.git)

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
- Receive AI-curated newsletters with the top 15 tweets from your selected categories and share feature for easy sharing with your friends.

### 🔧 **Custom Profile Mode**
- Add Twitter profiles via an auto-suggestion feature.
- Follow as many Twitter profiles as you like.
- Get personalized newsletters based on your custom profile feed.

### 📊 **Dashboard**
- Access your personalized dashboard with these tabs:
  1. **Newsfeed**: View top tweets based on your selected categories or custom profiles.
  2. **Latest Newsletter**: Access the most recent newsletters.
  3. **Settings**: Update your categories, custom profiles, timezone, and delivery time.

### 📩 **Newsletter Features**
- **Newsletter**: AI-powered newsletter content.
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
- **Analytics**: Google Analytics, Vercel Analytics
- **Deployed On**: [Vercel](https://vercel.com)

### **Backend**
- **Framework**: Express.js
- **Authentication**: Google OAuth, Email-based login with two-step verification
- **Database**: MongoDB
- **Session Management**: Redis store, Express session
- **API**: SendGrid, Gemini AI
- **Language**: TypeScript
- **Dev Tool**: Nodemon, Mongodb Atlas, Postman
- **Generative AI**: Gemini

---

## 🗂️ Project Structure

```plaintext
FeedRecap/
├── client/   # Frontend (Next.js)
├── server/   # Backend (Express.js)
```

---

## 🧑‍💻 Getting Started

### **Frontend**
1. Navigate to the `client` folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### **Backend**
1. Navigate to the `server` folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm run start
   ```

---

## 🔒 Authentication

### **Sign Up**
- Users can sign up with their email.
- Two-step email verification is required for account creation.

### **Sign In**
- **Options**:
  1. Sign in with email.
  2. Sign in with Google.

---

## 📚 Routes

| Route                | Description                                |
|----------------------|--------------------------------------------|
| `/signin`            | User sign-in page                         |
| `/signup`            | User sign-up page                         |
| `/`                  | Homepage                                  |
| `/samplenewsletter`  | Preview a sample newsletter               |
| `/aboutus`           | Learn more about FeedRecap                |
| `/dashboard`         | User dashboard with 3 tabs:               |
|                      | - **Newsfeed**: View top tweets           |
|                      | - **Latest Newsletter**: Access recent    |
|                      | - **Settings**: Manage preferences        |

---

## 🌟 Why Use FeedRecap?

- **AI-Driven**: Save time by getting top tweets curated with AI.
- **Personalized**: Choose your favorite categories or custom Twitter profiles.
- **Engaging Content**: Access newsletters with trending tweets and easily share them with friends.
- **Seamless Dashboard**: Stay updated with a user-friendly dashboard.

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
