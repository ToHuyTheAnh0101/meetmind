const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "meetmind_db"
});

async function main() {
  await client.connect();
  
  // 1. Delete all existing system templates
  await client.query("DELETE FROM summary_templates WHERE \"isSystem\" = true");
  console.log("Deleted old system templates.");

  // 2. Read and insert corrected system templates in NFC form
  const dir = "/home/theanh/meetmind/backend/src/modules/summaries/templates";
  const files = [
    "default.json",
    "project-discussion.json",
    "brainstorming.json",
    "retrospective.json",
    "sales-pitch.json",
    "recruitment-interview.json"
  ];
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf8").normalize("NFC");
    const data = JSON.parse(content);
    
    await client.query(
      `INSERT INTO summary_templates (name, description, purpose, "summaryStyle", "globalRules", sections, "isSystem") 
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [data.name, data.description, data.purpose, data.summaryStyle, data.globalRules, JSON.stringify(data.sections)]
    );
    console.log("Successfully seeded system template:", data.name);
  }
  
  await client.end();
}

main().catch(err => {
  console.error("Error seeding templates:", err);
  client.end();
});
