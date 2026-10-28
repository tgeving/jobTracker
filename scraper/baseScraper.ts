import { Page } from 'playwright';

// Standardized structure for any job returned by any scraper
export interface ScrapedJob {
  company: string;
  position: string;
  jobLink: string;
  wfh: string;
}

// Abstract base class that individual site scrapers can extend
export abstract class BaseScraper {
  protected page: Page;
  protected searchQuery: string;

  constructor(page: Page, searchQuery: string) {
    this.page = page;
    this.searchQuery = searchQuery;
  }

  // Every child class (LinkedIn, Indeed, etc.) MUST implement this method
  abstract scrape(): Promise<ScrapedJob[]>;

  // Optional shared helper methods can go here (e.g., standard text cleaning)
  protected cleanText(text: string | null): string {
    return text ? text.trim() : '';
  }
}
