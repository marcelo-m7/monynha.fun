import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onSearchComplete?: () => void;
}

export const SearchInput = ({
  className,
  inputClassName,
  placeholder,
  onSearchComplete,
}: SearchInputProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/videos?query=${encodeURIComponent(trimmed)}`);
    onSearchComplete?.();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder ?? t("header.searchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={cn("pl-9", inputClassName)}
      />
    </form>
  );
};
