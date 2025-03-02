import { NextResponse } from "next/server";
import playwright from "playwright";

const FORTUNE_500_COMPANIES = [
  "Apple", "Microsoft", "Amazon", "Google", "Meta", "Tesla", "JP Morgan", "Walmart",
  "Berkshire Hathaway", "UnitedHealth", "ExxonMobil", "Chevron", "Ford", "IBM", 
  "Goldman Sachs", "Johnson & Johnson", "Pfizer", "Coca-Cola", "PepsiCo", "Intel",
  "Cisco", "Oracle", "Bank of America", "AT&T", "Verizon", "General Motors", "Home Depot",
  "Wells Fargo", "Citigroup", "Nike", "Puma", "Procter & Gamble", "Dell", "American Express",
  "3M", "Honeywell", "Lockheed Martin", "Boeing", "Disney", "Starbucks", "UPS", "FedEx",
  "Salesforce", "Qualcomm", "Morgan Stanley", "Caterpillar", "Best Buy", "CVS Health",
  "American Airlines", "Capital One", "Uber", "Lyft", "PayPal", "Adobe", "Netflix",
  "Visa", "Mastercard", "Costco", "Johnson Controls", "General Electric", "Raytheon",
  "Marriott", "Southwest Airlines", "General Dynamics", "HP", "Uber Technologies",
  "Abbott Laboratories", "Bristol Myers Squibb", "Eli Lilly", "Medtronic", "Merck",
  "United Airlines", "Hilton", "T-Mobile", "Broadcom", "AMD", "Micron Technology",
  "Applied Materials", "Chubb", "PNC Financial Services", "Cigna", "AIG", "Progressive",
  "Allstate", "State Farm", "Coca-Cola Bottling Co", "Estee Lauder", "Colgate-Palmolive",
  "Kraft Heinz", "McDonald's", "Yum Brands", "Domino's", "Darden Restaurants",
  "Tractor Supply", "Tesla Energy", "Halliburton", "Schlumberger", "ConocoPhillips",
  "Phillips 66", "Dow Chemical", "Eaton", "Danaher", "Northrop Grumman", "SpaceX",
  "Blue Origin", "Berkshire Hathaway Energy", "Exelon", "Duke Energy", "NextEra Energy",
  "American Electric Power", "Southern Company", "PG&E", "Xcel Energy", "Dominion Energy"
];

// 🔹 Job Title Synonyms Mapping
const JOB_TITLE_SYNONYMS: Record<string, string[]> = {
  "software engineer": ["developer", "software developer", "programmer", "full stack developer", "backend engineer", "frontend developer"],
  "data scientist": ["machine learning engineer", "data analyst", "AI engineer", "big data engineer", "statistical analyst"],
  "product manager": ["product owner", "business analyst", "program manager", "product strategist"],
  "marketing specialist": ["digital marketer", "SEO specialist", "content marketer", "growth hacker"],
  "cybersecurity analyst": ["security engineer", "information security analyst", "penetration tester", "ethical hacker"],
  "financial analyst": ["investment analyst", "portfolio analyst", "risk analyst", "economic analyst"],
  "sales representative": ["business development representative", "account executive", "sales manager"],
  "human resources": ["HR specialist", "talent acquisition", "recruiter", "HR manager"],
  "network engineer": ["IT administrator", "systems engineer", "cloud engineer", "infrastructure engineer"],
  "mechanical engineer": ["manufacturing engineer", "aerospace engineer", "civil engineer", "industrial engineer"]
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  let jobTitle = url.searchParams.get("title")?.toLowerCase();

  if (!jobTitle) {
    console.log("🚨 Missing job title");
    return NextResponse.json({ error: "Missing job title" }, { status: 400 });
  }

  console.log(`🔍 Searching jobs for: ${jobTitle}`);

  // 🔹 Get all related job titles (including synonyms)
  let relatedJobTitles = [jobTitle];
  if (JOB_TITLE_SYNONYMS[jobTitle]) {
    relatedJobTitles.push(...JOB_TITLE_SYNONYMS[jobTitle]);
  }

  console.log(`📌 Searching for these job titles: ${relatedJobTitles.join(", ")}`);

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  let jobs: any[] = [];

  try {
    for (const title of relatedJobTitles) {
      // 🔹 Scrape LinkedIn
      const linkedInUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(title)}&location=United%20States`;
      await page.goto(linkedInUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000); // Allow extra time for lazy loading

      console.log(`✅ Scraped LinkedIn for: ${title}`);

      const linkedInJobs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".base-card")).map(job => ({
          title: job.querySelector(".base-search-card__title")?.textContent?.trim() || "Unknown",
          company: job.querySelector(".base-search-card__subtitle")?.textContent?.trim() || "Unknown",
          location: job.querySelector(".job-search-card__location")?.textContent?.trim() || "Unknown",
          link: job.querySelector(".base-card__full-link")?.getAttribute("href") || "#",
          posted: job.querySelector("time")?.textContent?.trim() || "Unknown",
          source: "LinkedIn"
        }));
      });

      console.log(`🔹 Found ${linkedInJobs.length} LinkedIn jobs for ${title}`);
      jobs.push(...linkedInJobs);
    }
  } catch (error) {
    console.error("🚨 Scraping error:", error);
    return NextResponse.json({ error: "Scraping error" }, { status: 500 });
  } finally {
    await browser.close();
  }

  // 🔹 Filter jobs to include only Fortune 500 companies
  const fortune500Jobs = jobs.filter(job => 
    FORTUNE_500_COMPANIES.some(company => job.company.toLowerCase().includes(company.toLowerCase()))
  );

  console.log(`✅ Total Fortune 500 Jobs Found: ${fortune500Jobs.length}`);

  return NextResponse.json(fortune500Jobs);
}