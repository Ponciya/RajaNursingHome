import { useEffect, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Display value: when open, show search text; when closed, show selected label
  const displayValue = isOpen ? search : selectedOption?.label || "";

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className={`searchable-select-input ${isOpen ? "open" : ""}`}
        value={displayValue}
        placeholder={selectedOption ? selectedOption.label : placeholder}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch("");
        }}
        required={required && !selectedOption}
      />

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-options">
            {filtered.length === 0 ? (
              <div className="searchable-select-empty">No results found</div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  className={`searchable-select-option ${
                    option.value === value ? "selected" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            height: 0,
            width: 0,
          }}
        />
      )}
    </div>
  );
}