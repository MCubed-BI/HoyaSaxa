import { AppIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function SearchField({
  id,
  name = "q",
  value,
  defaultValue,
  placeholder = "Search",
  label = "Search",
  onChange,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <AppIcon
        name="search"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
    </div>
  );
}
