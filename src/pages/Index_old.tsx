import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, ChevronUp, ChevronDown, Upload, Edit2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import ProjectLogo from "@/components/ProjectLogo";

// Interface definition for work items
interface WorkItem {
  number: string;
  reference: string;
  description: string;
  department: string;
  status: string;
  remarks: string;
  date: string;
  id: string;
}

// Interface for error banner component props
interface ErrorBannerProps {
  message: string;
}

/**
 * ErrorBanner Component - Displays error messages to the user
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => (
  <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
    {message}
  </div>
);

/**
 * Main Index Component - Maintenance Work Tracking System
 */
const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get('year') || localStorage.getItem('selectedYear') || new Date().getFullYear().toString();

  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<string>(yearParam);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [sortField, setSortField] = useState<keyof WorkItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewWork, setIsNewWork] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datesWithWorks, setDatesWithWorks] = useState<string[]>([]);
  const [works, setWorks] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'number' | 'reference' | null>(null);

  /**
   * Fetches all works data from the backend
   */
  const fetchWorks = async () => {
    try {
      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("⚠️ Application unavailable: no connection to shared file");
        }
        throw new Error("❌ Server error");
      }

      const data = await response.json();
      setWorks(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setWorks({});
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [selectedDate, selectedYear]);

  /**
   * Loads work items for the selected date
   */
  const loadWorkItems = async () => {
    try {
      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      const allWorks = await response.json();
      const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
      setWorkItems(allWorks[dateKey] || []);
    } catch (error) {
      console.error('Error loading works from backend:', error);
      const savedData = localStorage.getItem('maintenance-works');
      if (savedData) {
        try {
          const allWorks = JSON.parse(savedData);
          const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
          setWorkItems(allWorks[dateKey] || []);
        } catch (error) {
          console.error('Error loading data from localStorage:', error);
        }
      }
    }
  };

  // Effect to load work items and dates with works when selected date changes
  useEffect(() => {
    loadWorkItems();
    loadDatesWithWorks();
  }, [selectedDate]);

  /**
   * Loads all dates that have work items
   */
  const loadDatesWithWorks = async () => {
    try {
      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      const allWorks = await response.json();
      setDatesWithWorks(
        Object.keys(allWorks).filter(date => allWorks[date] && allWorks[date].length > 0)
      );
    } catch (error) {
      console.error("Error loading dates with works:", error);
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
        return "-";
      default:
        return department;
    }
  };

  /**
   * Adds a new work item and opens the edit dialog
   */
  const addWorkItem = () => {
    const newItem: WorkItem = {
      number: "",
      reference: "",
      description: "",
      department: "",
      status: "En cours",
      remarks: "",
      date: format(selectedDate, 'yyyy-MM-dd', { locale: fr }),
      id: Date.now().toString(),
    };
    setEditingWork(newItem);
    setIsNewWork(true);
    setIsEditDialogOpen(true);
    setLastEditedField(null); // Reset last edited field
  };

  /**
   * Finds the most recent work item by number across all dates
   */
  const findMostRecentWorkByNumber = async (number: string): Promise<WorkItem | null> => {
    try {
      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      const allWorks = await response.json();
      let mostRecentWork: WorkItem | null = null;
      let mostRecentDate = '';

      Object.keys(allWorks).forEach(dateKey => {
        const dayWorks = allWorks[dateKey] || [];
        dayWorks.forEach((work: WorkItem) => {
          if (work.number.toLowerCase() === number.toLowerCase()) {
            if (!mostRecentWork || dateKey > mostRecentDate) {
              mostRecentWork = work;
              mostRecentDate = dateKey;
            }
          }
        });
      });

      return mostRecentWork;
    } catch (error) {
      console.error('Error searching for number:', error);
      // Fallback: localStorage
      const savedData = localStorage.getItem('maintenance-works');
      if (!savedData) return null;

      try {
        const allWorks = JSON.parse(savedData);
        let mostRecentWork: WorkItem | null = null;
        let mostRecentDate = '';

        Object.keys(allWorks).forEach(dateKey => {
          const dayWorks = allWorks[dateKey] || [];
          dayWorks.forEach((work: WorkItem) => {
            if (work.number.toLowerCase() === number.toLowerCase()) {
              if (!mostRecentWork || dateKey > mostRecentDate) {
                mostRecentWork = work;
                mostRecentDate = dateKey;
              }
            }
          });
        });

        return mostRecentWork;
      } catch (error) {
        console.error('Error searching for number in localStorage:', error);
        return null;
      }
    }
  };

  /**
   * Handles reference field changes with auto-fill functionality
   */
  const handleReferenceChange = async (value: string, fromBlur: boolean = false) => {
    if (!editingWork) return;

    const updatedWork = { ...editingWork, reference: value };
    setEditingWork(updatedWork);
    
    // Only mark as edited if it's manual input, not from blur
    if (!fromBlur) {
      setLastEditedField('reference');
    }

    // Auto-fill ONLY if it's a manual change (typing), not from blur
    if (value.trim() && !fromBlur) {
      const existingWork = await findMostRecentWorkByReference(value.trim());
      if (existingWork) {
        setEditingWork(prev => prev ? {
          ...prev,
          description: existingWork.description,
          remarks: existingWork.remarks,
          department: existingWork.department,
          status: existingWork.status,
          number: existingWork.number,
        } : null);
        toast({
          title: "Auto-fill",
          description: `Reference "${value}" found - data filled automatically`,
        });
      }
    }
  };

  /**
   * Finds the most recent work item by reference across all dates
   */
  const findMostRecentWorkByReference = async (reference: string): Promise<WorkItem | null> => {
    try {
      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      const allWorks = await response.json();
      let mostRecentWork: WorkItem | null = null;
      let mostRecentDate = '';

      // Search through all dates for matching references
      Object.keys(allWorks).forEach(dateKey => {
        const dayWorks = allWorks[dateKey] || [];
        dayWorks.forEach((work: WorkItem) => {
          if (work.reference.toLowerCase() === reference.toLowerCase()) {
            if (!mostRecentWork || dateKey > mostRecentDate) {
              mostRecentWork = work;
              mostRecentDate = dateKey;
            }
          }
        });
      });

      return mostRecentWork;
    } catch (error) {
      console.error('Error searching for reference:', error);
      // Fallback to localStorage
      const savedData = localStorage.getItem('maintenance-works');
      if (!savedData) return null;

      try {
        const allWorks = JSON.parse(savedData);
        let mostRecentWork: WorkItem | null = null;
        let mostRecentDate = '';

        Object.keys(allWorks).forEach(dateKey => {
          const dayWorks = allWorks[dateKey] || [];
          dayWorks.forEach((work: WorkItem) => {
            if (work.reference.toLowerCase() === reference.toLowerCase()) {
              if (!mostRecentWork || dateKey > mostRecentDate) {
                mostRecentWork = work;
                mostRecentDate = dateKey;
              }
            }
          });
        });

        return mostRecentWork;
      } catch (error) {
        console.error('Error searching for reference in localStorage:', error);
        return null;
      }
    }
  };

  /**
   * Handles number field changes with auto-fill functionality
   */
  const handleNumberChange = async (value: string, fromBlur: boolean = false) => {
    if (!editingWork) return;

    const updatedWork = { ...editingWork, number: value };
    setEditingWork(updatedWork);
    
    // Only mark as edited if it's manual input, not from blur
    if (!fromBlur) {
      setLastEditedField('number');
    }

    // Auto-fill ONLY if it's a manual change (typing), not from blur
    if (value.trim() && !fromBlur) {
      const existingWork = await findMostRecentWorkByNumber(value.trim());
      if (existingWork) {
        setEditingWork(prev => prev ? {
          ...prev,
          description: existingWork.description,
          remarks: existingWork.remarks,
          department: existingWork.department,
          status: existingWork.status,
          reference: existingWork.reference,
        } : null);
        toast({
          title: "Auto-fill",
          description: `Number "${value}" found - data filled automatically`,
        });
      }
    }
  };

  /**
   * Opens the edit dialog for an existing work item
   */
  const handleEditWork = (work: WorkItem) => {
    setEditingWork({ ...work });
    setIsNewWork(false);
    setIsEditDialogOpen(true);
    setLastEditedField(null); // Reset last edited field
  };

  /**
   * Saves work item to backend and updates local state
   */
  const handleSaveWork = async () => {
    if (!editingWork) return;

    // Validate required fields
    if (!editingWork.number || !editingWork.reference || !editingWork.description || !editingWork.department) {
      toast({
        title: "Validation error",
        description: "Please fill all required fields (Number, Reference, Description, Service)",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("📡 Starting save process...");

      const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }
      
      const allWorks = await response.json();
      console.log("✅ Data retrieved from backend");

      const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
      let existingItems = allWorks[dateKey] || [];

      // 2. Add or modify the item
      if (isNewWork) {
        // ✅ NEW ITEM - Add directly
        console.log("➕ Adding new item");
        existingItems = [...existingItems, editingWork];
      } else {
        // ✅ EXISTING ITEM - Find and modify
        console.log("✏️ Modifying existing item");
        const workIndex = existingItems.findIndex((item: WorkItem) => item.id === editingWork.id);
        
        if (workIndex >= 0) {
          console.log(`📍 Item found at index ${workIndex}`);
          existingItems[workIndex] = editingWork;
        } else {
          // ❌ ITEM NOT FOUND
          console.warn("❌ Item not found for modification - ID:", editingWork.id);
          toast({
            title: "❌ Item not found",
            description: "Cannot modify - item does not exist in backend",
            variant: "destructive"
          });
          return; // Stop here
        }
      }

      // 3. Check for duplicates
      const { deduplicated, removedCount } = removeDuplicates(
        [editingWork], 
        existingItems.filter((item: WorkItem) => item.id !== editingWork.id)
      );

      if (removedCount > 0) {
        console.log(`🚫 ${removedCount} duplicate(s) removed`);
      }

      // 4. Prepare data to send (ONLY current date)
      const dataToSend = {
        [dateKey]: deduplicated
      };

      console.log(`📦 Sending data for ${dateKey}`);

      const saveResponse = await fetch(`http://localhost:5000/works?year=${selectedYear}`, {
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

      console.log("✅ Save successful");

      const updatedResponse = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
      const updatedAllWorks = await updatedResponse.json();
      const updatedItems = updatedAllWorks[dateKey] || [];
      
      setWorkItems(updatedItems);

      // Success message
      let successMessage = isNewWork ? "Work added successfully" : "Work modified successfully";
      if (removedCount > 0) {
        successMessage += ` (${removedCount} duplicate(s) removed)`;
      }

      toast({
        title: "✅ Success",
        description: successMessage,
      });

    } catch (error) {
      // 🔴 DETAILED ERROR HANDLING
      console.error('💥 Error during save:', error);
      
      let errorTitle = "❌ Error";
      let errorDescription = "An error occurred during save";

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorTitle = "🔴 Connection impossible";
        errorDescription = "Cannot contact server - please verify it's running";
      } else if (error.message.includes('Backend error')) {
        errorTitle = "🔴 Server error";
        errorDescription = `Server returned error: ${error.message}`;
      } else if (error.message.includes('Save failed')) {
        errorTitle = "❌ Save failed";
        errorDescription = "Changes could not be saved";
      }

      // Fallback to localStorage ONLY for new entries
      if (isNewWork) {
        console.log("🔄 Fallback to localStorage...");
        try {
          const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
          const savedData = localStorage.getItem('maintenance-works');
          const allWorks = savedData ? JSON.parse(savedData) : {};

          let existingItems = allWorks[dateKey] || [];
          existingItems = [...existingItems, editingWork];

          const { deduplicated } = removeDuplicates([editingWork], existingItems.filter((item: WorkItem) => item.id !== editingWork.id));
          allWorks[dateKey] = deduplicated;

          localStorage.setItem('maintenance-works', JSON.stringify(allWorks));
          setWorkItems(deduplicated);

          toast({
            title: "💾 Saved locally",
            description: "Backend unavailable - data saved locally",
            variant: "default"
          });
        } catch (fallbackError) {
          console.error("❌ Fallback failed:", fallbackError);
          toast({
            title: "❌ Complete error",
            description: "Cannot save even locally",
            variant: "destructive"
          });
        }
      } else {
        // For modifications, no fallback
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive"
        });
      }
    } finally {
      // Always close dialog
      setIsEditDialogOpen(false);
      setEditingWork(null);
      setIsNewWork(false);
    }
  };

  /**
   * Removes a work item from backend and local state
   */
  const removeWorkItem = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5000/works/${id}?year=${selectedYear}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setWorkItems(items => items.filter(item => item.id !== id));

        // Re-fetch data to confirm deletion
        await loadWorkItems();

        toast({
          title: "Success",
          description: "Work deleted successfully",
        });
      } else {
        throw new Error('Backend deletion failed');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      // Fallback: remove from local state only
      setWorkItems(items => items.filter(item => item.id !== id));

      toast({
        title: "Locally deleted",
        description: "Item removed from current view. Backend unavailable.",
        variant: "destructive"
      });
    }
  };

  /**
   * Removes duplicate work items based on all fields
   */
  const removeDuplicates = (items: WorkItem[], existingItems: WorkItem[]): { deduplicated: WorkItem[], removedCount: number } => {
    const allItems = [...existingItems, ...items];
    const uniqueItems: WorkItem[] = [];
    let removedCount = 0;

    allItems.forEach(item => {
      const isDuplicate = uniqueItems.some(existing =>
        existing.number === item.number &&
        existing.reference === item.reference &&
        existing.description === item.description &&
        existing.department === item.department &&
        existing.status === item.status &&
        existing.remarks === item.remarks &&
        existing.date === item.date
      );

      if (!isDuplicate) {
        uniqueItems.push(item);
      } else {
        removedCount++;
      }
    });

    return { deduplicated: uniqueItems, removedCount };
  };

  /**
   * Handles table sorting by field
   */
  const handleSort = (field: keyof WorkItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Returns sorted work items based on current sort field and direction
   */
  const getSortedWorkItems = () => {
    if (!sortField) {
      // Sort by creation timestamp (most recent first)
      return [...workItems].sort((a, b) => {
        // If IDs are timestamps
        const aTime = parseInt(a.id);
        const bTime = parseInt(b.id);
        
        // If valid timestamps
        if (!isNaN(aTime) && !isNaN(bTime)) {
          return bTime - aTime;
        }
        
        // Fallback: reverse alphabetical sort of IDs
        return b.id.localeCompare(a.id);
      });
    }

    return [...workItems].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();

      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  /**
   * Triggers file input for JSON import
   */
  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  /**
   * Applies auto-fill logic to imported items
   */
  const applyAutoFillToImportedItems = async (items: WorkItem[]): Promise<WorkItem[]> => {
    const processedItems = [...items];

    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];

      // Apply auto-fill logic if description or remarks are empty and reference exists
      if (item.reference.trim() && (!item.description.trim() || !item.remarks.trim())) {
        try {
          const existingWork = await findMostRecentWorkByReference(item.reference.trim());
          if (existingWork) {
            if (!item.description.trim()) {
              processedItems[i] = { ...processedItems[i], description: existingWork.description };
            }
            if (!item.remarks.trim()) {
              processedItems[i] = { ...processedItems[i], remarks: existingWork.remarks };
            }
          }
        } catch (error) {
          console.warn(`Auto-fill failed for reference ${item.reference}:`, error);
        }
      }
    }

    return processedItems;
  };

  /**
   * Processes imported JSON data and merges with existing data
   */
  const processImportedItems = async (importedData: any): Promise<{ totalImported: number, totalDuplicatesRemoved: number }> => {
    let totalImported = 0;
    let totalDuplicatesRemoved = 0;
    const currentDateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });

    try {
      // Process each date in the imported data
      for (const dateKey of Object.keys(importedData)) {
        const dayWorks = importedData[dateKey];
        if (Array.isArray(dayWorks)) {
          // Generate IDs for imported items and validate structure
          let worksWithIds = dayWorks.map((item, index) => {
            if (!item.number || !item.reference || !item.description || !item.department) {
              throw new Error(`Missing required fields: ${JSON.stringify(item)}`);
            }
            return {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`, // Unique ID
              date: dateKey,
              status: item.status || 'Pending',
              remarks: item.remarks || ''
            };
          });

          // Apply auto-fill logic to imported items
          worksWithIds = await applyAutoFillToImportedItems(worksWithIds);

          // If importing to current date, merge with current workItems
          if (dateKey === currentDateKey) {
            const mergedItems = [...workItems, ...worksWithIds];
            setWorkItems(mergedItems);
            totalImported += worksWithIds.length;

            // Show auto-fill notifications
            const autoFilledReferences = worksWithIds
              .filter(item => item.reference.trim())
              .map(item => item.reference)
              .filter((ref, index, arr) => arr.indexOf(ref) === index);

            if (autoFilledReferences.length > 0) {
              setTimeout(() => {
                toast({
                  title: "Auto-fill applied",
                  description: `Auto-fill applied to ${autoFilledReferences.length} imported data`,
                });
              }, 200);
            }
          } else {
            try {
              const response = await fetch(`http://localhost:5000/works?year=${selectedYear}`);
              const allWorks = await response.json();
              const existingItems = allWorks[dateKey] || [];
              const { deduplicated, removedCount } = removeDuplicates(worksWithIds, existingItems);

              allWorks[dateKey] = deduplicated;

              const saveResponse = await fetch(`http://localhost:5000/works?year=${selectedYear}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(allWorks),
              });

              if (!saveResponse.ok) {
                throw new Error('Failed to save imported data for date: ' + dateKey);
              }

              totalImported += worksWithIds.length;
              totalDuplicatesRemoved += removedCount;
            } catch (error) {
              console.error(`Error saving imported data for date ${dateKey}:`, error);
              // Fallback to localStorage
              const savedData = localStorage.getItem('maintenance-works');
              const allWorks = savedData ? JSON.parse(savedData) : {};
              const existingItems = allWorks[dateKey] || [];
              const { deduplicated, removedCount } = removeDuplicates(worksWithIds, existingItems);

              allWorks[dateKey] = deduplicated;
              localStorage.setItem('maintenance-works', JSON.stringify(allWorks));

              totalImported += worksWithIds.length;
              totalDuplicatesRemoved += removedCount;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in processImportedItems:', error);
      throw error; // Propagate error
    }

    return { totalImported, totalDuplicatesRemoved };
  };

  /**
   * Handles JSON file upload and import process
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file",
        description: "Please select a JSON file",
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File must not exceed 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate data structure
      if (typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)) {
        throw new Error('Invalid data structure: must be an object');
      }

      // Verify there's at least one date with data
      const validDates = Object.keys(importedData).filter(date => 
        Array.isArray(importedData[date]) && importedData[date].length > 0
      );
      
      if (validDates.length === 0) {
        throw new Error('No valid data found in file');
      }

      // Process imported items
      const { totalImported, totalDuplicatesRemoved } = await processImportedItems(importedData);

      // Refresh the current view
      await loadWorkItems();

      let successMessage = `Import successful: ${totalImported} items imported`;
      if (totalDuplicatesRemoved > 0) {
        successMessage += ` (${totalDuplicatesRemoved} duplicates removed)`;
      }

      toast({
        title: "Import successful",
        description: successMessage,
      });

    } catch (error) {
      console.error('Error during import:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data. Please check file format.",
        variant: "destructive"
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * SortableHeader Component - Table header with sorting functionality
   */
  const SortableHeader = ({ field, children, className }: {
    field: keyof WorkItem;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={cn("cursor-pointer hover:bg-muted/50 select-none", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      {error ? <ErrorBanner message={error} /> : null}
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
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Technical Shutdown AT2025
            </h1>
            <p className="text-muted-foreground text-lg">
              Daily maintenance work tracking system
            </p>
          </div>

          {/* Date Picker and Actions */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span>Select a date</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[240px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : <span>Select a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                        locale={fr}
                        modifiers={{
                          hasWork: datesWithWorks.map(d => new Date(d)) // convert string to Date
                        }}
                        modifiersClassNames={{
                          hasWork: "bg-green-200 text-green-900 font-bold rounded-full"
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    onClick={() => navigate(`/summary?year=${selectedYear}`)}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    View Summary
                  </Button>
                  <Button
                    onClick={() => navigate('/home')}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Dashboard
                  </Button>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-white px-3 py-2 rounded-md border">
                    Year: {selectedYear}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Work Items Table */}
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span>Works for: {format(selectedDate, 'EEEE  do MMMM   yyyy', { locale: fr })}</span>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={addWorkItem} size="sm" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Work
                  </Button>
                  <Button onClick={handleImportData} variant="outline" size="sm" className="w-full sm:w-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="number" className="w-20">Num°</SortableHeader>
                      <SortableHeader field="reference" className="w-32">Reference</SortableHeader>
                      <SortableHeader field="description" className="min-w-[200px]">Designation</SortableHeader>
                      <SortableHeader field="department" className="w-32">Service</SortableHeader>
                      <SortableHeader field="status" className="w-28">Status</SortableHeader>
                      <SortableHeader field="remarks" className="min-w-[150px]">Observation</SortableHeader>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No work added yet. Click 'Add Work' to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getSortedWorkItems().map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border">
                              {item.number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border">
                              {item.reference}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border min-h-[60px] whitespace-pre-wrap">
                              {item.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border">
                              {translateDepartment(item.department)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border">
                              {translateStatus(item.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="px-3 py-2 text-sm bg-gray-50 rounded border min-h-[60px] whitespace-pre-wrap">
                              {item.remarks || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditWork(item)}
                                className="h-8 w-8 text-primary hover:text-primary"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeWorkItem(item.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Hidden file input for JSON import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Edit/Add Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isNewWork ? 'Add New Work' : 'Edit Work'}</DialogTitle>
            </DialogHeader>

            {editingWork && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Num°:</label>
                    <Input
                      value={editingWork.number}
                      onChange={(e) => handleNumberChange(e.target.value, false)}
                      onBlur={(e) => {
                        // Trim only, no auto-fill
                        const trimmedValue = e.target.value.trim();
                        if (trimmedValue !== editingWork.number) {
                          handleNumberChange(trimmedValue, true); // true = from blur
                        }
                      }}
                      placeholder="001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reference:</label>
                    <Input
                      value={editingWork.reference}
                      onChange={(e) => handleReferenceChange(e.target.value, false)}
                      onBlur={(e) => {
                        // Trim only, no auto-fill
                        const trimmedValue = e.target.value.trim();
                        if (trimmedValue !== editingWork.reference) {
                          handleReferenceChange(trimmedValue, true); // true = from blur
                        }
                      }}
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
                        <SelectItem value="Operations">-</SelectItem>
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
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Start</SelectItem>
                        <SelectItem value="Pending">Immediate</SelectItem>
                        <SelectItem value="On Hold">Requested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observation:</label>
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
              <Button onClick={handleSaveWork}>
                {isNewWork ? 'Add' : 'Save'}
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
    </div>
  );
};

export default Index;