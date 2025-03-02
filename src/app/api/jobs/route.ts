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

const JOB_TITLES = {
  "Software Engineer": ["Software Developer", "Backend Engineer", "Full Stack Developer", "Application Developer"],
  "Frontend Developer": ["UI Engineer", "Web Developer", "React Developer", "JavaScript Engineer"],
  "Data Scientist": ["Machine Learning Engineer", "AI Engineer", "Data Analyst", "Big Data Engineer"],
  "Product Manager": ["Project Manager", "Product Owner", "Business Analyst", "Growth Manager"],
  "Sales Operations": ["Sales Support Analyst", "Sales Coordinator", "Revenue Operations Analyst", "Business Development Coordinator"],
  "Sales Support": ["Sales Assistant", "Customer Success Manager", "Account Coordinator", "Inside Sales Representative"],
  "Marketing": ["Marketing Coordinator", "Brand Manager", "Digital Marketing Specialist", "SEO Specialist"]
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobTitle = url.searchParams.get("title") as keyof typeof JOB_TITLES;

  if (!jobTitle) {
    return NextResponse.json({ error: "Missing job title" }, { status: 400 });
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  let jobs: any[] = [];

  try {
    // 🔹 Find similar job titles
    const relatedTitles = JOB_TITLES[jobTitle] || [jobTitle as string];

    for (const title of relatedTitles) {
      // 🔹 Scrape LinkedIn
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

      jobs.push(...linkedInJobs);

      // 🔹 Scrape Indeed
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

      jobs.push(...indeedJobs);
    }
  } catch (error) {
    console.error("Scraping error:", error);
  } finally {
    await browser.close();
  }

  // 🔹 Filter jobs to include only Fortune 500 companies
  const filteredJobs = jobs.filter(job =>
    FORTUNE_500_COMPANIES.some(company => job.company.toLowerCase().includes(company.toLowerCase()))
  );

  return NextResponse.json(filteredJobs);
}
