'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const DEFAULT_START_MONTH = new Date(1920, 0, 1);
const DEFAULT_END_MONTH = new Date(new Date().getFullYear() + 5, 11, 31);

export function Calendar({
  className,
  classNames,
  captionLayout = 'dropdown',
  startMonth = DEFAULT_START_MONTH,
  endMonth = DEFAULT_END_MONTH,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-3',
        month: 'space-y-3',
        month_caption:
          'flex items-center justify-center pt-1 text-sm font-medium capitalize',
        caption_label: 'sr-only',
        dropdowns: 'flex items-center justify-center gap-2 pt-1',
        dropdown_root: 'relative inline-flex items-center',
        dropdown:
          'h-8 cursor-pointer appearance-none rounded-md border border-border bg-transparent pl-2 pr-7 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        chevron: 'h-4 w-4',
        nav: 'flex items-center justify-between absolute inset-x-1 top-1 px-1',
        button_previous: cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-transparent p-0 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
        ),
        button_next: cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-transparent p-0 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[11px] font-normal uppercase text-muted-foreground',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 p-0 text-center text-sm relative focus-within:relative focus-within:z-20',
        day_button: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'aria-selected:opacity-100',
        ),
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-semibold',
        outside: 'text-muted-foreground/40 [&>button]:text-muted-foreground/40',
        disabled: 'text-muted-foreground opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClass, ...rest }) => {
          const Icon = orientation === 'right' ? ChevronRight : ChevronLeft;
          return <Icon className={cn('h-4 w-4', chevClass)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}
