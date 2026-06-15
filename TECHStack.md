# SplitEase – Tech Stack Specification

## Frontend

### HTML5

Purpose:

* Page Structure
* Forms
* Layout Components

Pages:

* Login Page
* Dashboard Page
* Add Expense Page

---

### CSS3

Purpose:

* Styling
* Responsive Design
* Animations
* Layout System

Features:

* Flexbox
* CSS Grid
* Media Queries
* Custom Variables
* Smooth Transitions

---

### JavaScript (Vanilla JS)

Purpose:

* Client-side Logic
* Form Handling
* Balance Calculations
* Event Management
* Firebase Integration

Responsibilities:

* Group Creation
* Expense Creation
* Expense Calculations
* Input Validation
* Dynamic UI Updates

---

## Backend

### Firebase

Purpose:

* Backend-as-a-Service (BaaS)

Services Used:

* Firebase Authentication
* Cloud Firestore
* Firebase Hosting

---

## Authentication

### Firebase Authentication

Method:

* Email & Password Authentication

Features:

* Register User
* Login User
* Logout User
* Session Persistence
* Route Protection

---

## Database

### Cloud Firestore

Database Type:

* NoSQL Document Database

Collections:

groups/
expenses/
users/

Purpose:

* Store Groups
* Store Expenses
* Store User Data
* Real-time Data Sync

---

## Hosting

### Firebase Hosting

Purpose:

* Deploy Production Website

Features:

* HTTPS
* Fast CDN Delivery
* Easy Deployment
* Custom Domain Support

Deployment Command:

firebase deploy

---

## Version Control

### Git

Purpose:

* Source Code Management
* Branch Management
* Team Collaboration

---

### GitHub

Purpose:

* Repository Hosting
* Pull Requests
* Issue Tracking
* Code Reviews
* Contribution Tracking

Branches:

main
dev-ui
dev-logic
dev-firebase

---

## Development Tools

### Visual Studio Code

Purpose:

* Code Editor

Recommended Extensions:

* Live Server
* Firebase Tools
* Prettier
* GitLens
* ESLint

---

## Project Architecture

Frontend
│
├── HTML
├── CSS
└── JavaScript
│
▼

Firebase Authentication
│
▼

Cloud Firestore
│
▼

Firebase Hosting

---

## Folder Structure

SplitEase/

├── index.html
├── dashboard.html
├── add-expense.html

├── css/
│   ├── style.css
│   ├── dashboard.css
│   └── expense.css

├── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── expense.js
│   ├── balance.js
│   └── firebase.js

├── assets/
│   ├── images/
│   ├── icons/
│   └── logo/

├── firebase/
│   └── firebase-config.js

├── README.md

└── .gitignore

---

## Technical Requirements

* Responsive Design
* Mobile First Approach
* Firebase Authentication
* Firestore Database Integration
* Secure User Sessions
* Clean Code Structure
* Modular JavaScript Files
* Cross-Browser Compatibility
* Fast Loading Performance

---

## Final Stack Summary

Frontend:

* HTML5
* CSS3
* Vanilla JavaScript

Backend:

* Firebase Authentication
* Cloud Firestore

Deployment:

* Firebase Hosting

Version Control:

* Git
* GitHub

Design Style:

* Modern SaaS Dashboard
* Dark Theme
* Mobile Responsive