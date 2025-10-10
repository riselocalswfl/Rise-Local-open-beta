import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import type { ValueTag } from "@/../../shared/values";

export type MatchMode = "any" | "all";

const STORAGE_KEY = "le:valueFilters";
const MATCH_MODE_KEY = "le:matchMode";
const INCLUDE_VENDOR_VALUES_KEY = "le:includeVendorValues";

export function useValueFilters() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  
  const [selected, setSelectedState] = useState<ValueTag[]>(() => {
    const params = new URLSearchParams(search);
    const urlValues = params.get("values");
    if (urlValues) {
      return urlValues.split(",").filter(Boolean) as ValueTag[];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [matchMode, setMatchModeState] = useState<MatchMode>(() => {
    const params = new URLSearchParams(search);
    const urlMode = params.get("match") as MatchMode | null;
    if (urlMode === "any" || urlMode === "all") {
      return urlMode;
    }
    const stored = localStorage.getItem(MATCH_MODE_KEY);
    return (stored as MatchMode) || "any";
  });
  
  const [includeVendorValuesForProducts, setIncludeVendorValuesForProductsState] = useState<boolean>(() => {
    const params = new URLSearchParams(search);
    const urlInclude = params.get("includeVendor");
    if (urlInclude !== null) {
      return urlInclude === "true";
    }
    const stored = localStorage.getItem(INCLUDE_VENDOR_VALUES_KEY);
    return stored !== null ? stored === "true" : true;
  });
  
  const updateUrl = useCallback((values: ValueTag[], mode: MatchMode, includeVendor: boolean) => {
    const params = new URLSearchParams(window.location.search);
    
    if (values.length > 0) {
      params.set("values", values.join(","));
    } else {
      params.delete("values");
    }
    
    if (mode !== "any") {
      params.set("match", mode);
    } else {
      params.delete("match");
    }
    
    if (!includeVendor) {
      params.set("includeVendor", "false");
    } else {
      params.delete("includeVendor");
    }
    
    const newSearch = params.toString();
    const currentPath = window.location.pathname;
    setLocation(currentPath + (newSearch ? `?${newSearch}` : ""));
  }, [setLocation]);
  
  const setSelected = useCallback((values: ValueTag[]) => {
    setSelectedState(values);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    updateUrl(values, matchMode, includeVendorValuesForProducts);
  }, [matchMode, includeVendorValuesForProducts, updateUrl]);
  
  const setMatchMode = useCallback((mode: MatchMode) => {
    setMatchModeState(mode);
    localStorage.setItem(MATCH_MODE_KEY, mode);
    updateUrl(selected, mode, includeVendorValuesForProducts);
  }, [selected, includeVendorValuesForProducts, updateUrl]);
  
  const setIncludeVendorValuesForProducts = useCallback((include: boolean) => {
    setIncludeVendorValuesForProductsState(include);
    localStorage.setItem(INCLUDE_VENDOR_VALUES_KEY, String(include));
    updateUrl(selected, matchMode, include);
  }, [selected, matchMode, updateUrl]);
  
  const clear = useCallback(() => {
    setSelectedState([]);
    localStorage.removeItem(STORAGE_KEY);
    setMatchModeState("any");
    localStorage.removeItem(MATCH_MODE_KEY);
    setIncludeVendorValuesForProductsState(true);
    localStorage.removeItem(INCLUDE_VENDOR_VALUES_KEY);
    updateUrl([], "any", true);
  }, [updateUrl]);
  
  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlValues = params.get("values");
    const urlMode = params.get("match") as MatchMode | null;
    const urlInclude = params.get("includeVendor");
    
    if (urlValues) {
      const values = urlValues.split(",").filter(Boolean) as ValueTag[];
      setSelectedState(values);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } else {
      setSelectedState([]);
      localStorage.removeItem(STORAGE_KEY);
    }
    
    if (urlMode === "any" || urlMode === "all") {
      setMatchModeState(urlMode);
      localStorage.setItem(MATCH_MODE_KEY, urlMode);
    } else {
      setMatchModeState("any");
      localStorage.removeItem(MATCH_MODE_KEY);
    }
    
    if (urlInclude !== null) {
      const include = urlInclude === "true";
      setIncludeVendorValuesForProductsState(include);
      localStorage.setItem(INCLUDE_VENDOR_VALUES_KEY, String(include));
    } else {
      setIncludeVendorValuesForProductsState(true);
      localStorage.removeItem(INCLUDE_VENDOR_VALUES_KEY);
    }
  }, [search]);
  
  return {
    selected,
    setSelected,
    matchMode,
    setMatchMode,
    includeVendorValuesForProducts,
    setIncludeVendorValuesForProducts,
    clear,
  };
}
