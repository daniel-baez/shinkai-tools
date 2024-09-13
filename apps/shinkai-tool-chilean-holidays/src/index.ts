import { BaseTool, RunResult } from '@shinkai_protocol/shinkai-tools-builder';
import { ToolDefinition } from 'libs/shinkai-tools-builder/src/tool-definition';

import * as playwright from 'playwright';
import * as chromePaths from 'chrome-paths';

type Config = {
  chromePath?: string;
};

type Params = {
  year: number;
};

type Holiday = {
  day: string;
  festivity: string;
  type: string;
  legalSupport: string;
  date: string;
  isMandatory: boolean;
};

type Result = {
  holidays: Holiday[];
};

export class Tool extends BaseTool<Config, Params, Result> {
  definition: ToolDefinition<Config, Params, Result> = {
    id: 'shinkai-tool-chilean-holidays',
    name: 'Shinkai: chilean-holidays',
    description: 'New chilean-holidays fetches chilean holidays in the american date format for the current year',
    author: 'Shinkai',
    keywords: ['chilean-holidays', 'shinkai'],
    configurations: {
      type: 'object',
      properties: {
        chromePath: {
          type: 'string',
          nullable: true,
        },
      },
      required: [],
    },
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number' },
      },
      required: [],
    },
    result: {
      type: 'object',
      properties: {
        holidays: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: { type: 'string', description: 'The day of the holiday' },
              festivity: { type: 'string', description: 'The name of the holiday' },
              type: { type: 'string', description: 'The type of the holiday' },
              legalSupport: { type: 'string', description: 'The legal support of the holiday' },
              date: { type: 'string', description: 'The date of the holiday in american format' },
              isMandatory: { type: 'boolean', description: 'If the holiday is mandatory' },
            },
            required: ['day', 'festivity', 'type', 'legalSupport', 'date', 'isMandatory']
          }
        }
      },
      required: ['holidays']
    },
  };

  private getUrlForYear(year: number): string {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const yearAfterNext = currentYear + 2;

    if (year === currentYear) {
      return 'https://feriados.cl/';
    } else if (year === nextYear || year === yearAfterNext) {
      return `https://feriados.cl/${year}.htm`;
    } else {
      throw new Error('Invalid year. Only current year, next year, or year after next are supported.');
    }
  }

  async run(params: Params): Promise<RunResult<Result>> {
    console.log(`hello world chilean-holidays`);

    const year = params.year || new Date().getFullYear();

    const url = this.getUrlForYear(year);

    return this.withPage(async (page) => {
      await this.goToPage(page, 'https://feriados.cl/');

      const holidays = await this.scrapeHolidays(page, year);
      return {
        data: {
          holidays
        },
      };
    });
  }

  translateDateToAmericanFormat(spanishDate: string, year: number): string {
    const months: Record<string, string> = {
      "Enero": "01",
      "Febrero": "02",
      "Marzo": "03",
      "Abril": "04",
      "Mayo": "05",
      "Junio": "06",
      "Julio": "07",
      "Agosto": "08",
      "Septiembre": "09",
      "Octubre": "10",
      "Noviembre": "11",
      "Diciembre": "12"
    };
  
    // Extract the day, month, and year from the input string
    const dateMatch = spanishDate.match(/, (\d{2}) de (\w+)/);
  
    if (!dateMatch) {
      throw new Error("Invalid date format");
    }
  
    const [, day, month] = dateMatch;
  
    // Translate the date to American format
    return `${months[month]}/${day}/${year}`;
  }

  isMandatory(festivity: string): boolean {
    return festivity.toLowerCase().includes('irrenunciable');
  }

  cleanWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private async scrapeHolidays(page: playwright.Page, year: number): Promise<Holiday[]> {
    const rows = await page.evaluate(() => {
      const firstTable = document.querySelector('table');

      const rows = Array.from(firstTable?.querySelectorAll('tr') || []).filter(
        (row) => row.children.length === 4,
      );

      return rows.slice(2)
        .map((row) => {
          const columns = row.querySelectorAll('td');
          const day = columns[0]?.textContent?.trim() || '';
          const festivity = columns[1]?.textContent?.trim() || '';
          const type = columns[2]?.textContent?.trim() || '';
          const legalSupport = columns[3]?.textContent?.trim() || '';

          return {
            day,
            festivity,
            type,
            legalSupport,
          };
        })
        .filter((holiday) => holiday.day !== '');
    });

    return rows.map((row) => ({
      ...row,
      festivity: this.cleanWhitespace(row.festivity).replace(/Irrenunciable/gi, '').trim(),
      legalSupport: this.cleanWhitespace(row.legalSupport),
      date: this.translateDateToAmericanFormat(row.day, year),
      isMandatory: this.isMandatory(row.festivity),
    }));
  }

  private async withPage<T>(fn: (page: playwright.Page) => Promise<T>): Promise<T> {
    const browser = await playwright['chromium'].launch({
      executablePath: this.config?.chromePath || chromePaths.chrome,
      headless: true,
    });
  
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    });
  
    const page = await context.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
      await browser.close();
    }
  }

  private async goToPage(page: playwright.Page, url: string): Promise<void>{
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => document.readyState === 'complete');
  }

}
