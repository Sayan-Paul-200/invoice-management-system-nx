import { useMemo, useState } from 'react';
import { Stack, Paper, Title, Group, Button } from '@mantine/core';
import { IconPlus, IconFileTypeXls, IconTrash } from '@tabler/icons-react'; // Added IconTrash
import { utils, writeFile } from 'xlsx';

import { DUMMY_INVOICES } from '@lib/invoices';
import { InvoiceTable } from '@components/default/InvoiceTable';
import { DashboardFilters, FilterState } from '@components/dashboard/DashboardFilters';

const Invoices = () => {
  // --- Data & Selection State ---
  const [allInvoices, setAllInvoices] = useState(DUMMY_INVOICES); // Local state to allow deletion
  const [selectedRows, setSelectedRows] = useState<number[]>([]); // Selection state lifted up

  // --- Filter State ---
  const [filters, setFilters] = useState<FilterState>({
    project: null,
    state: null,
    status: null,
    billCategory: null,
    dateRange: [null, null]
  });

  // --- 1. Extract Unique Filter Options from Data ---
  const { projects, states, statuses, billCategories } = useMemo(() => {
    const p = new Set<string>();
    const s = new Set<string>();
    const st = new Set<string>();
    const bc = new Set<string>();

    allInvoices.forEach(inv => {
      if (inv.project) p.add(inv.project);
      if (inv.state) s.add(inv.state);
      if (inv.status) st.add(inv.status);
      if (inv.billCategory) bc.add(inv.billCategory);
    });

    return {
      projects: Array.from(p).sort(),
      states: Array.from(s).sort(),
      statuses: Array.from(st).sort(),
      billCategories: Array.from(bc).sort(),
    };
  }, [allInvoices]); // Recalculate options if invoices are deleted

  // --- 2. Filter Logic ---
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(inv => {
      // Basic Field Filters
      if (filters.project && inv.project !== filters.project) return false;
      if (filters.state && inv.state !== filters.state) return false;
      if (filters.billCategory && inv.billCategory !== filters.billCategory) return false;
      if (filters.status && inv.status !== filters.status) return false;

      // Date Range Filter Logic
      const [start, end] = filters.dateRange;
      if (start && end) {
        const invDate = new Date(inv.invoiceDate);
        
        // Normalize search range to handle full days
        const startDate = new Date(start);
        const endDate = new Date(end);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Normalize invoice date for comparison
        const checkDate = new Date(invDate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < startDate || checkDate > endDate) return false;
      }

      return true;
    });
  }, [filters, allInvoices]);

  // --- Helper to format date for Excel (YYYY-MM-DD) ---
  const formatDateForExcel = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; 
    return date.toISOString().split('T')[0];
  };

  // --- Export Function ---
  const handleExport = () => {
    const exportData = filteredInvoices.map(inv => ({
      'Project': inv.project,
      'Mode of Project': inv.modeOfProject,
      'State': inv.state,
      'Bill Category': inv.billCategory,
      'Milestone': inv.milestone,
      'Invoice Number': inv.invoiceNumber,
      'Invoice Date': formatDateForExcel(inv.invoiceDate),
      'Submission Date': formatDateForExcel(inv.submissionDate),
      'Invoice Basic Amount': inv.invoiceBasicAmount,
      'GST Percentage': inv.gstPercentageApplicable,
      'Invoice GST Amount': inv.invoiceGstAmount,
      'Total Amount': inv.totalAmount,
      'Passed Amount By Client': inv.passedAmountByClient,
      'Retention': inv.retention,
      'GST Withheld': inv.gstWithheld,
      'TDS': inv.tds,
      'GST TDS': inv.gstTds,
      'BOCW': inv.bocw,
      'Low Depth Deduction': inv.lowDepthDeduction,
      'LD': inv.ld,
      'SLA Penalty': inv.slaPenalty,
      'Penalty': inv.penalty,
      'Other Deduction': inv.otherDeduction,
      'Total Deduction': inv.totalDeduction,
      'Net Payable': inv.netPayable,
      'Status': inv.status,
      'Amount Paid By Client': inv.amountPaidByClient,
      'Payment Date': formatDateForExcel(inv.paymentDate),
      'Balance': inv.balancePendingAmount,
      'Remarks': inv.remarks,
      'Invoice Copy Path': '',
      'Proof Of Submission Path': '',
      'Supporting Docs Path': ''
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Invoices');
    const timestamp = new Date().toISOString().split('T')[0];
    writeFile(workbook, `Invoices_Export_${timestamp}.xlsx`);
  };

  // --- Delete Function ---
  const handleDeleteInvoices = () => {
    if (selectedRows.length === 0) return;
    
    // Filter out the selected invoices from the main state
    setAllInvoices((currentInvoices) => 
      currentInvoices.filter((inv) => !selectedRows.includes(inv.slNo))
    );
    
    // Clear selection after deletion
    setSelectedRows([]);
  };

  return (
    <Stack gap="lg" pb="lg">
      {/* Top Filter Bar */}
      <DashboardFilters 
        projects={projects}
        states={states}
        statuses={statuses}
        billCategories={billCategories}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Main Invoices Section */}
      <Paper style={{ background: "transparent" }}>
        <Group justify="end" mb="md">
          {/* Export Button */}
          <Button 
            leftSection={<IconFileTypeXls size={16} />} 
            size="sm" 
            variant="default"
            onClick={handleExport}
          >
            Export in Excel
          </Button>

          {/* Create Button */}
          <Button leftSection={<IconPlus size={16} />} size="sm">
            Create Invoice
          </Button>

          {/* Delete Button (Visible only when rows selected) */}
          {selectedRows.length > 0 && (
            <Button 
              leftSection={<IconTrash size={16} />} 
              size="sm" 
              color="red"
              onClick={handleDeleteInvoices}
            >
              Delete Invoices
            </Button>
          )}
        </Group>

        <InvoiceTable 
          data={filteredInvoices} 
          dashboardTable={false} 
          sort={true} 
          actions={true} 
          multiSelection={true} 
          // Pass controlled selection props
          selection={selectedRows}
          onSelectionChange={setSelectedRows}
        />
      </Paper>
    </Stack>
  );
};

export default Invoices;