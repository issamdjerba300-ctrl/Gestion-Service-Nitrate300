import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, ChevronUp, ChevronDown, Upload, Edit2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
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
import * as travauxService from "@/services/travauxService";
import type { WorkItem } from "@/services/travauxService";

interface ErrorBannerProps {
  message: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => (
  <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
    {message}
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [sortField, setSortField] = useState<keyof WorkItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewWork, setIsNewWork] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datesWithWorks, setDatesWithWorks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'number' | 'reference' | null>(null);

  useEffect(() => {
    loadWorkItems();
    loadDatesWithWorks();
  }, [selectedDate]);

  const loadWorkItems = async () => {
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
      const works = await travauxService.getWorksByDate(dateKey);
      setWorkItems(works);
      setError(null);
    } catch (error: any) {
      console.error('Error loading works:', error);
      setError(error.message);
      setWorkItems([]);
    }
  };

  const loadDatesWithWorks = async () => {
    try {
      const year = selectedDate.getFullYear();
      const dates = await travauxService.getDatesWithWorks(year);
      setDatesWithWorks(dates);
    } catch (error) {
      console.error("Error loading dates with works:", error);
    }
  };

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

  const addWorkItem = () => {
    const newItem: WorkItem = {
      number: "",
      reference: "",
      description: "",
      department: "",
      status: "En cours",
      remarks: "",
      date: format(selectedDate, 'yyyy-MM-dd', { locale: fr }),
      id: crypto.randomUUID(),
    };
    setEditingWork(newItem);
    setIsNewWork(true);
    setIsEditDialogOpen(true);
    setLastEditedField(null);
  };

  const findMostRecentWorkByNumber = async (number: string): Promise<WorkItem | null> => {
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
      return await travauxService.findMostRecentWorkByNumber(number, dateKey);
    } catch (error) {
      console.error('Error searching for number:', error);
      return null;
    }
  };

  const handleReferenceChange = async (value: string, fromBlur: boolean = false) => {
    if (!editingWork) return;

    const updatedWork = { ...editingWork, reference: value };
    setEditingWork(updatedWork);

    if (!fromBlur) {
      setLastEditedField('reference');
    }

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

  const findMostRecentWorkByReference = async (reference: string): Promise<WorkItem | null> => {
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd', { locale: fr });
      return await travauxService.findMostRecentWorkByReference(reference, dateKey);
    } catch (error) {
      console.error('Error searching for reference:', error);
      return null;
    }
  };

  const handleNumberChange = async (value: string, fromBlur: boolean = false) => {
    if (!editingWork) return;

    const updatedWork = { ...editingWork, number: value };
    setEditingWork(updatedWork);

    if (!fromBlur) {
      setLastEditedField('number');
    }

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

  const handleEditWork = (work: WorkItem) => {
    setEditingWork({ ...work });
    setIsNewWork(false);
    setIsEditDialogOpen(true);
    setLastEditedField(null);
  };

  const handleSaveWork = async () => {
    if (!editingWork) return;

    if (!editingWork.number || !editingWork.reference || !editingWork.description || !editingWork.department) {
      toast({
        title: "Validation error",
        description: "Please fill all required fields (Number, Reference, Description, Service)",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isNewWork) {
        await travauxService.createWork(editingWork);
        toast({
          title: "Success",
          description: "Work added successfully",
        });
      } else {
        await travauxService.updateWork(editingWork.id, editingWork);
        toast({
          title: "Success",
          description: "Work modified successfully",
        });
      }

      await loadWorkItems();
      await loadDatesWithWorks();
      setIsEditDialogOpen(false);
      setEditingWork(null);
      setIsNewWork(false);
    } catch (error: any) {
      console.error('Error saving work:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save work",
        variant: "destructive"
      });
    }
  };

  const removeWorkItem = async (id: string) => {
    try {
      await travauxService.deleteWork(id);
      await loadWorkItems();
      await loadDatesWithWorks();
      toast({
        title: "Success",
        description: "Work deleted successfully",
      });
    } catch (error: any) {
      console.error('Error during deletion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete work",
        variant: "destructive"
      });
    }
  };

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

  const handleSort = (field: keyof WorkItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedWorkItems = () => {
    if (!sortField) {
      return [...workItems].sort((a, b) => {
        const aTime = parseInt(a.id);
        const bTime = parseInt(b.id);

        if (!isNaN(aTime) && !isNaN(bTime)) {
          return bTime - aTime;
        }

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

  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file",
        description: "Please select a JSON file",
        variant: "destructive"
      });
      return;
    }

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

      if (typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)) {
        throw new Error('Invalid data structure: must be an object');
      }

      const validDates = Object.keys(importedData).filter(date =>
        Array.isArray(importedData[date]) && importedData[date].length > 0
      );

      if (validDates.length === 0) {
        throw new Error('No valid data found in file');
      }

      const allImportItems: WorkItem[] = [];
      for (const dateKey of validDates) {
        const dayWorks = importedData[dateKey];
        if (Array.isArray(dayWorks)) {
          dayWorks.forEach((item: any) => {
            if (item.number && item.reference && item.description && item.department) {
              allImportItems.push({
                ...item,
                id: crypto.randomUUID(),
                date: dateKey,
                status: item.status || 'Pending',
                remarks: item.remarks || ''
              });
            }
          });
        }
      }

      if (allImportItems.length > 0) {
        await travauxService.bulkCreateWorks(allImportItems);
        await loadWorkItems();
        await loadDatesWithWorks();

        toast({
          title: "Import successful",
          description: `${allImportItems.length} items imported successfully`,
        });
      }

    } catch (error: any) {
      console.error('Error during import:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import data. Please check file format.",
        variant: "destructive"
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <Navbar />
      {error ? <ErrorBanner message={error} /> : null}
      <div className="pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
           {/* Logo positioned at top left */}
        <div className="absolute top-20 left-6">
          <div className="flex flex-col items-start gap-1">
            <ProjectLogo size="large" />
            <div className="text-sm text-muted-foreground font-medium leading-tight">
              <div>Ammonitrate Plant</div>
              <div>Nitrate Service</div>
            </div>
          </div>
        </div>
          <div className="text-center mb-8">
            <div className="mb-8"></div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
              Technical Shutdown
            </h1>
            <p className="text-slate-600 text-lg">
              Daily maintenance work tracking system
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Ammonitrate Plant - Nitrate Service
            </p>
          </div>
          <div className="mb-20"></div>
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
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
                          hasWork: datesWithWorks.map(d => new Date(d))
                        }}
                        modifiersClassNames={{
                          hasWork: "bg-green-200 text-green-900 font-bold rounded-full"
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    onClick={() => navigate('/summary')}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  >
                    View Summary
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span>Works for: {format(selectedDate, 'EEEE  do MMMM   yyyy', { locale: fr })}</span>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={addWorkItem} size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Work
                  </Button>
                  <Button onClick={handleImportData} variant="outline" size="sm" className="w-full sm:w-auto hover:bg-slate-100">
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

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
                        const trimmedValue = e.target.value.trim();
                        if (trimmedValue !== editingWork.number) {
                          handleNumberChange(trimmedValue, true);
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
                        const trimmedValue = e.target.value.trim();
                        if (trimmedValue !== editingWork.reference) {
                          handleReferenceChange(trimmedValue, true);
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

        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 py-3 px-4 z-40 shadow-lg">
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center">
              <div className="flex items-baseline gap-2">
                <p className="text-slate-700 text-base font-medium tracking-wide">
                  Issam Ben Ammar
                </p>
                <p className="text-slate-500 text-xs uppercase tracking-wider">
                  Production Engineer
                </p>
              </div>
              <div className="text-slate-700 font-medium text-base tracking-wide">
                {format(new Date(), 'EEEE, do MMMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
