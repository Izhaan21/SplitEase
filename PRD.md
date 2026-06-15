Project overview
SplitEase — a group expense tracker website. 3 pages, 3 devs, 1 week. Each person owns one clear piece so GitHub contributions are clean and visible.
HTML / CSS / JS Firebase Firestore Firebase Hosting
Team roles
Dev 1 — Mobile dev · UI & Design
branch: dev-ui

* Build all HTML pages — Login, Dashboard, Add Expense
* Write all CSS — layout, colors, cards, buttons, responsive
* Make the site look great on both mobile and desktop
* Build the mood selector UI and expense card components
* Own the visual identity of the whole project
Dev 2 — Java dev · JavaScript Logic
branch: dev-logic

* Write all JavaScript — group creation, adding expenses
* Build the balance calculator (who owes who, how much)
* Handle form validation and error messages
* Connect UI events (button clicks) to data actions
* Structure the data objects — Group, Expense, Member
Dev 3 — Firebase dev · Backend & Deploy
branch: dev-firebase

* Set up Firebase project and connect it to the website
* Configure Firebase Auth — email/password login
* Design the Firestore database structure for groups & expenses
* Replace any localStorage with real Firestore read/write calls
* Deploy to Firebase Hosting and share the live URL
Week plan — day by day
Day 1
All Create GitHub repo, each person creates their branch, Firebase dev sets up the Firebase project
Day 2
UI dev Build login page + dashboard layout in HTML/CSS
Logic dev Write the data model — Group, Member, Expense objects in JS
Firebase dev Set up Firebase Auth + Firestore collections structure
Day 3
UI dev Build expense cards, group list, balance summary UI
Logic dev Write balance calculator + form validation logic
Firebase dev Write Firestore read/write functions for groups & expenses
Day 4
All Open pull requests → review each other's code → merge into `main` → fix conflicts together
Day 5
Firebase dev Run `firebase deploy` — get the live URL
All Test on real devices, report bugs as GitHub Issues
Day 6–7
All Fix bugs, polish UI, write README with screenshots + live link, pin repo on each GitHub profile
GitHub workflow — do this every day
1
Pull latest changes
`git pull origin main` — start every day with this so you don't fall behind
2
Work on your branch
`git checkout dev-ui` (or your branch) — never commit directly to main
3
Commit your work daily
`git add .` then `git commit -m "feat: add expense card UI"` — small commits daily = healthy contribution graph
4
Push and open a Pull Request
`git push origin dev-ui` → go to GitHub → open a PR → ask a teammate to review it before merging
5
Use GitHub Issues for tasks
Create one Issue per feature. Assign it to yourself. Close it when done. This makes your project look professional.
Firestore data structure — for Dev 3

```
groups/
  {groupId}/
    name: "Goa Trip"
    members: ["Arjun", "Simran", "Raj"]
    createdBy: {userId}
    createdAt: timestamp

    expenses/
      {expenseId}/
        desc: "Hotel"
        amount: 3000
        payer: "Arjun"
        splitWith: ["Arjun", "Simran", "Raj"]
        perPerson: 1000
        date: timestamp
```

Firebase Auth code ↗Firestore functions ↗GitHub repo setup ↗Project overview
SplitEase — a group expense tracker website. 3 pages, 3 devs, 1 week. Each person owns one clear piece so GitHub contributions are clean and visible.
HTML / CSS / JS Firebase Firestore Firebase Hosting
Team roles
Dev 1 — Mobile dev · UI & Design
branch: dev-ui

* Build all HTML pages — Login, Dashboard, Add Expense
* Write all CSS — layout, colors, cards, buttons, responsive
* Make the site look great on both mobile and desktop
* Build the mood selector UI and expense card components
* Own the visual identity of the whole project
Dev 2 — Java dev · JavaScript Logic
branch: dev-logic

* Write all JavaScript — group creation, adding expenses
* Build the balance calculator (who owes who, how much)
* Handle form validation and error messages
* Connect UI events (button clicks) to data actions
* Structure the data objects — Group, Expense, Member
Dev 3 — Firebase dev · Backend & Deploy
branch: dev-firebase

* Set up Firebase project and connect it to the website
* Configure Firebase Auth — email/password login
* Design the Firestore database structure for groups & expenses
* Replace any localStorage with real Firestore read/write calls
* Deploy to Firebase Hosting and share the live URL
Week plan — day by day
Day 1
All Create GitHub repo, each person creates their branch, Firebase dev sets up the Firebase project
Day 2
UI dev Build login page + dashboard layout in HTML/CSS
Logic dev Write the data model — Group, Member, Expense objects in JS
Firebase dev Set up Firebase Auth + Firestore collections structure
Day 3
UI dev Build expense cards, group list, balance summary UI
Logic dev Write balance calculator + form validation logic
Firebase dev Write Firestore read/write functions for groups & expenses
Day 4
All Open pull requests → review each other's code → merge into `main` → fix conflicts together
Day 5
Firebase dev Run `firebase deploy` — get the live URL
All Test on real devices, report bugs as GitHub Issues
Day 6–7
All Fix bugs, polish UI, write README with screenshots + live link, pin repo on each GitHub profile
GitHub workflow — do this every day
1
Pull latest changes
`git pull origin main` — start every day with this so you don't fall behind
2
Work on your branch
`git checkout dev-ui` (or your branch) — never commit directly to main
3
Commit your work daily
`git add .` then `git commit -m "feat: add expense card UI"` — small commits daily = healthy contribution graph
4
Push and open a Pull Request
`git push origin dev-ui` → go to GitHub → open a PR → ask a teammate to review it before merging
5
Use GitHub Issues for tasks
Create one Issue per feature. Assign it to yourself. Close it when done. This makes your project look professional.
Firestore data structure — for Dev 3

```
groups/
  {groupId}/
    name: "Goa Trip"
    members: ["Arjun", "Simran", "Raj"]
    createdBy: {userId}
    createdAt: timestamp

    expenses/
      {expenseId}/
        desc: "Hotel"
        amount: 3000
        payer: "Arjun"
        splitWith: ["Arjun", "Simran", "Raj"]
        perPerson: 1000
        date: timestamp
```

Firebase Auth code ↗Firestore functions ↗GitHub repo setup ↗