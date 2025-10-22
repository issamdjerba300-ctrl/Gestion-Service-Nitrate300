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

export async function getAllWorksByYear(year: number): Promise<Record<string, WorkItem[]>> {
  const response = await fetch(`${API_URL}/works?year=${year}`);
  if (!response.ok) {
    throw new Error('Failed to fetch works');
  }
  return response.json();
}

export async function getWorksByDate(year: number, date: string): Promise<WorkItem[]> {
  const allWorks = await getAllWorksByYear(year);
  return allWorks[date] || [];
}

export async function createWork(workItem: WorkItem, year: number): Promise<WorkItem> {
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

export async function updateWork(workId: string, workItem: WorkItem, year: number): Promise<WorkItem> {
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

export async function bulkCreateWorks(works: WorkItem[], year: number): Promise<WorkItem[]> {
  const allWorks = await getAllWorksByYear(year);

  works.forEach(work => {
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
    throw new Error('Failed to create works');
  }

  return works;
}

export async function findMostRecentWorkByNumber(number: string, year: number): Promise<WorkItem | null> {
  const allWorks = await getAllWorksByYear(year);

  let mostRecent: WorkItem | null = null;
  let mostRecentDate = '';

  for (const date in allWorks) {
    const works = allWorks[date];
    const found = works.find(w => w.number.toLowerCase() === number.toLowerCase());
    if (found && (!mostRecent || date > mostRecentDate)) {
      mostRecent = found;
      mostRecentDate = date;
    }
  }

  return mostRecent;
}

export async function findMostRecentWorkByReference(reference: string, year: number): Promise<WorkItem | null> {
  const allWorks = await getAllWorksByYear(year);

  let mostRecent: WorkItem | null = null;
  let mostRecentDate = '';

  for (const date in allWorks) {
    const works = allWorks[date];
    const found = works.find(w => w.reference.toLowerCase() === reference.toLowerCase());
    if (found && (!mostRecent || date > mostRecentDate)) {
      mostRecent = found;
      mostRecentDate = date;
    }
  }

  return mostRecent;
}

export async function getDatesWithWorks(year: number): Promise<string[]> {
  const allWorks = await getAllWorksByYear(year);
  return Object.keys(allWorks).filter(date => allWorks[date].length > 0);
}
