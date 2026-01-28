import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MenubarMenu,
  MenubarContent,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const languageOptions = [
  { value: "pt", labelKey: "common.language.pt" },
  { value: "en", labelKey: "common.language.en" },
  { value: "es", labelKey: "common.language.es" },
  { value: "fr", labelKey: "common.language.fr" },
];

type LanguageSelectorProps =
  | {
      variant?: "select";
      className?: string;
      triggerClassName?: string;
      showLabel?: boolean;
      labelClassName?: string;
    }
  | {
      variant: "menubar";
      className?: string;
      triggerClassName?: string;
      showLabel?: boolean;
      labelClassName?: string;
    };

export const LanguageSelector = ({
  variant = "select",
  className,
  triggerClassName,
  showLabel = false,
  labelClassName,
}: LanguageSelectorProps) => {
  const { t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem("i18nextLng", language);
  };

  if (variant === "menubar") {
    return (
      <MenubarMenu>
        <MenubarTrigger className={cn("gap-2", triggerClassName)}>
          <Globe className="h-4 w-4" />
          {t("header.languageMenu")}
        </MenubarTrigger>
        <MenubarContent align="end" className={className}>
          <MenubarRadioGroup value={i18n.language} onValueChange={handleLanguageChange}>
            {languageOptions.map((option) => (
              <MenubarRadioItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel ? (
        <Label className={cn("text-xs font-medium text-muted-foreground", labelClassName)}>
          {t("header.languageLabel")}
        </Label>
      ) : null}
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className={cn("h-9 bg-muted/50 border-0", triggerClassName)}>
          <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
