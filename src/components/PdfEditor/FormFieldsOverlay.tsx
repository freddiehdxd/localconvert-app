import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import type { FormField } from "./types";

interface FormFieldsOverlayProps {
  formFields: FormField[];
  pageNumber: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  onFieldChange: (fieldName: string, newValue: string) => void;
  isDark: boolean;
}

export function FormFieldsOverlay({
  formFields,
  pageNumber,
  scale,
  pageWidth,
  pageHeight,
  onFieldChange,
  isDark,
}: FormFieldsOverlayProps) {
  // Filter fields for current page
  const pageFields = formFields.filter((f) => f.page === pageNumber);

  if (pageFields.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {pageFields.map((field) => (
        <FormFieldInput
          key={field.name}
          field={field}
          scale={scale}
          onFieldChange={onFieldChange}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

interface FormFieldInputProps {
  field: FormField;
  scale: number;
  onFieldChange: (fieldName: string, newValue: string) => void;
  isDark: boolean;
}

function FormFieldInput({ field, scale, onFieldChange, isDark }: FormFieldInputProps) {
  const [localValue, setLocalValue] = useState(field.editedValue ?? field.value);
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when field changes
  useEffect(() => {
    setLocalValue(field.editedValue ?? field.value);
  }, [field.editedValue, field.value]);

  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);
      onFieldChange(field.name, newValue);
    },
    [field.name, onFieldChange]
  );

  const style: React.CSSProperties = {
    position: "absolute",
    left: field.x * scale,
    top: field.y * scale,
    width: field.width * scale,
    height: field.height * scale,
    pointerEvents: field.isReadOnly ? "none" : "auto",
  };

  // Common input styles
  const inputBaseClass = `
    w-full h-full px-1 text-xs border rounded
    transition-all duration-150
    ${field.isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-text"}
    ${field.isEdited ? "ring-2 ring-accent-500/50" : ""}
    ${isFocused 
      ? isDark 
        ? "bg-dark-700 border-accent-500 text-white" 
        : "bg-white border-accent-500 text-gray-900"
      : isDark
        ? "bg-dark-800/80 border-dark-600 text-white hover:border-dark-500"
        : "bg-white/80 border-gray-300 text-gray-900 hover:border-gray-400"
    }
  `;

  // Render based on field type
  switch (field.type) {
    case "text":
      return (
        <div style={style}>
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={field.isReadOnly}
            className={inputBaseClass}
            style={{ fontSize: Math.max(8, Math.min(12, field.height * scale * 0.6)) }}
            placeholder={field.name}
          />
        </div>
      );

    case "checkbox":
      return (
        <div style={style} className="flex items-center justify-center">
          <motion.button
            className={`
              w-4 h-4 rounded border-2 flex items-center justify-center
              ${field.isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${localValue === "true" || localValue === "Yes" || field.isChecked
                ? isDark
                  ? "bg-accent-600 border-accent-500"
                  : "bg-accent-500 border-accent-600"
                : isDark
                  ? "bg-dark-700 border-dark-500"
                  : "bg-white border-gray-400"
              }
            `}
            onClick={() => {
              if (!field.isReadOnly) {
                const newValue = localValue === "true" || localValue === "Yes" ? "false" : "true";
                handleChange(newValue);
              }
            }}
            whileHover={field.isReadOnly ? {} : { scale: 1.1 }}
            whileTap={field.isReadOnly ? {} : { scale: 0.9 }}
            style={{ pointerEvents: field.isReadOnly ? "none" : "auto" }}
          >
            {(localValue === "true" || localValue === "Yes" || field.isChecked) && (
              <Check className="w-3 h-3 text-white" />
            )}
          </motion.button>
        </div>
      );

    case "radio":
      return (
        <div style={style} className="flex items-center justify-center">
          <motion.button
            className={`
              w-4 h-4 rounded-full border-2 flex items-center justify-center
              ${field.isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              ${localValue === field.value || field.isChecked
                ? isDark
                  ? "border-accent-500"
                  : "border-accent-600"
                : isDark
                  ? "border-dark-500"
                  : "border-gray-400"
              }
            `}
            onClick={() => {
              if (!field.isReadOnly) {
                handleChange(field.value);
              }
            }}
            whileHover={field.isReadOnly ? {} : { scale: 1.1 }}
            whileTap={field.isReadOnly ? {} : { scale: 0.9 }}
            style={{ pointerEvents: field.isReadOnly ? "none" : "auto" }}
          >
            {(localValue === field.value || field.isChecked) && (
              <div
                className={`w-2 h-2 rounded-full ${
                  isDark ? "bg-accent-500" : "bg-accent-600"
                }`}
              />
            )}
          </motion.button>
        </div>
      );

    case "combobox":
    case "listbox":
      return (
        <div style={style}>
          <div className="relative w-full h-full">
            <select
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={field.isReadOnly}
              className={`${inputBaseClass} appearance-none pr-6`}
              style={{ fontSize: Math.max(8, Math.min(12, field.height * scale * 0.6)) }}
            >
              <option value="">-- Select --</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${
                isDark ? "text-dark-400" : "text-gray-500"
              }`}
            />
          </div>
        </div>
      );

    case "button":
    case "signature":
      // Buttons and signatures are typically not editable
      return (
        <div
          style={style}
          className={`
            flex items-center justify-center text-xs
            ${isDark ? "bg-dark-700/50 text-dark-400" : "bg-gray-100/50 text-gray-500"}
            border border-dashed rounded
            ${isDark ? "border-dark-600" : "border-gray-300"}
          `}
        >
          {field.type === "signature" ? "Signature" : field.name}
        </div>
      );

    default:
      return (
        <div style={style}>
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={field.isReadOnly}
            className={inputBaseClass}
            style={{ fontSize: Math.max(8, Math.min(12, field.height * scale * 0.6)) }}
          />
        </div>
      );
  }
}

export default FormFieldsOverlay;
