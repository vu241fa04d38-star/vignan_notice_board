async function runTests() {
  const BASE = "http://127.0.0.1:5000/api";

  console.log("--- 1. Testing Faculty Login ---");
  const facLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "faculty.cse@vignan.ac.in", password: "password123" }),
  });
  const facData = await facLogin.json();
  console.log(`   Faculty login status: ${facLogin.status}, AdminType: ${facData.user?.adminType}`);
  if (facData.user?.adminType !== "Faculty") throw new Error("Faculty login failed");
  const facultyToken = facData.token;

  console.log("--- 2. Testing Faculty Restricted to Specific Section ONLY ---");
  // Faculty attempts year-level notice without specific section -> MUST FAIL
  const badSectionRes = await fetch(`${BASE}/notices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facultyToken}`,
    },
    body: JSON.stringify({
      title: "Faculty Broadcast Attempt",
      description: "Should fail because section is ALL",
      priority: "Medium",
      audience: {
        scope: "year",
        department: "CSE",
        year: "3rd Year",
        section: "ALL",
      },
    }),
  });
  console.log(`   Faculty broadcast to all classes rejected with status: ${badSectionRes.status} (Expected 403)`);
  if (badSectionRes.status !== 403) throw new Error("Faculty must not be allowed to post to all classes!");

  // Faculty posts to specific section (3rd Year Section A) -> MUST SUCCEED
  const goodSectionRes = await fetch(`${BASE}/notices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${facultyToken}`,
    },
    body: JSON.stringify({
      title: "CSE 3-A Lab Evaluation Slots",
      description: "Lab evaluation schedule for Section A students only.",
      priority: "Medium",
      category: "Academics",
      audience: {
        scope: "section",
        department: "CSE",
        year: "3rd Year",
        section: "A",
      },
    }),
  });
  const goodData = await goodSectionRes.json();
  console.log(`   Faculty specific section notice created: ID ${goodData.id} (Status: ${goodSectionRes.status})`);
  if (goodSectionRes.status !== 201) throw new Error("Faculty specific section notice creation failed");

  console.log("--- 3. Testing Feedback Endpoint (/api/feedback) ---");
  const fbRes = await fetch(`${BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Student Reviewer",
      email: "reviewer@vignan.ac.in",
      category: "Suggestion",
      message: "Great system! Please ensure sports notices are updated early.",
    }),
  });
  const fbData = await fbRes.json();
  console.log(`   Feedback submission status: ${fbRes.status}, Message: "${fbData.message}"`);
  if (fbRes.status !== 201) throw new Error("Feedback submission failed");

  console.log("\n=======================================================");
  console.log("ALL NEW TESTS PASSED WITH 100% SUCCESS! ✨");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
