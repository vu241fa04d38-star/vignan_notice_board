import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import { Notice } from "./models/Notice.js";
import { User } from "./models/User.js";
import { ALLOWED_COLLEGES } from "./models/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server folder
dotenv.config({
  path: path.join(__dirname, ".env")
});

// Require Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI not found in server/.env");
  process.exit(1);
}

if (!MONGODB_URI.startsWith("mongodb+srv://")) {
  console.error("ERROR: Expected a MongoDB Atlas connection string.");
  process.exit(1);
}
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const offsetDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISO(d);
};

const college = ALLOWED_COLLEGES[0]; // Vignan Foundation for Science, Technology and Research (Deemed to be University)

async function seed() {
  try {
    console.log("Connecting to MongoDB at:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✓ Connected to MongoDB");

    await Notice.deleteMany({});
    await User.deleteMany({});
    console.log("✓ Cleared old notices and users");

    // 1. Seed Staff / Admins
    const dean = new User({
      name: "Dr. K. V. Sharma (Dean Academics)",
      email: "dean@vignan.ac.in",
      password: "password123",
      role: "admin",
      adminType: "Dean",
      status: "approved",
      college,
      department: "ALL",
      year: "ALL",
      section: "ALL",
    });
    await dean.save();

    const hodCse = new User({
      name: "Dr. M. S. Rao (HOD - CSE)",
      email: "hod.cse@vignan.ac.in",
      password: "password123",
      role: "admin",
      adminType: "HOD",
      status: "approved",
      college,
      department: "CSE",
      year: "ALL",
      section: "ALL",
    });
    await hodCse.save();

    const facultyCse = new User({
      name: "Prof. Ananya V. (Assistant Professor)",
      email: "faculty.cse@vignan.ac.in",
      password: "password123",
      role: "admin",
      adminType: "Faculty",
      status: "approved",
      college,
      department: "CSE",
      year: "3rd Year",
      section: "A",
    });
    await facultyCse.save();

    // A pending faculty account to test Dean / HOD approval workflow
    const pendingFaculty = new User({
      name: "Dr. S. K. Verma (New Faculty Applicant)",
      email: "pending.faculty@vignan.ac.in",
      password: "password123",
      role: "admin",
      adminType: "Faculty",
      status: "pending",
      college,
      department: "CSE",
      year: "2nd Year",
      section: "B",
    });
    await pendingFaculty.save();

    // 2. Seed Students with validated registration numbers
    const student1 = new User({
      name: "Basheer (CSE 3rd Yr Sec-A)",
      email: "221fa04001@vignan.ac.in",
      password: "password123",
      role: "student",
      adminType: "None",
      status: "approved",
      college,
      department: "CSE",
      year: "3rd Year",
      section: "A",
      regNo: "221FA04001",
    });
    await student1.save();

    const student2 = new User({
      name: "Rahul (CSE 3rd Yr Sec-B)",
      email: "221fa04002@vignan.ac.in",
      password: "password123",
      role: "student",
      adminType: "None",
      status: "approved",
      college,
      department: "CSE",
      year: "3rd Year",
      section: "B",
      regNo: "221FA04002",
    });
    await student2.save();

    const student3 = new User({
      name: "Priya (ECE 2nd Yr Sec-A)",
      email: "231fa05001@vignan.ac.in",
      password: "password123",
      role: "student",
      adminType: "None",
      status: "approved",
      college,
      department: "ECE",
      year: "2nd Year",
      section: "A",
      regNo: "231FA05001",
    });
    await student3.save();

    console.log("✓ Seeded users with roles, admin types, and reg numbers.");

    // 3. Seed Notices with Audiences and CreatedBy
    const sampleNotices = [
      {
        title: "Mid-Semester Examination Schedule & Regulations",
        description: "Official college-wide mid-term examination timetable for all branches.",
        details: "Examinations commence next week. Hall tickets will be issued through the student portal. Possession of electronic devices inside examination halls is strictly prohibited.",
        category: "Exams",
        priority: "High",
        pinned: true,
        college,
        createdBy: {
          id: dean._id,
          name: dean.name,
          adminType: "Dean",
          department: "ALL",
        },
        audience: {
          scope: "college",
          department: "ALL",
          year: "ALL",
          section: "ALL",
        },
        date: offsetDate(-1),
        deadline: offsetDate(7),
        googleLinks: [
          { title: "Exam Regulations & Timetable Sheet", url: "https://docs.google.com/document/d/midsem-timetable-2026" },
        ],
      },
      {
        title: "CSE Department Annual Hackathon & Coding Contest",
        description: "Department-wide 24hr software building competition. Open to all CSE years.",
        details: "Teams of 3 to 4 students from CSE department can submit their problem statements. Winners receive internship referrals and cash awards.",
        category: "Events",
        priority: "High",
        pinned: true,
        college,
        createdBy: {
          id: hodCse._id,
          name: hodCse.name,
          adminType: "HOD",
          department: "CSE",
        },
        audience: {
          scope: "department",
          department: "CSE",
          year: "ALL",
          section: "ALL",
        },
        date: offsetDate(-2),
        deadline: offsetDate(5),
        googleLinks: [
          { title: "Hackathon Registration (Google Forms)", url: "https://forms.gle/cse-hackathon-2026" },
        ],
      },
      {
        title: "3rd Year CSE: TechNova Summer Internship Drive",
        description: "Campus recruitment drive for 3rd year CSE students with 7.0+ CGPA.",
        details: "TechNova is hiring software engineering interns for the upcoming summer. Resume screening will be followed by a coding round on HackerEarth.",
        category: "Placements",
        priority: "Medium",
        pinned: false,
        college,
        createdBy: {
          id: facultyCse._id,
          name: facultyCse.name,
          adminType: "Faculty",
          department: "CSE",
        },
        audience: {
          scope: "year",
          department: "CSE",
          year: "3rd Year",
          section: "ALL",
        },
        date: offsetDate(-3),
        deadline: offsetDate(4),
        poll: {
          question: "Which role are you primarily targeting?",
          options: [
            { text: "Full Stack Development", votes: [student1._id] },
            { text: "AI / Machine Learning", votes: [student2._id] },
            { text: "DevOps & Cloud Systems", votes: [] },
          ],
        },
      },
      {
        title: "CSE 3rd Year Sec-A: Advanced DSA Lab Viva Schedule",
        description: "Specific viva date and laboratory room allocations for Section A students.",
        details: "Section A students must present their completed lab manuals and execute one graph algorithm problem live during their allocated 30-minute slot.",
        category: "Academics",
        priority: "Medium",
        pinned: false,
        college,
        createdBy: {
          id: facultyCse._id,
          name: facultyCse.name,
          adminType: "Faculty",
          department: "CSE",
        },
        audience: {
          scope: "section",
          department: "CSE",
          year: "3rd Year",
          section: "A",
        },
        date: offsetDate(-1),
        deadline: offsetDate(2),
      },
      {
        title: "ECE Department: Microcontroller & IoT Project Exhibition",
        description: "Project showcase for all Electronics & Communication Engineering students.",
        details: "Hardware kits will be set up in the ECE Embedded Systems lab. Guest evaluators from industry will review student prototypes.",
        category: "Events",
        priority: "Medium",
        pinned: false,
        college,
        createdBy: {
          id: dean._id,
          name: dean.name,
          adminType: "Dean",
          department: "ALL",
        },
        audience: {
          scope: "department",
          department: "ECE",
          year: "ALL",
          section: "ALL",
        },
        date: offsetDate(-4),
        deadline: offsetDate(6),
      },
    ];

    const inserted = await Notice.insertMany(sampleNotices);
    console.log(`✓ Seeded ${inserted.length} notices with audience rules.`);

    // Give students some read receipts
    student1.readNoticeIds = [inserted[0]._id, inserted[1]._id];
    await student1.save();

    student2.readNoticeIds = [inserted[0]._id];
    await student2.save();

    student3.readNoticeIds = [inserted[0]._id, inserted[4]._id];
    await student3.save();

    console.log("\n=======================================================");
    console.log("SEEDED DEMO ACCOUNTS:");
    console.log("Dean:            dean@vignan.ac.in             / password123 (All-College Access)");
    console.log("HOD (CSE):       hod.cse@vignan.ac.in          / password123 (CSE Dept Access)");
    console.log("Faculty (CSE):   faculty.cse@vignan.ac.in      / password123 (CSE 3rd Yr A)");
    console.log("Pending Faculty: pending.faculty@vignan.ac.in  / password123 (Awaiting Approval)");
    console.log("Student 1:       221fa04001@vignan.ac.in       / password123 (CSE 3rd Yr Sec-A)");
    console.log("Student 2:       221fa04002@vignan.ac.in       / password123 (CSE 3rd Yr Sec-B)");
    console.log("Student 3:       231fa05001@vignan.ac.in       / password123 (ECE 2nd Yr Sec-A)");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("✕ Seeding error:", err);
    process.exit(1);
  }
}

seed();
