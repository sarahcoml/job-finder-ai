import { NextResponse } from "next/server";
import playwright from "playwright-core"; // ✅ Use `playwright-core` for Vercel compatibility


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
  try {
    console.log("🔍 API Request received");

    const url = new URL(req.url);
    const jobTitle = url.searchParams.get("title");

    if (!jobTitle) {
      console.error("🚨 Missing job title in request");
      return NextResponse.json({ error: "Missing job title" }, { status: 400 });
    }

    console.log(`📌 Searching for jobs related to: ${jobTitle}`);

    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    let jobs: any[] = [];

    // 🔹 Find similar job titles
    const relatedTitles = JOB_TITLE_SYNONYMS[jobTitle] || [jobTitle];

    for (const title of relatedTitles) {
      console.log(`🔎 Scraping LinkedIn for: ${title}`);
      
      try {
        // Scrape LinkedIn
        const linkedInUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(title)}&location=United%20States`;
        await page.goto(linkedInUrl, { waitUntil: "domcontentloaded" });

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

        console.log(`✅ LinkedIn found ${linkedInJobs.length} jobs for: ${title}`);
        jobs.push(...linkedInJobs);

      } catch (error) {
        console.error(`❌ Error scraping LinkedIn for ${title}:`, error);
      }

      try {
        // Scrape Indeed
        console.log(`🔎 Scraping Indeed for: ${title}`);
        const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}&l=United+States`;
        await page.goto(indeedUrl, { waitUntil: "domcontentloaded" });

        const indeedJobs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll(".job_seen_beacon")).map(job => ({
            title: job.querySelector("h2.jobTitle span")?.textContent?.trim() || "Unknown",
            company: job.querySelector(".companyName")?.textContent?.trim() || "Unknown",
            location: job.querySelector(".companyLocation")?.textContent?.trim() || "Unknown",
            link: "https://www.indeed.com" + job.querySelector("a")?.getAttribute("href"),
            posted: job.querySelector(".date")?.textContent?.trim() || "Unknown",
            source: "Indeed"
          }));
        });

        console.log(`✅ Indeed found ${indeedJobs.length} jobs for: ${title}`);
        jobs.push(...indeedJobs);

      } catch (error) {
        console.error(`❌ Error scraping Indeed for ${title}:`, error);
      }
    }

    await browser.close();

    // 🔹 Filter jobs to include only Fortune 500 companies
    console.log("📌 Filtering jobs for Fortune 500 companies");
    const filteredJobs = jobs.filter(job =>
      FORTUNE_500_COMPANIES.some(company => job.company.toLowerCase().includes(company.toLowerCase()))
    );

    console.log(`✅ Returning ${filteredJobs.length} filtered jobs`);
    return NextResponse.json(filteredJobs);

  } catch (error) {
    console.error("🚨 Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}