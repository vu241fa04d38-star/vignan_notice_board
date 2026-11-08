import { offsetDate } from "../utils.js";

export const CATEGORIES = ["Exams", "Academics", "Events", "Placements", "Fees", "General"];
export const PRIORITIES = ["High", "Medium", "Low"];

// [id, title, short description, details, category, priority, posted (days ago), deadline (days from today or null), pinned]
const rows = [
  [1, "Mid-Semester Exam Timetable Released", "Download your branch timetable and collect your hall ticket.", "The timetable is on the exam portal. Hall tickets are issued from the exam section between 10 AM and 4 PM. Carry your college ID to every exam.", "Exams", "High", 1, 9, true],
  [2, "Last Date for Fee Payment", "Pay the semester fee before the deadline to avoid a late fine.", "A late fine of Rs. 500 per week applies after the deadline. Pay online through the college portal or at the accounts office counter.", "Fees", "High", 2, 3, false],
  [3, "Campus Placement Drive: TechNova", "Final-year students with 7+ CGPA can register on the placement portal.", "Eligible students must upload an updated resume and register on the placement portal. Shortlisted students will get an aptitude test slot by email.", "Placements", "High", 3, 5, false],
  [4, "Guest Lecture on Generative AI", "Industry expert session in the Seminar Hall. Open to all branches.", "Seats are limited to 200. Carry your ID card for entry. A certificate of participation will be issued.", "Events", "Medium", 4, null, false],
  [5, "Lab Record Submission", "Submit completed lab records to your faculty in-charge.", "Records must be signed on every page. Late submissions lose internal marks.", "Academics", "Medium", 5, 2, false],
  [6, "Annual Sports Meet Registrations", "Register for track and team events with the PE department.", "Team entries need a captain's name and a list of five to eight players. Individual events are open to all students.", "Events", "Low", 6, 7, false],
  [7, "Library Timings Extended", "The central library stays open until 9 PM during exams.", "Extended hours apply on all working days. Reading hall seats cannot be reserved.", "General", "Low", 7, null, false],
  [8, "Scholarship Document Verification", "Verify documents at the admin office for state scholarships.", "Bring original income, caste (if applicable) and bank passbook documents along with one photocopy set.", "Academics", "High", 8, -1, false],
  [9, "Hackathon: Build for Campus", "24-hour college hackathon. Teams of 3-4. Prizes for the top three.", "Build a tool that solves a real campus problem. Register your team with a one-line idea. Food and workspace are provided.", "Events", "Medium", 9, 12, false],
];

export const makeSeedNotices = () =>
  rows.map(([id, title, description, details, category, priority, ago, due, pinned]) => ({
    id, title, description, details, category, priority, pinned,
    date: offsetDate(-ago),
    deadline: due === null ? "" : offsetDate(due),
    isRead: false,
  }));
