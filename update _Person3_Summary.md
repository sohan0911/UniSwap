# Sprint 3 - Person 3: User Profile Page - Deliverables

This document summarizes the changes made to implement the User Profile Page requirement.

## 🚀 Tasks Completed:

1.  **Route Creation:**
    *   Added a dynamic route `/users/:id` in `app/app.js` to handle user profile requests.
2.  **Database Integration:**
    *   Modified the route logic to fetch user details from the `users` table.
    *   Added logic to retrieve all listings associated with the specific user using their `user_id`.
3.  **PUG Template:**
    *   Created `app/views/profile.pug` to display user information (Name, Email, Role) and their academic resource listings.
    *   Added responsive CSS styling directly into the Pug file for a premium look.
4.  **Database Schema Update:**
    *   Updated `sd2-db.sql` to include the `users` and `listings` tables with appropriate foreign key relationships and sample data.

---

## 🛠️ Modified Files:

*   [app/app.js](file:///C:/Users/DELL/Downloads/UniSwap-main/UniSwap-main/app/app.js) - Added the `/users/:id` route.
*   [app/views/profile.pug](file:///C:/Users/DELL/Downloads/UniSwap-main/UniSwap-main/app/views/profile.pug) - Created the user profile view.
*   [sd2-db.sql](file:///C:/Users/DELL/Downloads/UniSwap-main/UniSwap-main/sd2-db.sql) - Updated database schema and data.

---

## ⚙️ How to Test:
1.  Ensure your MySQL database is updated with the latest `sd2-db.sql`.
2.  Run the application using `npm start` or `docker-compose up`.
3.  Navigate to `http://localhost:3000/users/1` to view "John Doe's" profile and his listings.
4.  Navigate to `http://localhost:3000/users/2` to view "Jane Smith's" profile.

---

## GitHub Commit Recommendation:
**Message:** `feat: Implement User Profile page (Sprint 3 - Person 3) - Added /users/:id route, profile template, and DB schema updates`
