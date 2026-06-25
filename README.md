# SplitEase 💸

SplitEase is a simple, intuitive group expense tracker website designed to help friends and teams keep track of shared expenses, calculate balances, and see who owes who.

## 🚀 Features

- **User Authentication:** Secure email and password login using Firebase Authentication.
- **Group Management:** Create groups and add members to keep expenses organized.
- **Expense Tracking:** Add new expenses, specify the payer, and automatically split costs among members.
- **Balance Calculator:** Automatically calculates who owes whom and how much, simplifying settlements.
- **Real-time Sync:** Uses Cloud Firestore to keep data synced across devices instantly.
- **Responsive Design:** A beautiful, modern interface that works perfectly on both mobile and desktop.

## 🛠️ Tech Stack

**Frontend:**
- HTML5
- CSS3 (Flexbox, Grid, Custom Variables)
- Vanilla JavaScript

**Backend & Deployment:**
- Firebase Authentication (Email/Password)
- Cloud Firestore (NoSQL Database)
- Firebase Hosting

## 📂 Project Structure

```
SplitEase/
├── index.html           # Landing / Login page
├── dashboard.html       # Main dashboard showing groups and summary
├── add-expense.html     # Page to add a new expense
├── group.html           # Group details and expenses
├── profile.html         # User profile
├── settings.html        # App settings
├── css/                 # Stylesheets
├── js/                  # Vanilla JS logic (Auth, Firestore, UI handlers)
├── assets/              # Images and icons
├── firestore.rules      # Firestore security rules
└── package.json         # Node dependencies (if any)
```

## 💻 Getting Started

### Prerequisites

- A modern web browser.
- A Firebase project setup (for backend functionality).
- VS Code (recommended) with Live Server extension.

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/SplitEase.git
   cd SplitEase
   ```

2. **Configure Firebase:**
   - Create a project on [Firebase Console](https://console.firebase.google.com/).
   - Enable **Email/Password Authentication**.
   - Create a **Firestore Database** and update the security rules based on `firestore.rules`.
   - Get your Firebase config object and add it to your JavaScript initialization (typically in a file like `js/firebase-config.js` or directly in your modules).

3. **Run Locally:**
   - Open the project in VS Code.
   - Use the **Live Server** extension to serve `index.html`.

4. **Deploy:**
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login to Firebase: `firebase login`
   - Initialize project: `firebase init` (Select Firestore and Hosting)
   - Deploy: `firebase deploy`

## 🤝 Contribution Workflow

This project uses a collaborative Git workflow:

1. **Pull latest changes:** Start your day by pulling the latest code from `main`.
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create a branch:** Never commit directly to `main`. Create a branch for your feature.
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit often:** Make small, descriptive commits.
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
4. **Push and PR:** Push your branch and open a Pull Request on GitHub. Ask a teammate for a review.
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 License

© [Current Year] Izhaan. All Rights Reserved.

This project and its source code are proprietary. You may **not** use, copy, modify, distribute, or publish this project or any part of it without explicit prior written permission from the owner.

While we welcome pull requests and contributions to improve the project, submitting a contribution does not grant you ownership rights or permission to use the project outside of this repository. By contributing, you agree that your contributions become part of the proprietary repository under the owner's exclusive control.
