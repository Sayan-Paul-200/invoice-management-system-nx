import { useState, useMemo, useEffect } from 'react';
import { 
  Table, 
  Checkbox, 
  ScrollArea, 
  Group, 
  Avatar, 
  Text, 
  Badge, 
  ActionIcon, 
  rem,
  StyleProp,
  Box,
  UnstyledButton,
  Center
} from '@mantine/core';
import { 
  IconPencil, 
  IconTrash, 
  IconEye, 
  IconSelector, 
  IconChevronDown, 
  IconChevronUp 
} from '@tabler/icons-react';
import { Invoice } from '@lib/invoices';
import classes from './InvoiceTable.module.scss'; // Assuming you might use CSS modules, or inline styles for simplicity

interface InvoiceTableProps {
  data: Invoice[];
  columns?: (keyof Invoice)[];
  actions?: boolean;
  dashboardTable?: boolean; // Maps to your 'dashboard_table' requirement
  multiSelection?: boolean; // Maps to 'multi-selection'
  sort?: boolean;
  style?: React.CSSProperties;
}

// Default columns as requested
const DEFAULT_COLUMNS: (keyof Invoice)[] = [
  'invoiceNumber',
  'invoiceDate',
  'invoiceBasicAmount',
  'invoiceGstAmount',
  'totalAmount',
  'totalDeduction',
  'netPayable',
  'amountPaidByClient',
  'balancePendingAmount',
  'status',
];

// Human-readable headers mapping
const HEADER_LABELS: Partial<Record<keyof Invoice, string>> = {
  invoiceNumber: 'Invoice No',
  invoiceDate: 'Invoice Date',
  invoiceBasicAmount: 'Basic Amt',
  invoiceGstAmount: 'GST Amt',
  totalAmount: 'Total Amt',
  totalDeduction: 'Deduction',
  netPayable: 'Net Payable',
  amountPaidByClient: 'Paid',
  balancePendingAmount: 'Pending',
  status: 'Status',
};

// Helper for Currency Formatting
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// Helper for Status Badge Color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return 'teal';
    case 'Under process': return 'blue';
    case 'Cancelled': return 'red';
    case 'Credit Note Issued': return 'yellow';
    default: return 'gray';
  }
};

// Helper to parse "30 Jun 25" to Date object
const parseDate = (dateString: string) => new Date(dateString);

export function InvoiceTable({
  data,
  columns = DEFAULT_COLUMNS,
  actions = false,
  dashboardTable = false,
  multiSelection = false,
  sort = false,
  style
}: InvoiceTableProps) {
  const [selection, setSelection] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<keyof Invoice | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  
  // 1. Filter Data (Dashboard Mode: Latest 10)
  const filteredData = useMemo(() => {
    let processedData = [...data];

    if (dashboardTable) {
      // Sort by Date Descending first to get "Latest"
      processedData.sort((a, b) => parseDate(b.invoiceDate).getTime() - parseDate(a.invoiceDate).getTime());
      // Take top 10
      processedData = processedData.slice(0, 10);
    }

    return processedData;
  }, [data, dashboardTable]);

  // 2. Sort Data (User Interaction)
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];

      // Handle String comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        // specific check for date strings
        if (sortBy.toLowerCase().includes('date')) {
             return reverseSortDirection 
                ? parseDate(valueA).getTime() - parseDate(valueB).getTime() 
                : parseDate(valueB).getTime() - parseDate(valueA).getTime();
        }
        return reverseSortDirection 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
      }

      // Handle Number comparison
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return reverseSortDirection ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });
  }, [filteredData, sortBy, reverseSortDirection]);


  // Handlers
  const toggleRow = (id: number) =>
    setSelection((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const toggleAll = () =>
    setSelection((current) => (current.length === sortedData.length ? [] : sortedData.map((item) => item.slNo)));

  const setSorting = (field: keyof Invoice) => {
    if (!sort) return;
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
  };

  // Render Rows
  const rows = sortedData.map((item) => {
    const isSelected = selection.includes(item.slNo);

    return (
      <Table.Tr key={item.slNo} bg={isSelected ? 'var(--mantine-color-blue-light)' : undefined}>
        {multiSelection && (
          <Table.Td>
            <Checkbox checked={isSelected} onChange={() => toggleRow(item.slNo)} />
          </Table.Td>
        )}

        {columns.map((col) => (
          <Table.Td key={col}>
            {col === 'status' ? (
              <Badge color={getStatusColor(item.status)} variant="light">
                {item.status}
              </Badge>
            ) : typeof item[col] === 'number' && (col as string).toLowerCase().includes('amount') || (col as string).includes('Deduction') || (col as string).includes('Payable') ? (
              <Text size="xs">{formatCurrency(item[col] as number)}</Text>
            ) : (
              <Text size="xs">{item[col]}</Text>
            )}
          </Table.Td>
        ))}

        {actions && (
          <Table.Td>
            <Group gap={0} justify="flex-end">
              <ActionIcon variant="subtle" color="gray">
                <IconEye style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="blue">
                <IconPencil style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red">
                <IconTrash style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
              </ActionIcon>
            </Group>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <ScrollArea>
      <Table verticalSpacing="sm" highlightOnHover style={style}>
        <Table.Thead>
          <Table.Tr>
            {multiSelection && (
              <Table.Th style={{ width: rem(40) }}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selection.length === sortedData.length && sortedData.length > 0}
                  indeterminate={selection.length > 0 && selection.length !== sortedData.length}
                />
              </Table.Th>
            )}

            {columns.map((col) => (
              <Table.Th key={col}>
                {sort ? (
                   <UnstyledButton onClick={() => setSorting(col)} className={classes.control}>
                   <Group justify="space-between">
                     <Text fw={700} size="sm">{HEADER_LABELS[col] || col}</Text>
                     <Center className={classes.icon}>
                       <IconSelector style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                     </Center>
                   </Group>
                 </UnstyledButton>
                ) : (
                    <Text fw={700} size="sm">{HEADER_LABELS[col] || col}</Text>
                )}
              </Table.Th>
            ))}

            {actions && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
}