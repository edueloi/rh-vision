import { useState, useEffect } from "react";

export type Unit = {
  id: string;
  name: string;
  location: string;
};

export const FADEL_UNITS: Unit[] = [
  { id: "master", name: "Fadel - Central (Master)", location: "Todas" },
  { id: "tatui", name: "Fadel - Tatuí", location: "Tatuí, SP" },
  { id: "curitiba", name: "Fadel - Curitiba", location: "Curitiba, PR" },
  { id: "rio", name: "Fadel - Rio de Janeiro", location: "Rio de Janeiro, RJ" },
  { id: "bh", name: "Fadel - Belo Horizonte", location: "Belo Horizonte, MG" },
];

export function useUnit() {
  const [currentUnit, setCurrentUnit] = useState<Unit>(() => {
    const saved = localStorage.getItem("fadel_selected_unit");
    return saved ? JSON.parse(saved) : FADEL_UNITS[0];
  });

  const changeUnit = (unit: Unit) => {
    setCurrentUnit(unit);
    localStorage.setItem("fadel_selected_unit", JSON.stringify(unit));
    // Em um app real, aqui recarregaríamos os dados do backend filtrados por unidade
  };

  const isMaster = currentUnit.id === "master";

  return {
    currentUnit,
    changeUnit,
    isMaster,
    units: FADEL_UNITS
  };
}
