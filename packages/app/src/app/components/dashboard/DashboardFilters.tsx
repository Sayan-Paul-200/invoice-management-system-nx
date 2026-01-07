import { useState, useEffect } from 'react';
import { Group, Select, Paper } from '@mantine/core';
import { DatePickerInput, DatesRangeValue } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import '@mantine/dates/styles.css';

export interface FilterState {
  project: string | null;
  state: string | null;
  status: string | null;
  dateRange: [Date | null, Date | null];
}

interface DashboardFiltersProps {
  projects: string[];
  states: string[];
  statuses: string[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

export function DashboardFilters({ 
  projects, 
  states, 
  statuses, 
  filters, 
  onFilterChange 
}: DashboardFiltersProps) {
  
  // --- Financial Year Logic ---
  const [fyPresets, setFyPresets] = useState<{ label: string; value: [Date, Date] }[]>([]);

  useEffect(() => {
    const generateFYPresets = () => {
      const today = new Date();
      const currentMonth = today.getMonth(); // 0-11
      const currentYear = today.getFullYear();
      
      // If current month is April (3) or later, FY started this year. 
      // Else, it started last year.
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      
      const presets = [];
      for (let i = 0; i < 5; i++) {
        const y = startYear - i;
        const nextY = y + 1;
        const shortNextY = nextY.toString().slice(-2);
        
        // Construct standard FY range: April 1st to March 31st
        const startDate = new Date(y, 3, 1); // April 1st
        const endDate = new Date(nextY, 2, 31); // March 31st
        
        presets.push({
          label: `FY ${y}-${shortNextY}`,
          value: [startDate, endDate] as [Date, Date]
        });
      }
      return presets;
    };
    setFyPresets(generateFYPresets());
  }, []);

  // Helper to calculate Date Range from FY string
  const getRangeFromFY = (fyString: string): [Date, Date] => {
    // Expected format: "FY 2025-26"
    const startYearStr = fyString.split(' ')[1].split('-')[0]; // "2025"
    const startYear = parseInt(startYearStr);
    
    const startDate = new Date(startYear, 3, 1); // April 1st
    const endDate = new Date(startYear + 1, 2, 31); // March 31st next year
    
    return [startDate, endDate];
  };

  // --- Handlers ---

  const handleFYChange = (value: string | null) => {
    if (value) {
      const newRange = getRangeFromFY(value);
      onFilterChange({ ...filters, fy: value, dateRange: newRange });
    } else {
      onFilterChange({ ...filters, fy: null, dateRange: [null, null] });
    }
  };

  const handleDateRangeChange = (value: DatesRangeValue) => {
    onFilterChange({ ...filters, dateRange: value as [Date | null, Date | null] });
  };

  return (
    <Paper shadow="xs" radius="md" p="md" mb="lg">
      <Group justify="flex-start" gap="md">
        
        {/* 1. Select Project */}
        <Select
          placeholder="All Projects"
          data={projects}
          value={filters.project}
          onChange={(val) => onFilterChange({ ...filters, project: val })}
          searchable
          clearable
          style={{ flex: 1, minWidth: '160px' }}
        />

        {/* 2. Select State */}
        <Select
          placeholder="All States"
          data={states}
          value={filters.state}
          onChange={(val) => onFilterChange({ ...filters, state: val })}
          searchable
          clearable
          style={{ flex: 1, minWidth: '160px' }}
        />

        {/* 3. Select Status */}
        <Select
          placeholder="All Status"
          data={statuses}
          value={filters.status}
          onChange={(val) => onFilterChange({ ...filters, status: val })}
          clearable
          style={{ flex: 1, minWidth: '140px' }}
        />

        {/* 4. Date Range with FY Presets */}
        <DatePickerInput
          type="range"
          placeholder="Select Date Range or FY"
          value={filters.dateRange}
          onChange={handleDateRangeChange}
          leftSection={<IconCalendar size={16} />}
          clearable
          presets={fyPresets}
          style={{ flex: 1.5, minWidth: '220px' }}
        />

      </Group>
    </Paper>
  );
}