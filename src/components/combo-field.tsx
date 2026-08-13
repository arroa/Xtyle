"use client";

type ComboFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function ComboField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: ComboFieldProps) {
  const listId = `${id}-options`;

  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        id={id}
        list={listId}
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="w-full rounded-md border border-input bg-background px-3 py-2 disabled:opacity-60"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
