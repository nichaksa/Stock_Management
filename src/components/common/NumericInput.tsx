import React from 'react';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (val: number) => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  error?: string;
  label?: string;
  required?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  allowDecimals = false,
  min = 0,
  max,
  prefix,
  suffix,
  error,
  label,
  required,
  className = '',
  ...rest
}) => {
  const [inputValue, setInputValue] = React.useState<string>(value.toString());

  React.useEffect(() => {
    // If external value changes and doesn't match parsed input, sync it
    const parsed = allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed !== value) {
      setInputValue(value.toString());
    }
  }, [value, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Handle leading zero issue (e.g. replacing '0' with '1' when typing)
    if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
      raw = raw.replace(/^0+/, '');
      if (raw === '') raw = '0';
    }

    setInputValue(raw);

    if (raw === '' || raw === '-') {
      onChange(min !== undefined ? min : 0);
      return;
    }

    const num = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
    if (!isNaN(num)) {
      let constrained = num;
      if (min !== undefined && constrained < min) constrained = min;
      if (max !== undefined && constrained > max) constrained = max;
      onChange(constrained);
    }
  };

  const handleBlur = () => {
    // On blur, normalize to a clean number
    const num = allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10);
    const valid = isNaN(num) ? (min !== undefined ? min : 0) : num;
    setInputValue(valid.toString());
    onChange(valid);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-gi">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-xs font-medium text-app-muted dark:text-app-darkMuted pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 text-sm bg-white dark:bg-app-darkSurface border rounded-lg transition-colors outline-none font-mono ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-12' : ''} ${
            error
              ? 'border-gi focus:ring-1 focus:ring-gi text-gi'
              : 'border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText focus:border-brand-blue focus:ring-1 focus:ring-brand-blue'
          } ${className}`}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-medium text-app-muted dark:text-app-darkMuted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-gi font-medium">{error}</p>}
    </div>
  );
};
