import { useState, useEffect } from "react";

export type Unit = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  location?: string;
  parent_id?: string;
  company_name?: string;
  responsible_name?: string;
  phone?: string;
  email?: string;
  is_master?: number;
};

export function useUnit() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentUnit, setCurrentUnit] = useState<Unit>({ id: "master", name: "Develoi - Central (Master)", location: "Todas" });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((u: any) => ({
          ...u,
          location: u.city ? `${u.city}, ${u.state}` : 'Todas'
        }));
        setUnits(formatted);
        
        const saved = localStorage.getItem("develoi_selected_unit");
        if (saved) {
          const parsed = JSON.parse(saved);
          const found = formatted.find((u: any) => u.id === parsed.id);
          if (found) setCurrentUnit(found);
        } else if (formatted.length > 0) {
          const master = formatted.find((u: any) => u.is_master === 1) || formatted[0];
          setCurrentUnit(master);
        }
      }
    } catch (error) {
      console.error("Failed to fetch units");
    }
  };

  const changeUnit = (unit: Unit) => {
    setCurrentUnit(unit);
    localStorage.setItem("develoi_selected_unit", JSON.stringify(unit));
  };

  const isMaster = currentUnit.id === "master" || currentUnit.is_master === 1;

  return {
    currentUnit,
    changeUnit,
    isMaster,
    units,
    refreshUnits: fetchUnits
  };
}
