# College Notice Priority Board (Full Stack: React + Express + MongoDB)

An institutional-grade, full-stack college notice board built with **React + Vite** and **Node.js + Express + MongoDB (Mongoose)**, featuring server-enforced role permissions, staff approval workflows, and audience-targeted notice routing.

---

## 🏛️ Staff & Admin Permissions Matrix (Server-Enforced)

Permissions are strictly validated on the server for every operation—client buttons are purely for UI convenience:

| Role / Designation | Audience Scope | Allowed Priorities | Pin Notices | Edit Notices | Delete Notices | Staff Approvals |
|---|---|---|---|---|---|---|
| **Faculty** | Own Dept, Year, or Section only | `Medium`, `Low` (High requires HOD/Dean) | ❌ No | Own notices only | Own notices only | ❌ No |
| **HOD** | Department-wide, Year, or Section | `High`, `Medium`, `Low` | ✅ Within Department | Any notice in Dept | Any notice in Dept | ✅ Approve Faculty in Dept |
| **Dean** | College-wide or any Department | `High`, `Medium`, `Low` | ✅ Any notice | Any notice in College | Any notice in College | ✅ Approve HODs & Faculty |

---

## 🛡️ Key Architectural Upgrades

### 1. Secure Staff Sign-Up & Approval Workflow
* **No Unverified Admins**: Admin sign-ups without a Dean's invite code land in a `pending approval` status.
* **Server Block**: Pending accounts cannot log in (returns `403 Forbidden` with a clear explanation).
* **Approvals Portal**: Deans and HODs have an **Approvals** screen to review, approve, or reject pending staff registrations.
* **Instant Verification Option**: Staff with an authorized Dean's invite code (`FACULTY2026`, `HOD2026`, `DEAN2026`) are auto-approved.

### 2. Unified Sign-In
* **No Role on Login**: Sign-in only asks for institutional email and password. The server inspects the authenticated account and automatically routes the user to their appropriate dashboard.
* **Anti-Enumeration Security**: Uniform error message (`"Invalid email or password"`) for both wrong email and wrong password.
* **Rate Limiting**: In-memory lockout protects against brute-force login attempts.

### 3. Clean Student Academic Credentials
* **College Dropdown**: Pre-defined institutional selection (`ALLOWED_COLLEGES`) prevents misspellings.
* **Registration Number Validation**: Format enforced (8–12 alphanumeric characters, e.g. `221FA04001`) and guaranteed unique per college.
* **Targeting Dimensions**: Department, Year (1st–4th), and Section (A–D).
* **Minimal Data Liability**: No personal data (phone numbers, addresses, Aadhaar, or DOB) is collected.

### 4. Audience-Targeted Notice Isolation
* Notices carry structured `audience` objects (`scope`: college, department, year, section).
* On `GET /api/notices`, the server filters notices so students only receive announcements that match their exact college, department, study year, and section. Notices for other sections or departments are isolated on the server.

---

## ⚡ Seeded Demo Accounts (Password for all: `password123`)

| Role | Email | Academic / Staff Position | Permissions & Access |
|---|---|---|---|
| **Dean** | `dean@vignan.ac.in` | Dr. K. V. Sharma • Dean Academics | College-wide notices, all priorities, pin/delete any notice, approve staff |
| **HOD** | `hod.cse@vignan.ac.in` | Dr. M. S. Rao • HOD - CSE | CSE Department notices, High priority, pin/delete CSE notices, approve faculty |
| **Faculty** | `faculty.cse@vignan.ac.in` | Prof. Ananya • CSE Dept (3rd Yr A) | Post to CSE 3rd Yr A, Medium/Low priority, edit/delete own notices only |
| **Pending Staff** | `pending.faculty@vignan.ac.in` | Dr. S. K. Verma • Applicant | Tests server approval block (cannot log in until approved) |
| **Student 1** | `221fa04001@vignan.ac.in` | Basheer • **CSE • 3rd Year • Sec-A** | Sees College notices, CSE Dept notices, 3rd Year notices, and Sec-A notices |
| **Student 2** | `221fa04002@vignan.ac.in` | Rahul • **CSE • 3rd Year • Sec-B** | Isolated: Cannot see Sec-A specific notices |
| **Student 3** | `231fa05001@vignan.ac.in` | Priya • **ECE • 2nd Year • Sec-A** | Isolated: Sees ECE and College notices only |

---

## 🚀 How to Run

### 1. Start Backend API
```bash
cd server
npm run dev
```

### 2. Start Frontend App
In a separate terminal:
```bash
npm run dev
```

### 3. Reset / Seed Database at any time:
```bash
npm run seed --prefix server
```

### 4. Run Automated Security & Architecture Tests:
```bash
npm run test --prefix server
```
