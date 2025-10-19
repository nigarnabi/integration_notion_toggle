require("dotenv").config();
console.log(
  "NOTION_WEBHOOK_SECRET exists:",
  !!process.env.NOTION_WEBHOOK_SECRET
);

if (process.env.NOTION_WEBHOOK_SECRET) {
  console.log(
    "NOTION_WEBHOOK_SECRET length:",
    process.env.NOTION_WEBHOOK_SECRET.length
  );
  if (process.env.NOTION_WEBHOOK_SECRET.endsWith("\n")) {
    console.warn("⚠️ NOTION_WEBHOOK_SECRET ends with a newline!");
  }
}
