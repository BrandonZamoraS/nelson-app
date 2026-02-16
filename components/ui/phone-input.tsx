"use client";

import { useState, useRef, useEffect } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js";

// Country name translations
const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  US: "Estados Unidos",
  MX: "México",
  ES: "España",
  CO: "Colombia",
  CL: "Chile",
  PE: "Perú",
  VE: "Venezuela",
  EC: "Ecuador",
  UY: "Uruguay",
  PY: "Paraguay",
  BO: "Bolivia",
  BR: "Brasil",
  CA: "Canadá",
  GB: "Reino Unido",
  DE: "Alemania",
  FR: "Francia",
  IT: "Italia",
  PT: "Portugal",
  CR: "Costa Rica",
  PA: "Panamá",
  GT: "Guatemala",
  SV: "El Salvador",
  HN: "Honduras",
  NI: "Nicaragua",
  DO: "Rep. Dominicana",
  PR: "Puerto Rico",
  CU: "Cuba",
  AU: "Australia",
  NZ: "Nueva Zelanda",
  JP: "Japón",
  CN: "China",
  IN: "India",
  RU: "Rusia",
  ZA: "Sudáfrica",
  NG: "Nigeria",
  EG: "Egipto",
  KE: "Kenia",
  GH: "Ghana",
  TR: "Turquía",
  SA: "Arabia Saudita",
  AE: "Emiratos Árabes",
  IL: "Israel",
  KR: "Corea del Sur",
  TH: "Tailandia",
  SG: "Singapur",
  MY: "Malasia",
  PH: "Filipinas",
  ID: "Indonesia",
  VN: "Vietnam",
  PK: "Pakistán",
  BD: "Bangladesh",
  NL: "Países Bajos",
  BE: "Bélgica",
  CH: "Suiza",
  AT: "Austria",
  SE: "Suecia",
  NO: "Noruega",
  DK: "Dinamarca",
  FI: "Finlandia",
  PL: "Polonia",
  CZ: "República Checa",
  GR: "Grecia",
  IE: "Irlanda",
  HU: "Hungría",
  RO: "Rumania",
  UA: "Ucrania",
};

// Convert country code to flag emoji
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get country name
function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

type PhoneInputProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
};

export function PhoneInput({
  name,
  defaultValue = "",
  required = false,
  placeholder = "",
}: PhoneInputProps) {
  const countries = getCountries();
  
  // Parse default value if provided
  const initialParsed = defaultValue
    ? (() => {
        try {
          return parsePhoneNumber(defaultValue);
        } catch {
          return null;
        }
      })()
    : null;

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    initialParsed?.country || "AR"
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialParsed ? initialParsed.formatNational() : ""
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search
  const filteredCountries = countries.filter((country) => {
    const name = getCountryName(country).toLowerCase();
    const code = country.toLowerCase();
    const calling = getCountryCallingCode(country);
    const search = searchTerm.toLowerCase();
    return (
      name.includes(search) ||
      code.includes(search) ||
      calling.includes(search)
    );
  });

  // Sort: popular countries first, then alphabetically
  const popularCountries = [
    "AR",
    "US",
    "MX",
    "ES",
    "CO",
    "CL",
    "BR",
    "PE",
    "VE",
    "EC",
    "UY",
  ];
  const sortedCountries = [
    ...filteredCountries.filter((c) => popularCountries.includes(c)),
    ...filteredCountries.filter((c) => !popularCountries.includes(c)),
  ];

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    const formatter = new AsYouType(selectedCountry);
    const formatted = formatter.input(value);
    setPhoneNumber(formatted);
    
    // Update hidden input with full international format
    if (hiddenInputRef.current) {
      try {
        const parsed = parsePhoneNumber(value, selectedCountry);
        if (parsed?.isValid()) {
          hiddenInputRef.current.value = parsed.format("E.164");
        } else {
          hiddenInputRef.current.value = `+${getCountryCallingCode(selectedCountry)}${value.replace(/\D/g, "")}`;
        }
      } catch {
        hiddenInputRef.current.value = `+${getCountryCallingCode(selectedCountry)}${value.replace(/\D/g, "")}`;
      }
    }
  };

  // Handle country selection
  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");
    setFocusedIndex(0);
    
    // Re-format the existing number with the new country
    if (phoneNumber && hiddenInputRef.current) {
      const cleanNumber = phoneNumber.replace(/\D/g, "");
      try {
        const parsed = parsePhoneNumber(cleanNumber, country);
        if (parsed?.isValid()) {
          hiddenInputRef.current.value = parsed.format("E.164");
          setPhoneNumber(parsed.formatNational());
        } else {
          hiddenInputRef.current.value = `+${getCountryCallingCode(country)}${cleanNumber}`;
        }
      } catch {
        hiddenInputRef.current.value = `+${getCountryCallingCode(country)}${cleanNumber}`;
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < sortedCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (sortedCountries[focusedIndex]) {
          handleCountrySelect(sortedCountries[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  };

  const callingCode = getCountryCallingCode(selectedCountry);

  return (
    <div className="phone-input-container">
      {/* Hidden input that holds the actual E.164 formatted value */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue}
        required={required}
      />

      <div className="phone-input-wrapper">
        {/* Country selector dropdown */}
        <div className={`phone-country-selector ${isOpen ? "is-open" : ""}`} ref={dropdownRef}>
          <button
            type="button"
            className="phone-country-button"
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-label="Seleccionar país"
            aria-expanded={isOpen}
          >
            <span className="phone-flag">{getFlagEmoji(selectedCountry)}</span>
            <svg
              className={`phone-chevron ${isOpen ? "is-open" : ""}`}
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isOpen && (
            <div className="phone-dropdown">
              <div className="phone-dropdown-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar país..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="phone-search-input"
                />
              </div>
              <div className="phone-dropdown-list">
                {sortedCountries.map((country, index) => (
                  <button
                    key={country}
                    type="button"
                    className={`phone-dropdown-item ${
                      index === focusedIndex ? "is-focused" : ""
                    } ${country === selectedCountry ? "is-selected" : ""}`}
                    onClick={() => handleCountrySelect(country)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <span className="phone-flag">{getFlagEmoji(country)}</span>
                    <span className="phone-country-name">
                      {getCountryName(country)}
                    </span>
                    <span className="phone-calling-code">
                      +{getCountryCallingCode(country)}
                    </span>
                  </button>
                ))}
                {sortedCountries.length === 0 && (
                  <div className="phone-dropdown-empty">
                    No se encontraron países
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          type="tel"
          className="phone-number-input"
          value={phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={placeholder || "Número de teléfono"}
          aria-label="Número de teléfono"
        />
      </div>

      <small className="field-hint">
        {phoneNumber
          ? `Formato: +${callingCode} ${phoneNumber.replace(/\D/g, "").substring(0, 3)} ${phoneNumber.replace(/\D/g, "").substring(3)}`
          : `Escribe tu número sin el código de país (+${callingCode})`}
      </small>
    </div>
  );
}
