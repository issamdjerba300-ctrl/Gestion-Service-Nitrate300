const API_URL = 'http://localhost:5000';

export interface WorkItem {
  id: string;
  number: string;
  reference: string;
  description: string;
  department: string;
  status: string;
  remarks: string;
  date: string;
}

function extractYearFromDate(dateString: string): number {
  const year = new Date(dateString).getFullYear();
  return isNaN(year) ? new Date().getFullYear() : year;
}

export async function getAllWorksByYear(year: number): Promise<Record<string, WorkItem[]>> {
  const response = await fetch(`${API_URL}/works?year=${year}`);
  if (!response.ok) {
    throw new Error('Failed to fetch works');
  }
  return response.json();
}

export async function getAllWorksByYearRange(startYear: number, endYear: number): Promise<Record<string, WorkItem[]>> {
  const allWorks: Record<string, WorkItem[]> = {};

  for (let year = startYear; year <= endYear; year++) {
    try {
      const yearWorks = await getAllWorksByYear(year);
      Object.assign(allWorks, yearWorks);
    } catch (error) {
      console.warn(`Failed to fetch data for year ${year}:`, error);
    }
  }

  return allWorks;
}

export async function getWorksByDate(date: string): Promise<WorkItem[]> {
  const year = extractYearFromDate(date);
  const allWorks = await getAllWorksByYear(year);
  return allWorks[date] || [];
}

export async function createWork(workItem: WorkItem): Promise<WorkItem> {
  const year = extractYearFromDate(workItem.date);
  const allWorks = await getAllWorksByYear(year);

  if (!allWorks[workItem.date]) {
    allWorks[workItem.date] = [];
  }

  allWorks[workItem.date].push(workItem);

  const response = await fetch(`${API_URL}/works?year=${year}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allWorks),
  });

  if (!response.ok) {
    throw new Error('Failed to create work');
  }

  return workItem;
}

export async function updateWork(workId: string, workItem: WorkItem): Promise<WorkItem> {
  const year = extractYearFromDate(workItem.date);
  const allWorks = await getAllWorksByYear(year);

  for (const date in allWorks) {
    const index = allWorks[date].findIndex(w => w.id === workId);
    if (index !== -1) {
      allWorks[date][index] = workItem;
      break;
    }
  }

  const response = await fetch(`${API_URL}/works?year=${year}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allWorks),
  });

  if (!response.ok) {
    throw new Error('Failed to update work');
  }

  return workItem;
}

export async function deleteWork(workId: string): Promise<void> {
  const response = await fetch(`${API_URL}/works/${workId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete work');
  }
}

export async function bulkCreateWorks(works: WorkItem[]): Promise<WorkItem[]> {
  const worksByYear = new Map<number, WorkItem[]>();

  works.forEach(work => {
    const year = extractYearFromDate(work.date);
    if (!worksByYear.has(year)) {
      worksByYear.set(year, []);
    }
    worksByYear.get(year)!.push(work);
  });

  for (const [year, yearWorks] of worksByYear.entries()) {
    const allWorks = await getAllWorksByYear(year);

    yearWorks.forEach(work => {
      if (!allWorks[work.date]) {
        allWorks[work.date] = [];
      }
      allWorks[work.date].push(work);
    });

    const response = await fetch(`${API_URL}/works?year=${year}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allWorks),
    });

    if (!response.ok) {
      throw new Error(`Failed to create works for year ${year}`);
    }
  }

  return works;
}

export async function findMostRecentWorkByNumber(number: string, currentDate?: string): Promise<WorkItem | null> {
  const currentYear = currentDate ? extractYearFromDate(currentDate) : new Date().getFullYear();
  const yearsToSearch = [currentYear, currentYear - 1, currentYear - 2];

  let mostRecent: WorkItem | null = null;
  let mostRecentDate = '';

  for (const year of yearsToSearch) {
    try {
      const allWorks = await getAllWorksByYear(year);

      for (const date in allWorks) {
        const works = allWorks[date];
        const found = works.find(w => w.number.toLowerCase() === number.toLowerCase());
        if (found && (!mostRecent || date > mostRecentDate)) {
          mostRecent = found;
          mostRecentDate = date;
        }
      }
    } catch (error) {
      console.warn(`Could not search year ${year}:`, error);
    }
  }

  return mostRecent;
}

export async function findMostRecentWorkByReference(reference: string, currentDate?: string): Promise<WorkItem | null> {
  const currentYear = currentDate ? extractYearFromDate(currentDate) : new Date().getFullYear();
  const yearsToSearch = [currentYear, currentYear - 1, currentYear - 2];

  let mostRecent: WorkItem | null = null;
  let mostRecentDate = '';

  for (const year of yearsToSearch) {
    try {
      const allWorks = await getAllWorksByYear(year);

      for (const date in allWorks) {
        const works = allWorks[date];
        const found = works.find(w => w.reference.toLowerCase() === reference.toLowerCase());
        if (found && (!mostRecent || date > mostRecentDate)) {
          mostRecent = found;
          mostRecentDate = date;
        }
      }
    } catch (error) {
      console.warn(`Could not search year ${year}:`, error);
    }
  }

  return mostRecent;
}

export async function getDatesWithWorks(year: number): Promise<string[]> {
  const allWorks = await getAllWorksByYear(year);
  return Object.keys(allWorks).filter(date => allWorks[date].length > 0);
}

export async function getAllWorksByDateRange(startDate: Date, endDate: Date): Promise<Record<string, WorkItem[]>> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return getAllWorksByYear(startYear);
  }

  return getAllWorksByYearRange(startYear, endYear);
}
