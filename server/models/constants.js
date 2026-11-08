export const ALLOWED_COLLEGES = [
  "Vignan Foundation for Science, Technology and Research (Deemed to be University)",
  "Vignan's Institute of Information Technology (VIIT)",
  "Vignan's Nirula Institute of Technology for Women (VNITW)",
];

export const DEPARTMENTS = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL"];

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const SECTIONS = ["A", "B", "C", "D"];

export const ADMIN_TYPES = ["Faculty", "HOD", "Dean"];

export const AUDIENCE_SCOPES = ["college", "department", "year", "section"];

// Standard invite codes for staff bypass of pending queue
export const STAFF_INVITE_CODES = {
  Faculty: process.env.INVITE_CODE_FACULTY || "FACULTY2026",
  HOD: process.env.INVITE_CODE_HOD || "HOD2026",
  Dean: process.env.INVITE_CODE_DEAN || "DEAN2026",
};
