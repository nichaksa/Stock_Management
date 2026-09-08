import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, Clock } from 'lucide-react';
import { DateRange, PresetRangeKey } from '../../types/stock';
import { getPresetDateRange, formatDisplayRange } from '../../utils/dateRange';
import { format } from 'date-fns';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESETS: { key: PresetRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "31_days_ago", label: "31 Days Ago" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedPreset, setSelectedPreset] = useState<PresetRangeKey>(() => {
    return (value.label?.toLowerCase().replace(/\s+/g, '_') as PresetRangeKey) || "this_month";
  });

  // Local draft values for custom editing
  const [draftStartDay, setDraftStartDay] = useState<string>(() => {
    return value.startDate ? value.startDate.slice(0, 10) : format(new Date(), 'yyyy-MM-01');
  });
  const [draftStartHour, setDraftStartHour] = useState<string>(() => {
    return value.startDate ? value.startDate.slice(11, 13) || '00' : '00';
  });
  const [draftStartMin, setDraftStartMin] = useState<string>(() => {
    return value.startDate ? value.startDate.slice(14, 16) || '00' : '00';
  });

  const [draftEndDay, setDraftEndDay] = useState<string>(() => {
    return value.endDate ? value.endDate.slice(0, 10) : format(new Date(), 'yyyy-MM-dd');
  });
  const [draftEndHour, setDraftEndHour] = useState<string>(() => {
    return value.endDate ? value.endDate.slice(11, 13) || '23' : '23';
  });
  const [draftEndMin, setDraftEndMin] = useState<string>(() => {
    return value.endDate ? value.endDate.slice(14, 16) || '59' : '59';
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: PresetRangeKey) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const range = getPresetDateRange(preset);
      setDraftStartDay(range.startDate.slice(0, 10));
      setDraftStartHour(range.startDate.slice(11, 13) || '00');
      setDraftStartMin(range.startDate.slice(14, 16) || '00');
      setDraftEndDay(range.endDate.slice(0, 10));
      setDraftEndHour(range.endDate.slice(11, 13) || '23');
      setDraftEndMin(range.endDate.slice(14, 16) || '59');
    }
  };

  const handleApply = () => {
    const startIso = `${draftStartDay}T${draftStartHour.padStart(2, '0')}:${draftStartMin.padStart(2, '0')}:00`;
    const endIso = `${draftEndDay}T${draftEndHour.padStart(2, '0')}:${draftEndMin.padStart(2, '0')}:59`;
    
    const presetObj = PRESETS.find(p => p.key === selectedPreset);
    onChange({
      startDate: startIso,
      endDate: endIso,
      label: selectedPreset === 'custom' ? 'Custom Range' : presetObj?.label || 'Selected Range',
    });
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText hover:border-app-muted shadow-subtle transition-colors"
      >
        <CalendarIcon className="w-4 h-4 text-brand-blue shrink-0" />
        <span className="font-mono text-xs">
          {formatDisplayRange(value.startDate, value.endDate)}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-app-muted dark:text-app-darkMuted ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[560px] max-w-[95vw] bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-modal z-40 p-4 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Presets Column */}
            <div className="w-full md:w-40 border-b md:border-b-0 md:border-r border-app-border dark:border-app-darkBorder pb-3 md:pb-0 md:pr-3 space-y-1">
              <span className="block text-[11px] font-semibold text-app-muted dark:text-app-darkMuted uppercase tracking-wider px-2 mb-1.5">
                Presets
              </span>
              {PRESETS.map(p => {
                const isSelected = selectedPreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSelectPreset(p.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                      isSelected
                        ? 'bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue font-semibold'
                        : 'text-app-secondary dark:text-app-darkSecondary hover:bg-app-bg dark:hover:bg-app-darkBorder hover:text-app-text'
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-blue" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Calendars / Inputs */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* START DATE & TIME */}
                <div className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 space-y-2">
                  <span className="block text-[11px] font-semibold text-brand-blue uppercase tracking-wider">
                    Start Date & Time
                  </span>
                  <div>
                    <label className="text-[10px] text-app-muted block mb-1">Date</label>
                    <input
                      type="date"
                      value={draftStartDay}
                      onChange={e => {
                        setDraftStartDay(e.target.value);
                        setSelectedPreset('custom');
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-app-muted shrink-0" />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={draftStartHour}
                        onChange={e => {
                          setDraftStartHour(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-12 px-1.5 py-1 text-xs text-center bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md font-mono"
                      />
                      <span className="text-xs text-app-muted">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={draftStartMin}
                        onChange={e => {
                          setDraftStartMin(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-12 px-1.5 py-1 text-xs text-center bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* END DATE & TIME */}
                <div className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 space-y-2">
                  <span className="block text-[11px] font-semibold text-brand-blue uppercase tracking-wider">
                    End Date & Time
                  </span>
                  <div>
                    <label className="text-[10px] text-app-muted block mb-1">Date</label>
                    <input
                      type="date"
                      value={draftEndDay}
                      onChange={e => {
                        setDraftEndDay(e.target.value);
                        setSelectedPreset('custom');
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-app-muted shrink-0" />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={draftEndHour}
                        onChange={e => {
                          setDraftEndHour(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-12 px-1.5 py-1 text-xs text-center bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md font-mono"
                      />
                      <span className="text-xs text-app-muted">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={draftEndMin}
                        onChange={e => {
                          setDraftEndMin(e.target.value);
                          setSelectedPreset('custom');
                        }}
                        className="w-12 px-1.5 py-1 text-xs text-center bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-md font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border dark:border-app-darkBorder">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-lg hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg shadow-sm transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
