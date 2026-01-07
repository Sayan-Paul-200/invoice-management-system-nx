import { useMemo, useState } from 'react';
import { SimpleGrid, Stack, Grid, Paper, Title } from '@mantine/core';
import { 
  IconFileInvoice, 
  IconReceiptTax, 
  IconCalculator, 
  IconCircleCheck, 
  IconClock 
} from '@tabler/icons-react';

import { DUMMY_INVOICES } from '@lib/invoices';
import { KpiCard } from '@components/dashboard/KpiCard';
import { DeductionsBox } from '@components/dashboard/DeductionsBox';
import { InvoiceStateBarChart } from '@components/dashboard/InvoiceStateBarChart';
import { InvoiceStatusDonutChart } from '@components/dashboard/InvoiceStatusDonutChart';
import { InvoiceTable } from '@components/default/InvoiceTable';
import { DashboardFilters, FilterState } from '@components/dashboard/DashboardFilters';

const AdminDashboard = () => {
  // --- Filter State ---
  // Updated: Removed 'fy' as it is now handled internally by dateRange presets
  const [filters, setFilters] = useState<FilterState>({
    project: null,
    state: null,
    status: null,
    dateRange: [null, null]
  });

  // --- 1. Extract Filter Options from Data ---
  const { projects, states, statuses } = useMemo(() => {
    const p = new Set<string>();
    const s = new Set<string>();
    const st = new Set<string>();

    DUMMY_INVOICES.forEach(inv => {
      if(inv.project) p.add(inv.project);
      if(inv.state) s.add(inv.state);
      if(inv.status) st.add(inv.status);
    });

    return {
      projects: Array.from(p).sort(),
      states: Array.from(s).sort(),
      statuses: Array.from(st).sort(),
    };
  }, []);

  // --- 2. Filter Logic ---
  const filteredInvoices = useMemo(() => {
    return DUMMY_INVOICES.filter(inv => {
      // A. Project Filter
      if (filters.project && inv.project !== filters.project) return false;
      
      // B. State Filter
      if (filters.state && inv.state !== filters.state) return false;
      
      // C. Status Filter
      if (filters.status && inv.status !== filters.status) return false;

      // D. Date Range Filter
      const [start, end] = filters.dateRange;
      if (start && end) {
        const invDate = new Date(inv.invoiceDate);
        // Normalize times to compare dates only
        const checkDate = new Date(invDate.setHours(0,0,0,0));
        const startDate = new Date(start.setHours(0,0,0,0));
        const endDate = new Date(end.setHours(23,59,59,999));

        if (checkDate < startDate || checkDate > endDate) return false;
      }

      return true;
    });
  }, [filters]);

  // --- 3. Calculate KPI Totals (Based on FILTERED Data) ---
  const stats = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => ({
        invoiceBasicAmount: acc.invoiceBasicAmount + (invoice.invoiceBasicAmount || 0),
        invoiceGstAmount: acc.invoiceGstAmount + (invoice.invoiceGstAmount || 0),
        totalAmount: acc.totalAmount + (invoice.totalAmount || 0),
        amountPaidByClient: acc.amountPaidByClient + (invoice.amountPaidByClient || 0),
        balancePendingAmount: acc.balancePendingAmount + (invoice.balancePendingAmount || 0),
      }),
      {
        invoiceBasicAmount: 0,
        invoiceGstAmount: 0,
        totalAmount: 0,
        amountPaidByClient: 0,
        balancePendingAmount: 0,
      }
    );
  }, [filteredInvoices]);

  // KPI Config
  const kpiData = [
    { title: 'Basic Invoice Value', value: stats.invoiceBasicAmount, icon: IconFileInvoice, color: 'blue' },
    { title: 'GST Amount', value: stats.invoiceGstAmount, icon: IconReceiptTax, color: 'cyan' },
    { title: 'Total Invoice Amount', value: stats.totalAmount, icon: IconCalculator, color: 'violet' },
    { title: 'Total Paid', value: stats.amountPaidByClient, icon: IconCircleCheck, color: 'teal' },
    { title: 'Pending Amount', value: stats.balancePendingAmount, icon: IconClock, color: 'red' },
  ];

  return (
    <Stack gap="lg" pb="lg">
      
      {/* Row 0: Filters */}
      <DashboardFilters 
        projects={projects}
        states={states}
        statuses={statuses}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Row 1: KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }}>
        {kpiData.map((stat) => (
          <KpiCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </SimpleGrid>

      {/* Row 2: Analytics Row */}
      <Grid gutter="lg">
        {/* 1. Deductions Box */}
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
           <DeductionsBox invoices={filteredInvoices} />
        </Grid.Col>

        {/* 2. Bar Chart */}
        <Grid.Col span={{ base: 12, md: 8, lg: 5 }}>
          <InvoiceStateBarChart invoices={filteredInvoices} />
        </Grid.Col>

        {/* 3. Donut Chart */}
        <Grid.Col span={{ base: 12, md: 12, lg: 4 }}>
          <InvoiceStatusDonutChart invoices={filteredInvoices} />
        </Grid.Col>
      </Grid>

      {/* Row 3: Latest Invoices Table */}
      <Paper withBorder p="md" radius="md" shadow="sm">
        <Title order={4} mb="md">Latest Invoices</Title>
        <InvoiceTable 
          data={filteredInvoices} 
          dashboardTable={true} 
          sort={true} 
        />
      </Paper>
      
    </Stack>
  );
};

export default AdminDashboard;