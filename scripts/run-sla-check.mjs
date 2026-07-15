const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const jobSecret = process.env.JOB_SECRET;

if (!siteUrl || !jobSecret) {
  console.error("NEXT_PUBLIC_SITE_URL and JOB_SECRET are required.");
  process.exit(1);
}

const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/jobs/sla-check`, {
  method: "POST",
  headers: {
    "x-job-secret": jobSecret
  }
});

const payload = await response.text();

if (!response.ok) {
  console.error(payload);
  process.exit(1);
}

console.log(payload);
