import { useEffect } from 'react';

import { Drawer, PasswordInput, Textarea, TextInput, NumberInput, Switch, Select, Checkbox, Radio, Group, Stack, Button, Alert, FileInput, Box } from '@mantine/core';
import { DatePickerInput, DateValue } from '@mantine/dates';
import { useForm, UseFormReturnType } from '@mantine/form';
import { IconInfoCircle, IconUpload } from '@tabler/icons-react';

import type { AlertVariant, MantineColor } from '@mantine/core';

// --- Helper for Date String ---
const getDateString = (date: Date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

type FormFieldType = 'Text' | 'Password' | 'Textarea' | 'Number' | 'Select' | 'Checkbox' | 'Radio' | 'Switch' | 'Date' | 'File';

type Options = {
  label: string;
  value: string;
};

// Update FormValue to include File
export type FormValue = string | boolean | number | DateValue | File | null;

type FormFieldValidationFunction = (value: FormValue, values: Record<string, FormValue>) => string | null;

export type FormField = {
  fieldType: FormFieldType;
  formKey: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: Options[];
  placeholder?: string;
  
  // Dynamic props that can depend on other form values
  hidden?: boolean | ((values: Record<string, FormValue>) => boolean);
  disabled?: boolean | ((values: Record<string, FormValue>) => boolean);
  minDate?: Date | ((values: Record<string, FormValue>) => Date | undefined | null);
maxDate?: Date | ((values: Record<string, FormValue>) => Date | undefined | null);
  accept?: string; // For FileInput

  defaultTextValue?: string | null;
  defaultNumberValue?: number | null;
  defaultToggleValue?: boolean | null;
  defaultSelectedOption?: string | null;
  defaultDateValue?: DateValue | null;
  defaultFileValue?: File | null;
  
  validate?: FormFieldValidationFunction;
};

export type FormDrawerProps = {
  title: string;
  opened: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  submitButtonText?: string;
  cancelButtonText?: string;
  size?: string | number;

  alert?: {
    title: string;
    message: string;
    color?: MantineColor;
    variant?: AlertVariant;
  };

  formFields: FormField[];

  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  onSubmit?: (values: Record<string, FormValue>) => Promise<void>;
  onSuccess?: () => Promise<void> | void;
  onError?: (error: unknown) => void;
  onFinally?: () => void;
  
  // New prop to handle calculations
  onValuesChange?: (values: Record<string, FormValue>, form: UseFormReturnType<Record<string, FormValue>>) => void;
};

type FormInitialValues = {
  mode?: 'uncontrolled';
  initialValues: Record<string, FormValue>;
  validate: Record<string, FormFieldValidationFunction>;
};

type UseFormType = UseFormReturnType<Record<string, FormValue>, (values: Record<string, FormValue>) => Record<string, FormValue>>;

export function FormModal({
  title,
  opened,
  onClose,
  position = 'right',
  submitButtonText = 'Submit',
  cancelButtonText = 'Close',
  alert,
  formFields,
  loading = false,
  setLoading,
  onSubmit,
  onSuccess,
  onError,
  onFinally,
  onValuesChange,
  size = 'md'
}: FormDrawerProps) {
  const form = useForm(setupForm(formFields));

  // Reset form when drawer opens
  useEffect(() => {
    if (opened) {
      const initialValues = setupForm(formFields).initialValues;
      form.setValues(initialValues);
      form.resetDirty();
    }
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle value changes (Calculations)
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(form.values, form);
    }
  }, [form.values, onValuesChange]); // Dependency on form.values triggers this on change

  const isDisabled = form.submitting || loading;

  const handleOnSubmit = async (values: Record<string, FormValue>) => {
    setLoading?.(true);
    try {
      await onSubmit?.(values);
      form.reset();
      await onSuccess?.();
    } catch (error) {
      await onError?.(error);
    } finally {
      setLoading?.(false);
      await onFinally?.();
    }
  };

  return (
    <Drawer closeOnClickOutside={false} position={position} opened={opened} onClose={onClose} title={title} size={size}>
      <form onSubmit={form.onSubmit(handleOnSubmit)}>
        {alert && (
          <Stack align="stretch" justify="flex-start" gap="sm">
            <Alert title={alert.title} color={alert.color} variant={alert.variant} mb={20} icon={<IconInfoCircle />}>
              {alert.message}
            </Alert>
          </Stack>
        )}
        <Stack align="stretch" justify="flex-start" gap="sm">
          {formFields.map((field) => renderFormField(field, form, isDisabled))}
        </Stack>
        <Stack align="stretch" justify="flex-start" gap="xs" mt={30}>
          <Button variant="filled" type="submit" disabled={isDisabled}>
            {submitButtonText}
          </Button>
          <Button variant="subtle" onClick={onClose} disabled={isDisabled}>
            {cancelButtonText}
          </Button>
        </Stack>
      </form>
    </Drawer>
  );
}

function renderFormField(field: FormField, form: UseFormType, globalDisabled = false) {
  // Determine dynamic properties based on current form values
  const isHidden = typeof field.hidden === 'function' ? field.hidden(form.values) : field.hidden;
  if (isHidden) return null;

  const isDisabled = globalDisabled || (typeof field.disabled === 'function' ? field.disabled(form.values) : field.disabled);
  // Root Fix: The '?? undefined' converts 'null' to 'undefined' to satisfy Mantine types
  const rawMinDate = typeof field.minDate === 'function' ? field.minDate(form.values) : field.minDate;
  const minDate = rawMinDate ?? undefined;

  const rawMaxDate = typeof field.maxDate === 'function' ? field.maxDate(form.values) : field.maxDate;
  const maxDate = rawMaxDate ?? undefined;

  switch (field.fieldType) {
    case 'Text':
      return (
        <TextInput
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );
    case 'Password':
      return (
        <PasswordInput
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );
    case 'Textarea':
      return (
        <Textarea
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );

    case 'Number':
      return (
        <NumberInput
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          decimalScale={2}
          fixedDecimalScale
          {...form.getInputProps(field.formKey)}
        />
      );

    case 'Checkbox':
      return (
        <Checkbox
          label={field.label}
          description={field.description}
          required={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey, { type: 'checkbox' })}
        />
      );
    case 'Switch':
      return (
        <Switch
          label={field.label}
          description={field.description}
          checked={field.defaultToggleValue || false}
          required={field.required}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey, { type: 'checkbox' })}
        />
      );
    case 'Radio':
      return (
        <Radio.Group
          label={field.label}
          description={field.description}
          withAsterisk={field.required}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        >
          <Group mt="xs">
            {field.options?.map((option) => (
              <Radio 
                key={option.value} 
                value={option.value} 
                label={option.label} 
              />
            ))}
          </Group>
        </Radio.Group>
      );
    case 'Select':
      return (
        <Select
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          data={field.options}
          searchable={true}
          disabled={isDisabled}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );
    case 'Date':
      return (
        <DatePickerInput
          valueFormat="YYYY-MM-DD"
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          minDate={minDate}
          maxDate={maxDate}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );
    case 'File':
      return (
        <FileInput 
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          withAsterisk={field.required}
          disabled={isDisabled}
          accept={field.accept}
          leftSection={<IconUpload size={14} />}
          key={form.key(field.formKey)}
          {...form.getInputProps(field.formKey)}
        />
      );

    default:
      return null;
  }
}

function setupForm(formFields: FormField[]): FormInitialValues {
  const formData: FormInitialValues = {
    initialValues: {},
    validate: {},
  };

  formFields.forEach((field) => {
    // Add initial values based on field type
    if (field.fieldType === 'Text' || field.fieldType === 'Password' || field.fieldType === 'Textarea') {
      formData.initialValues[field.formKey] = field.defaultTextValue || '';
    } else if (field.fieldType === 'Number') {
      formData.initialValues[field.formKey] = field.defaultNumberValue || 0;
    } else if (field.fieldType === 'Switch' || field.fieldType === 'Checkbox') {
      formData.initialValues[field.formKey] = field.defaultToggleValue || false;
    } else if ((field.fieldType === 'Select' || field.fieldType === 'Radio') && field.options) {
      formData.initialValues[field.formKey] = field.defaultSelectedOption || '';
    } else if (field.fieldType === 'Date') {
       // Check if defaultDateValue is a valid Date
       if (field.defaultDateValue instanceof Date && !isNaN(field.defaultDateValue.getTime())) {
         formData.initialValues[field.formKey] = field.defaultDateValue;
       } else {
         formData.initialValues[field.formKey] = null;
       }
    } else if (field.fieldType === 'File') {
       formData.initialValues[field.formKey] = null;
    }

    // Add validation functions
    if (field.required || field.validate) {
      formData.validate[field.formKey] = (value: FormValue, values: Record<string, FormValue>) => {
        
        // Required Check
        if (field.required) {
             if (typeof value === 'string' && value.trim() === '') return `${field.label} is required`;
             if (value === null || value === undefined) return `${field.label} is required`;
             if (field.fieldType === 'Number' && (value === undefined || value === null)) return `${field.label} is required`;
        }

        // Custom Validation
        if (field.validate) {
          return field.validate(value, values);
        }

        return null;
      };
    }
  });

  return formData;
}