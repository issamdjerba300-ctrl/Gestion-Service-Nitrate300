import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, FileText, Download, ChevronUp, ChevronDown, X, Search, Edit2, Trash2, Calendar as CalendarIcon } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ProjectLogo from "@/components/ProjectLogo";
import { addLogoToPDF } from "@/utils/dataExport";

// Interface definitions for data structures
interface WorkItem {
  id: string;
  number: string;
  reference: string;
  description: string;
  department: string;
  status: string;
  remarks: string;
  date: string;
}

interface SortConfig {
  column: keyof WorkItem;
  direction: 'asc' | 'desc';
}

interface Statistics {
  totalWorks: number;
  completed: number;
  pending: number;
  inProgress: number;
  onHold: number;
  cancelled: number;
  dates: number;
}

interface CustomText {
  title: string;
  subtitle: string;
}

/**
 * WorkSummary Component - Comprehensive overview and reporting for maintenance works
 */
const WorkSummary = () => {
  const navigate = useNavigate();
  
  // State management
  const [allWorks, setAllWorks] = useState<WorkItem[]>([]);
  const [datesWithWorks, setDatesWithWorks] = useState<string[]>([]);
  const [stats, setStats] = useState<Statistics>({
    totalWorks: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    onHold: 0,
    cancelled: 0,
    dates: 0
  });
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>(
    [{ column: "date", direction: "desc" }]
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activeDepartmentFilters, setActiveDepartmentFilters] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [customText, setCustomText] = useState<CustomText>({
    title: "Arrêt Technique AT2025 (Rapport)",
    subtitle: "Mécanique"
  });

  // Load data on component mount
  useEffect(() => {
    loadAllWorks();
    loadDatesWithWorks();
  }, []);

  /**
   * Loads all dates that have work items for calendar highlighting
   */
  const loadDatesWithWorks = async () => {
    try {
      const response = await fetch("http://localhost:5000/works");
      const allWorks = await response.json();
      setDatesWithWorks(
        Object.keys(allWorks).filter(date => allWorks[date] && allWorks[date].length > 0)
      );
    } catch (error) {
      console.error("Error loading dates with works:", error);
      // Fallback to localStorage
      const savedData = localStorage.getItem("maintenance-works");
      if (savedData) {
        try {
          const allWorks = JSON.parse(savedData);
          setDatesWithWorks(
            Object.keys(allWorks).filter(date => allWorks[date] && allWorks[date].length > 0)
          );
        } catch (e) {
          console.error("Error parsing localStorage:", e);
        }
      }
    }
  };

  /**
   * Counts unique in-progress works with advanced business logic
   * Handles complex status progression rules
   */
  const countUniqueInProgressWorks2 = (works: WorkItem[]) => {
    const combinationDetails = new Map();
    
    // STEP 1: Collect all statuses for each combination
    works.forEach(work => {
      const key = `${work.number}-${work.reference}-${work.department}`;
      const currentStatus = work.status;
      
      if (!combinationDetails.has(key)) {
        combinationDetails.set(key, {
          hasDebut: false,
          hasEnCours: false, 
          hasTermine: false
        });
      }
      
      const details = combinationDetails.get(key);
      
      // Mark present statuses
      if (currentStatus === 'Cancelled') details.hasDebut = true;
      if (currentStatus === 'In Progress') details.hasEnCours = true;
      if (currentStatus === 'Completed') details.hasTermine = true;
    });

    // STEP 2: Apply point-based logic
    let totalPoints = 0;

    combinationDetails.forEach((details, key) => {
      // Rule 1: +1 point if "In Progress" (even with "Start" before)
      if (details.hasDebut && details.hasEnCours && !details.hasTermine) {
        totalPoints += 1;
      }
      // Rule 2: +1 point if "Start" only (without "In Progress" or "Completed")
      else if (details.hasDebut && !details.hasEnCours && !details.hasTermine) {
        totalPoints += 1;
      }
      // Rule 4: +0 
      else if (details.hasTermine && details.hasDebut && details.hasEnCours) {
        totalPoints += 0;
      }
      // Rule 4: +0
      else if (details.hasTermine && details.hasDebut && !details.hasEnCours) {
        totalPoints += 0;
      }
      // Rule 5: +1 point if only "In Progress" without other statuses
      else if (!details.hasTermine && !details.hasDebut && details.hasEnCours) {
        totalPoints += 1;
      }
    });

    // Ensure total is not negative
    return Math.max(0, totalPoints);
  };

  /**
   * Simple count of unique in-progress works
   */
  const countUniqueInProgressWorks = (works: WorkItem[]) => {
    const uniqueWorks = new Map();
    
    works.filter(work => work.status === 'In Progress').forEach(work => {
      const key = `${work.number}-${work.reference}-${work.department}`;
      if (!uniqueWorks.has(key)) {
        uniqueWorks.set(key, work);
      }
    });
    
    return uniqueWorks.size;
  };

  // Update statistics when filters or data change
  useEffect(() => {
    const filteredWorks = getSortedAndFilteredWorks();
    const uniqueDates = [...new Set(filteredWorks.map(work => work.date))];

    // Exclude "On Hold" works from total count
    const totalWorks = filteredWorks.filter(w => w.status !== 'On Hold').length;
    const completed = filteredWorks.filter(w => w.status === 'Completed').length;
    const pending = filteredWorks.filter(w => w.status === 'Pending').length;
    // Use advanced function for counting in-progress works
    const inProgress = countUniqueInProgressWorks2(filteredWorks);
    const onHold = filteredWorks.filter(w => w.status === 'On Hold').length;
    const cancelled = filteredWorks.filter(w => w.status === 'Cancelled').length;
    const dates = uniqueDates.length;

    setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });
  }, [allWorks, searchQuery, activeFilters, activeDepartmentFilters, startDate, endDate, sortConfigs]);

  // Select all rows by default when works are loaded
  useEffect(() => {
    const allIds = new Set(allWorks.map(work => work.id));
    setSelectedRows(allIds);
  }, [allWorks]);

  // Load custom text from localStorage on component mount
  useEffect(() => {
    const savedCustomText = localStorage.getItem('work-summary-custom-text');
    if (savedCustomText) {
      try {
        setCustomText(JSON.parse(savedCustomText));
      } catch (error) {
        // Fallback if format is incorrect
        setCustomText({
          title: savedCustomText,
          subtitle: "Technical Operations Department"
        });
      }
    }
  }, []);

  // Save custom text to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('work-summary-custom-text', JSON.stringify(customText));
  }, [customText]);

  // Synchronize selected rows with filtered works
  useEffect(() => {
    const filteredIds = new Set(getSortedAndFilteredWorks().map(work => work.id));
    const newSelectedRows = new Set(
      Array.from(selectedRows).filter(id => filteredIds.has(id))
    );

    if (newSelectedRows.size !== selectedRows.size) {
      setSelectedRows(newSelectedRows);
    }
  }, [searchQuery, activeFilters, startDate, endDate, activeDepartmentFilters]);

  /**
   * Loads all works from backend and calculates initial statistics
   */
  const loadAllWorks = async () => {
    try {
      const response = await fetch('http://localhost:5000/works');
      const worksByDate = await response.json();
      const allWorksArray: WorkItem[] = [];

      Object.keys(worksByDate).forEach(date => {
        allWorksArray.push(...worksByDate[date]);
      });

      setAllWorks(allWorksArray);

      // Calculate initial statistics
      const totalWorks = allWorksArray.length;
      const completed = allWorksArray.filter(w => w.status === 'Completed').length;
      const pending = allWorksArray.filter(w => w.status === 'Pending').length;
      const inProgress = allWorksArray.filter(w => w.status === 'In Progress').length;
      const onHold = allWorksArray.filter(w => w.status === 'On Hold').length;
      const cancelled = allWorksArray.filter(w => w.status === 'Cancelled').length;
      const dates = Object.keys(worksByDate).length;

      setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });
    } catch (error) {
      console.error('Error loading data from backend:', error);
      // Fallback to localStorage
      const savedData = localStorage.getItem('maintenance-works');
      if (savedData) {
        try {
          const worksByDate = JSON.parse(savedData);
          const allWorksArray: WorkItem[] = [];

          Object.keys(worksByDate).forEach(date => {
            allWorksArray.push(...worksByDate[date]);
          });

          setAllWorks(allWorksArray);

          // Calculate statistics for localStorage data
          const totalWorks = allWorksArray.length;
          const completed = allWorksArray.filter(w => w.status === 'Completed').length;
          const pending = allWorksArray.filter(w => w.status === 'Pending').length;
          const inProgress = allWorksArray.filter(w => w.status === 'In Progress').length;
          const onHold = allWorksArray.filter(w => w.status === 'On Hold').length;
          const cancelled = allWorksArray.filter(w => w.status === 'Cancelled').length;
          const dates = Object.keys(worksByDate).length;

          setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });
        } catch (error) {
          console.error('Error loading data from localStorage:', error);
        }
      }
    }
  };

  /**
   * Returns appropriate CSS classes for status badges
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'On Hold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  /**
   * Handles column sorting with multi-column support
   * Always keeps date as the last sort column
   */
  const handleSort = (column: keyof WorkItem) => {
    setSortConfigs(prevConfigs => {
      // Always extract date configuration (if exists)
      const dateConfig = prevConfigs.find(cfg => cfg.column === "date") || {
        column: "date",
        direction: "desc",
      };

      // Keep all configs except date
      let otherConfigs = prevConfigs.filter(cfg => cfg.column !== "date");

      const existingIndex = otherConfigs.findIndex(cfg => cfg.column === column);

      if (existingIndex >= 0) {
        // Toggle direction if column already exists
        otherConfigs[existingIndex] = {
          ...otherConfigs[existingIndex],
          direction: otherConfigs[existingIndex].direction === "asc" ? "desc" : "asc",
        };
      } else {
        // Add new column before date
        otherConfigs.push({ column, direction: "asc" });
      }

      // Always put date as the last sort column
      return [...otherConfigs, dateConfig];
    });
  };

  /**
   * Toggles status filters
   */
  const handleFilterToggle = (filters: string[]) => {
    setActiveFilters(filters);
  };

  /**
   * Clears all active filters and search
   */
  const clearAllFilters = () => {
    setActiveFilters([]);
    setActiveDepartmentFilters([]);
    setSearchQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  /**
   * Toggles department filters
   */
  const handleDepartmentFilterToggle = (departments: string[]) => {
    setActiveDepartmentFilters(departments);
  };

  /**
   * Handles individual row selection
   */
  const handleRowSelection = (workId: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(workId);
      } else {
        newSet.delete(workId);
      }
      return newSet;
    });
  };

  /**
   * Handles select all/none functionality
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allVisibleIds = new Set(getSortedAndFilteredWorks().map(work => work.id));
      setSelectedRows(allVisibleIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  /**
   * Returns numerical order for status values for consistent sorting
   */
  const getStatusOrder = (status: string) => {
    switch (status) {
      case "On Hold": return 1;      // Requested
      case "Pending": return 2;      // Immediate
      case "Cancelled": return 3;    // Start
      case "In Progress": return 4;  // In Progress
      case "Completed": return 5;    // Completed
      default: return 6;
    }
  };

  /**
   * Returns numerical order for department values for consistent sorting
   */
  const getDepartmentOrder = (department: string) => {
    switch (department) {
      case "Instrumentation": return 1;  // Service
      case "Mechanical": return 2;       // Mechanical
      case "Electrical": return 3;       // Electrical
      case "Service": return 4;          // Nitrate
      case "Operations": return 5;       // Other
      default: return 6;
    }
  };

  /**
   * Applies all active filters and sorting to works
   */
  const getSortedAndFilteredWorks = () => {
    let filteredWorks = allWorks;

    // 🔹 Date range filtering
    if (startDate || endDate) {
      const adjustedEndDate = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : null;
      filteredWorks = filteredWorks.filter(work => {
        const workDate = new Date(work.date);
        const isAfterStart = !startDate || workDate >= startDate;
        const isBeforeEnd = !adjustedEndDate || workDate <= adjustedEndDate;
        return isAfterStart && isBeforeEnd;
      });
    }

    // 🔹 Status filtering
    if (activeFilters.length > 0) {
      filteredWorks = filteredWorks.filter((work) =>
        activeFilters.includes(work.status)
      );
    }

    // 🔹 Department filtering
    if (activeDepartmentFilters.length > 0) {
      filteredWorks = filteredWorks.filter((work) =>
        activeDepartmentFilters.includes(work.department)
      );
    }

    // 🔹 Search functionality
    if (searchQuery.trim()) {
      const queries = searchQuery.toLowerCase()
        .split(/\s+/)
        .filter(q => q.length > 0)
        .map(q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape special characters

      filteredWorks = filteredWorks.filter((work) => {
        const searchableFields = {
          number: work.number.toLowerCase(),
          reference: work.reference.toLowerCase(),
          description: work.description.toLowerCase(),
          department: translateDepartment(work.department).toLowerCase(),
          status: translateStatus(work.status).toLowerCase(),
          remarks: (work.remarks || '').toLowerCase(),
          date: format(new Date(work.date), "dd MMM yyyy", { locale: fr }).toLowerCase()
        };
        
        // Match scoring - more professional approach
        let matchScore = 0;
        
        queries.forEach(query => {
          // Search across all fields
          Object.values(searchableFields).forEach(fieldValue => {
            if (fieldValue.includes(query)) {
              matchScore++;
            }
          });
        });
        
        // A work matches if all words are found at least once
        return matchScore >= queries.length;
      });
    }

    // 🔹 Cumulative sorting
    return filteredWorks.sort((a, b) => {
      for (const { column, direction } of sortConfigs) {
        let aValue: any = a[column];
        let bValue: any = b[column];
        
        // ⚡ Special case for "status" column - use custom order
        if (column === "status") {
          aValue = getStatusOrder(aValue);
          bValue = getStatusOrder(bValue);  
        }

        // ⚡ Special case for "department" column - use custom order
        if (column === "department") {
          aValue = getDepartmentOrder(aValue);
          bValue = getDepartmentOrder(bValue);
        }

        // ⚡ Date comparison
        if (column === "date") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // ⚡ String comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          const cmp = aValue.localeCompare(bValue);
          if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
        } else {
          // ⚡ Numeric comparison
          if (aValue < bValue) return direction === "asc" ? -1 : 1;
          if (aValue > bValue) return direction === "asc" ? 1 : -1;
        }
      }
      return 0;
    });
  };
  
  /**
   * Highlights search terms in text for better UX
   */
  const highlightText = (text: string, queries: string[]) => {
    if (!queries.length) return text;
    
    let highlighted = text;
    queries.forEach(query => {
      const regex = new RegExp(`(${query})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  };

  /**
   * Opens edit dialog for a work item
   */
  const handleEditWork = (work: WorkItem) => {
    setEditingWork({ ...work });
    setIsEditDialogOpen(true);
  };

  /**
   * Saves edited work item to backend
   */
  const handleSaveEdit = async () => {
    if (!editingWork) return;

    try {
      console.log("📡 Starting edit process...");

      // 1. Get existing data
      const response = await fetch('http://localhost:5000/works');
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }
      
      const allWorksFromBackend = await response.json();
      console.log("✅ Data retrieved, number of dates:", Object.keys(allWorksFromBackend).length);

      // 2. Find and update the item
      let found = false;
      let updatedDateKey = '';
      
      Object.keys(allWorksFromBackend).forEach(dateKey => {
        const dayWorks = allWorksFromBackend[dateKey] || [];
        const workIndex = dayWorks.findIndex((w: WorkItem) => w.id === editingWork.id);
        
        if (workIndex >= 0) {
          console.log(`📍 Item found at index ${workIndex} for ${dateKey}`);
          allWorksFromBackend[dateKey][workIndex] = editingWork;
          found = true;
          updatedDateKey = dateKey;
        }
      });

      if (!found) {
        console.warn("❌ Item not found - ID:", editingWork.id);
        toast({
          title: "❌ Item not found",
          description: `Cannot find item ${editingWork.number} in backend`,
          variant: "destructive"
        });
        return; // Stop here
      }

      // 3. Prepare data to send
      const dataToSend = {
        [updatedDateKey]: allWorksFromBackend[updatedDateKey]
      };

      console.log(`📦 Sending data for ${updatedDateKey}`);
      
      // 4. Send modifications
      const saveResponse = await fetch('http://localhost:5000/works', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Save failed: ${saveResponse.status} - ${errorText}`);
      }

      // 5. SUCCESS - Update local state
      console.log("✅ Save successful, updating local state...");
      
      const updatedWorksArray: WorkItem[] = [];
      Object.keys(allWorksFromBackend).forEach(date => {
        updatedWorksArray.push(...(allWorksFromBackend[date] || []));
      });
      
      setAllWorks(updatedWorksArray);

      // Recalculate statistics
      const uniqueDates = [...new Set(updatedWorksArray.map(work => work.date))];
      const totalWorks = updatedWorksArray.filter(w => w.status !== 'On Hold').length;
      const completed = updatedWorksArray.filter(w => w.status === 'Completed').length;
      const pending = updatedWorksArray.filter(w => w.status === 'Pending').length;
      const inProgress = countUniqueInProgressWorks2(updatedWorksArray);
      const onHold = updatedWorksArray.filter(w => w.status === 'On Hold').length;
      const cancelled = updatedWorksArray.filter(w => w.status === 'Cancelled').length;
      const dates = uniqueDates.length;

      setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });

      toast({
        title: "✅ Success",
        description: `Item ${editingWork.number} modified successfully`,
      });

    } catch (error) {
      // 🔴 DETAILED ERROR HANDLING
      console.error('💥 Complete error:', error);
      
      let errorTitle = "❌ Error";
      let errorDescription = "An error occurred during modification";

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorTitle = "🔴 Connection impossible";
        errorDescription = "Cannot contact server - please verify it's running";
      } else if (error.message.includes('Backend error')) {
        errorTitle = "🔴 Server error";
        errorDescription = `Server returned error: ${error.message}`;
      } else if (error.message.includes('Save failed')) {
        errorTitle = "❌ Save failed";
        errorDescription = "Changes could not be saved";
      } else if (error.message.includes('Unexpected token')) {
        errorTitle = "📄 Invalid data format";
        errorDescription = "Data received from server is corrupted";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      // Always close dialog
      setIsEditDialogOpen(false);
      setEditingWork(null);
    }
  };

  /**
   * Deletes a work item from backend and local state
   */
  const handleDeleteWork = async (workId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/works/${workId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAllWorks(current => current.filter(work => work.id !== workId));

        // Recalculate statistics immediately after deletion
        const updatedWorks = allWorks.filter(work => work.id !== workId);
        const uniqueDates = [...new Set(updatedWorks.map(work => work.date))];

        const totalWorks = updatedWorks.length;
        const completed = updatedWorks.filter(w => w.status === 'Completed').length;
        const pending = updatedWorks.filter(w => w.status === 'Pending').length;
        const inProgress = updatedWorks.filter(w => w.status === 'In Progress').length;
        const onHold = updatedWorks.filter(w => w.status === 'On Hold').length;
        const cancelled = updatedWorks.filter(w => w.status === 'Cancelled').length;
        const dates = uniqueDates.length;

        setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });

        toast({
          title: "Success",
          description: "Work item deleted successfully",
        });
      } else {
        throw new Error('Backend deletion failed');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      // Fallback: remove from local state only
      setAllWorks(current => current.filter(work => work.id !== workId));

      // Recalculate statistics for localStorage fallback
      const updatedWorks = allWorks.filter(work => work.id !== workId);
      const uniqueDates = [...new Set(updatedWorks.map(work => work.date))];

      const totalWorks = updatedWorks.length;
      const completed = updatedWorks.filter(w => w.status === 'Completed').length;
      const pending = updatedWorks.filter(w => w.status === 'Pending').length;
      const inProgress = updatedWorks.filter(w => w.status === 'In Progress').length;
      const onHold = updatedWorks.filter(w => w.status === 'On Hold').length;
      const cancelled = updatedWorks.filter(w => w.status === 'Cancelled').length;
      const dates = uniqueDates.length;

      setStats({ totalWorks, completed, pending, inProgress, onHold, cancelled, dates });

      toast({
        title: "Locally deleted",
        description: "Item removed from current view. Backend unavailable.",
        variant: "destructive"
      });
    }
  };

  /**
   * SortableHeader Component - Table header with sorting indicators
   */
  const SortableHeader = ({ column, children }: { column: keyof WorkItem; children: React.ReactNode }) => {
    const sortConfig = sortConfigs.find(config => config.column === column);
    const sortIndex = sortConfigs.findIndex(config => config.column === column);

    return (
      <TableHead
        className="cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {children}
          <div className="flex flex-col relative">
            <ChevronUp
              className={`h-3 w-3 ${sortConfig && sortConfig.direction === 'asc' ? 'text-primary' : 'text-muted-foreground/50'}`}
            />
            <ChevronDown
              className={`h-3 w-3 -mt-1 ${sortConfig && sortConfig.direction === 'desc' ? 'text-primary' : 'text-muted-foreground/50'}`}
            />
            {sortIndex >= 0 && sortConfigs.length > 1 && (
              <span className="absolute -top-1 -right-2 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {sortIndex + 1}
              </span>
            )}
          </div>
        </div>
      </TableHead>
    );
  };

  /**
   * Exports selected works to PDF with custom formatting
   */
  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Main title with custom text
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text(customText.title || "Technical Shutdown AT2025 (Report)", pageWidth / 2, 60, { align: "center" });

    // Logo with error handling
    try {
      await addLogoToPDF(doc, pageWidth);
    } catch (error) {
      console.warn('Logo not loaded, continuing without logo:', error);
      // Continue without logo
    }

    // Text under logo
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Ammonitrate Plant', 15, 45);
    doc.text('Nitrate Service', 15, 50);

    // Generation date + custom text aligned to right
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    // Date on left
    doc.text(`Generated on: ${format(new Date(), 'PPP', { locale: fr })}`, 15, 85);

    // Add right-aligned text box content
    if (customText.subtitle) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      // Calculate position for right alignment
      doc.text(customText.subtitle, pageWidth - 15, 85, { align: "right" });
    }

    // Filtered statistics
    const filteredWorks = getSortedAndFilteredWorks();
    const uniqueDates = [...new Set(filteredWorks.map(work => work.date))];
    const filteredStats = {
      // Exclude "On Hold" from total like in the interface
      total: filteredWorks.filter(w => w.status !== 'On Hold').length,
      completed: filteredWorks.filter(w => w.status === 'Completed').length,
      inProgress: countUniqueInProgressWorks(filteredWorks), // Same function as interface
      pending: filteredWorks.filter(w => w.status === 'Pending').length,
      onHold: filteredWorks.filter(w => w.status === 'On Hold').length,
      cancelled: filteredWorks.filter(w => w.status === 'Cancelled').length,
      workDays: uniqueDates.length
    };

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Statistics:', 15, 105);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let yPos = 115;
    doc.text(`Total interventions: ${filteredStats.total}`, 15, yPos);
    yPos += 10;

    if (filteredStats.completed > 0) {
      doc.text(`Completed: ${filteredStats.completed}`, 15, yPos);
      yPos += 10;
    }
    if (filteredStats.inProgress > 0) {
      doc.text(`In Progress: ${filteredStats.inProgress}`, 15, yPos);
      yPos += 10;
    }
    if (filteredStats.pending > 0) {
      doc.text(`Immediate: ${filteredStats.pending}`, 15, yPos);
      yPos += 10;
    }
    if (filteredStats.onHold > 0) {
      doc.text(`Requested: ${filteredStats.onHold}`, 15, yPos);
      yPos += 10;
    }
    if (filteredStats.cancelled > 0) {
      doc.text(`Start: ${filteredStats.cancelled}`, 15, yPos);
      yPos += 10;
    }

    doc.text(`Work days: ${filteredStats.workDays}`, 15, yPos);
    yPos += 10;

    // New page for table
    doc.addPage();

    // Page 2 title with custom text
    doc.setFontSize(14);
    doc.text("Work List", pageWidth / 2, 20, { align: "center" });

    // Work table
    const tableData = filteredWorks.map(work => [
      format(new Date(work.date), 'dd MMM yyyy', { locale: fr }),
      work.number,
      work.reference,
      work.description,
      translateDepartment(work.department),
      translateStatus(work.status),
      work.remarks || '-'
    ]);

    autoTable(doc, {
      head: [['Date', 'Num°', 'Reference', 'Designation', 'Service', 'Status', 'Observation']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 11, cellPadding: 2 },
      margin: { top: 15 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 70 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 60 },
      },
    });

    // Pagination
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `${i}/${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save PDF
    doc.save(`maintenance-works-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  /**
   * Translates status from English to French for display
   */
  const translateStatus = (status: string) => {
    switch (status) {
      case "Completed":
        return "Terminé";
      case "Pending":
        return "Immédiat";
      case "In Progress":
        return "En cours";
      case "On Hold":
        return "Demandé";
      case "Cancelled":
        return "Début";
      default:
        return status;
    }
  };

  /**
   * Translates department from English to French for display
   */
  const translateDepartment = (department: string) => {
    switch (department) {
      case "Mechanical":
        return "Mecanique";
      case "Electrical":
        return "Electrique";
      case "Instrumentation":
        return "Prestation";
      case "Service":
        return "Nitrate";
      case "Operations":
        return "Autre";
      default:
        return department;
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="container mx-auto max-w-7xl">
        {/* Logo positioned at top left */}
        <div className="absolute top-4 left-4">
          <div className="flex flex-col items-start gap-1">
            <ProjectLogo size="large" />
            <div className="text-sm text-muted-foreground font-medium leading-tight">
              <div>Ammonitrate Plant</div>
              <div>Nitrate Service</div>
            </div>
          </div>
        </div>

        {/* Header with spacing for top-left logo */}
        <div className="text-center mb-8 mt-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Work Summary
            </h1>
            <p className="text-muted-foreground">
              Overview of all registered maintenance works
            </p>
          </div>
          
          {/* Space between header and PDF section */}
          <div className="mb-8"></div>

          {/* PDF customization section */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 w-fit ml-auto">
            <CardContent className="p-4">
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-text" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    PDF Title:
                  </label>
                  <Input
                    id="custom-text"
                    type="text"
                    placeholder="Main PDF title"
                    value={customText.title}
                    onChange={(e) => setCustomText(prev => ({ ...prev, title: e.target.value }))}
                    className="w-64 text-right"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-subtitle" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    PDF Subtitle:
                  </label>
                  <Input
                    id="custom-subtitle"
                    type="text"
                    placeholder="Right-aligned text"
                    value={customText.subtitle}
                    onChange={(e) => setCustomText(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-64 text-right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWorks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Immediate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Requested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.onHold}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Work Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dates}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: fr }) : <span>Select Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => setStartDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={fr}
                      modifiers={{
                        hasWork: datesWithWorks.map(d => new Date(d))
                      }}
                      modifiersClassNames={{
                        hasWork: "bg-green-200 text-green-900 font-bold rounded-full"
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: fr }) : <span>Select End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => setEndDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={fr}
                      modifiers={{
                        hasWork: datesWithWorks.map(d => new Date(d))
                      }}
                      modifiersClassNames={{
                        hasWork: "bg-green-200 text-green-900 font-bold rounded-full"
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Clear Date Filter:</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className="w-full"
                  disabled={!startDate && !endDate}
                >
                  Clear Date Filter
                </Button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by number, reference, description, service, status, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Status Filters:</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <ToggleGroup
                type="multiple"
                value={activeFilters}
                onValueChange={handleFilterToggle}
                className="flex flex-wrap justify-start gap-2"
              >
                <ToggleGroupItem
                  value="Completed"
                  variant="outline"
                  className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800 data-[state=on]:border-green-300 dark:data-[state=on]:bg-green-900 dark:data-[state=on]:text-green-100"
                >
                  Completed ({stats.completed})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="In Progress"
                  variant="outline"
                  className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800 data-[state=on]:border-blue-300 dark:data-[state=on]:bg-blue-900 dark:data-[state=on]:text-blue-100"
                >
                  In Progress ({stats.inProgress})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Cancelled"
                  variant="outline"
                  className="data-[state=on]:bg-red-100 data-[state=on]:text-red-800 data-[state=on]:border-red-300 dark:data-[state=on]:bg-red-900 dark:data-[state=on]:text-red-100"
                >
                  Start ({stats.cancelled})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Pending"
                  variant="outline"
                  className="data-[state=on]:bg-yellow-100 data-[state=on]:text-yellow-800 data-[state=on]:border-yellow-300 dark:data-[state=on]:bg-yellow-900 dark:data-[state=on]:text-yellow-100"
                >
                  Immediate ({stats.pending})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="On Hold"
                  variant="outline"
                  className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-800 data-[state=on]:border-orange-300 dark:data-[state=on]:bg-orange-900 dark:data-[state=on]:text-orange-100"
                >
                  Requested ({stats.onHold})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Department Filter Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Service Filters:</label>
              </div>

              <ToggleGroup
                type="multiple"
                value={activeDepartmentFilters}
                onValueChange={handleDepartmentFilterToggle}
                className="flex flex-wrap justify-start gap-2"
              >
                <ToggleGroupItem
                  value="Mechanical"
                  variant="outline"
                  className="data-[state=on]:bg-purple-100 data-[state=on]:text-purple-800 data-[state=on]:border-purple-300 dark:data-[state=on]:bg-purple-900 dark:data-[state=on]:text-purple-100"
                >
                  Mechanical ({getSortedAndFilteredWorks().filter(w => w.department === 'Mechanical').length})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Electrical"
                  variant="outline"
                  className="data-[state=on]:bg-amber-100 data-[state=on]:text-amber-800 data-[state=on]:border-amber-300 dark:data-[state=on]:bg-amber-900 dark:data-[state=on]:text-amber-100"
                >
                  Electrical ({getSortedAndFilteredWorks().filter(w => w.department === 'Electrical').length})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Instrumentation"
                  variant="outline"
                  className="data-[state=on]:bg-cyan-100 data-[state=on]:text-cyan-800 data-[state=on]:border-cyan-300 dark:data-[state=on]:bg-cyan-900 dark:data-[state=on]:text-cyan-100"
                >
                  Service ({getSortedAndFilteredWorks().filter(w => w.department === 'Instrumentation').length})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Service"
                  variant="outline"
                  className="data-[state=on]:bg-rose-100 data-[state=on]:text-rose-800 data-[state=on]:border-rose-300 dark:data-[state=on]:bg-rose-900 dark:data-[state=on]:text-rose-100"
                >
                  Nitrate ({getSortedAndFilteredWorks().filter(w => w.department === 'Service').length})
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Operations"
                  variant="outline"
                  className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-800 data-[state=on]:border-indigo-300 dark:data-[state=on]:bg-indigo-900 dark:data-[state=on]:text-indigo-100"
                >
                  Other ({getSortedAndFilteredWorks().filter(w => w.department === 'Operations').length})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Active Filters Display */}
            {(activeFilters.length > 0 || activeDepartmentFilters.length > 0 || searchQuery.trim() || startDate || endDate) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Active Filters:</span>
                {startDate && (
                  <Badge variant="secondary" className="text-xs">
                    From: {format(startDate, 'dd MMM yyyy', { locale: fr })}
                  </Badge>
                )}
                {endDate && (
                  <Badge variant="secondary" className="text-xs">
                    To: {format(endDate, 'dd MMM yyyy', { locale: fr })}
                  </Badge>
                )}
                {activeFilters.map(filter => (
                  <Badge key={filter} variant="secondary" className="text-xs">
                    {translateStatus(filter)}
                  </Badge>
                ))}
                {activeDepartmentFilters.map(filter => (
                  <Badge key={filter} variant="secondary" className="text-xs">
                    {translateDepartment(filter)}
                  </Badge>
                ))}
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchQuery}"
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Works Table */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Maintenance Works
                {sortConfigs.length > 1 && (
                  <Badge variant="outline" className="text-xs">
                    Sorted by {sortConfigs.length} columns
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {selectedRows.size} of {getSortedAndFilteredWorks().length} selected for printing
                </Badge>
              </CardTitle>
              {allWorks.length > 0 && (
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={selectedRows.size === 0}
                >
                  <Download className="h-4 w-4" />
                  Export to PDF ({selectedRows.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allWorks.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No works registered yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding maintenance works on the main page
                </p>
                <Button onClick={() => navigate('/')}>
                  Go to Main Page
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === getSortedAndFilteredWorks().length && getSortedAndFilteredWorks().length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                        />
                      </TableHead>

                      <SortableHeader column="reference">Reference</SortableHeader>
                      <SortableHeader column="date">Date</SortableHeader>
                      <SortableHeader column="number">Num°</SortableHeader>
                      <TableHead>
                        <span className="min-w-[200px]">Designation</span>
                      </TableHead>
                      <SortableHeader column="department">Service</SortableHeader>
                      <SortableHeader column="status">Status</SortableHeader>
                      <TableHead>
                        <span className="min-w-[150px]">Observation</span>
                      </TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedAndFilteredWorks().map((work) => (
                      <TableRow key={work.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(work.id)}
                            onCheckedChange={(checked) => handleRowSelection(work.id, checked as boolean)}
                            aria-label={`Select row for ${work.reference}`}
                          />
                        </TableCell>
                        <TableCell>{work.reference}</TableCell>
                        <TableCell className="font-medium">
                          {format(new Date(work.date), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>{work.number}</TableCell>
                        <TableCell>
                          <div 
                            className="px-3 py-2 text-sm bg-gray-50 rounded border min-h-[60px] whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(work.description, searchQuery.toLowerCase().split(/\s+/))
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{translateDepartment(work.department)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(work.status)}>
                            {translateStatus(work.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div 
                            className="px-3 py-2 text-sm bg-gray-50 rounded border min-h-[60px] whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(work.remarks, searchQuery.toLowerCase().split(/\s+/))
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditWork(work)}
                              className="h-8 w-8 text-primary hover:text-primary"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {/* Delete button commented out for safety
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteWork(work.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            */}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Work</DialogTitle>
          </DialogHeader>

          {editingWork && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Num°:</label>
                  <Input
                    value={editingWork.number}
                    onChange={(e) => setEditingWork({ ...editingWork, number: e.target.value })}
                    onBlur={() => setEditingWork({ ...editingWork, number: editingWork.number.trim() })}
                    placeholder="001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference:</label>
                  <Input
                    value={editingWork.reference}
                    onChange={(e) => setEditingWork({ ...editingWork, reference: e.target.value })}
                    onBlur={() => setEditingWork({ ...editingWork, reference: editingWork.reference.trim() })}
                    placeholder="REF-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Designation:</label>
                <Textarea
                  value={editingWork.description}
                  onChange={(e) => setEditingWork({ ...editingWork, description: e.target.value })}
                  placeholder="Work description..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service:</label>
                  <Select
                    value={editingWork.department}
                    onValueChange={(value) => setEditingWork({ ...editingWork, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mechanical">Mechanical</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Instrumentation">Service</SelectItem>
                      <SelectItem value="Service">Nitrate</SelectItem>
                      <SelectItem value="Operations">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status:</label>
                  <Select
                    value={editingWork.status}
                    onValueChange={(value) => setEditingWork({ ...editingWork, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Cancelled">Start</SelectItem>
                      <SelectItem value="On Hold">Requested</SelectItem>
                      <SelectItem value="Pending">Immediate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Remarks:</label>
                <Textarea
                  value={editingWork.remarks}
                  onChange={(e) => setEditingWork({ ...editingWork, remarks: e.target.value })}
                  placeholder="Additional notes..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Professional Signature */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-2 px-2 z-50 shadow-lg">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between items-end">
            <div className="flex items-baseline gap-2">
              <p className="text-muted-foreground text-base tracking-wide">
                Issam Ben Ammar
              </p>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Production Engineer
              </p>
            </div>
            <div className="text-foreground font-medium text-base tracking-wide">
              {format(new Date(), 'EEEE .    do MMMM   yyyy', { locale: fr })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkSummary;