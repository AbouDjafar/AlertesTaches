import ExcelJS from "exceljs";
import { normalizeTasks, Task } from "@/lib/store";

const PLAN_COLUMNS = [
  "N°",
  "Activité",
  "Tâche",
  "Description",
  "Source",
  "Nature",
  "Extrant attendu",
  "IOV (Indicateur Objectivement Vérifiable)",
  "Responsable",
  "Date de début",
  "Date de fin",
  "Durée (jours)",
  "Priorité",
  "État d'avancement",
  "Extrants obtenus à date",
  "Livrables fournis",
  "Observations",
  "Etat",
] as const;

const PLAN_WIDTHS = [6, 35, 50, 40, 25, 20, 45, 40, 15, 14, 14, 12, 12, 18, 25, 20, 40, 10];
const HEADER_FILL = "C63D2F";
const HEADER_TEXT = "FFFFFF";
const STATUS_VALUES = ["Non démarré", "Non démarrée", "En cours", "Terminée", "Terminé"];

type ImportField = Exclude<keyof Task, "id">;

const HEADER_KEYS: Record<string, ImportField> = {
  n: "numero",
  numero: "numero",
  activite: "activite",
  tache: "tache",
  description: "description",
  source: "source",
  nature: "nature",
  "extrant attendu": "extrantAttendu",
  "iov indicateur objectivement verifiable": "iov",
  responsable: "responsable",
  "date de debut": "dateDebut",
  "date de fin": "dateFin",
  "duree jours": "duree",
  priorite: "priorite",
  "etat d avancement": "etatAvancement",
  "etat davancement": "etatAvancement",
  "extrants obtenus a date": "extrantsObtenus",
  "livrables fournis": "livrablesFournis",
  observations: "observations",
  etat: "etat",
};

function slugHeader(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`´]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeHeader(value: string | null | undefined, index: number) {
  const canonical = HEADER_KEYS[slugHeader(value)];
  return canonical ?? (`col_${index}` as const);
}

function excelSerialToIso(value: number) {
  const date = new Date(Date.UTC(1899, 11, 30));
  date.setUTCDate(date.getUTCDate() + Math.round(value));
  return date.toISOString().slice(0, 10);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function readCellValue(value: ExcelJS.CellValue): string | number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return toDateOnly(value);
  }
  if (typeof value === "object" && "result" in value) {
    return readCellValue(value.result as ExcelJS.CellValue);
  }
  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "");
  }
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

function parseExcelDate(raw: string | number | null) {
  if (raw == null || raw === "") {
    return "";
  }
  if (typeof raw === "number") {
    return excelSerialToIso(raw);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(trimmed);
  if (isoMatch) {
    return isoMatch[0];
  }

  const frMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  return trimmed;
}

function asNumber(raw: string | number | null) {
  if (raw == null || raw === "") {
    return 0;
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }

  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asText(raw: string | number | null, fallback = "") {
  if (raw == null) {
    return fallback;
  }
  const value = String(raw).trim();
  return value || fallback;
}

export async function importTasksFromExcel(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet("Planificateur") ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("La feuille 'Planificateur' est introuvable.");
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = (Array.isArray(headerRow.values) ? headerRow.values.slice(1) : []) as ExcelJS.CellValue[];
  const headers = headerValues.map((value: ExcelJS.CellValue, index: number) => {
    const normalized = readCellValue(value);
    return normalizeHeader(normalized == null ? undefined : String(normalized), index + 1);
  });

  const tasks: Task[] = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const values = headers.map((_, headerIndex: number) => readCellValue(row.getCell(headerIndex + 1).value));
    const meaningfulCount = values.filter((value: string | number | null) => value != null && `${value}`.trim() !== "").length;
    if (meaningfulCount <= 1) {
      continue;
    }

    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]])) as Partial<
      Record<ImportField | string, string | number | null>
    >;

    const dateDebut = parseExcelDate(record.dateDebut as string | number | null);
    const dateFin = parseExcelDate(record.dateFin as string | number | null);

    tasks.push({
      id: crypto.randomUUID(),
      numero: asNumber(record.numero as string | number | null),
      activite: asText(record.activite as string | number | null),
      tache: asText(record.tache as string | number | null),
      description: asText(record.description as string | number | null),
      source: asText(record.source as string | number | null),
      nature: asText(record.nature as string | number | null),
      extrantAttendu: asText(record.extrantAttendu as string | number | null),
      iov: asText(record.iov as string | number | null),
      responsable: asText(record.responsable as string | number | null),
      dateDebut,
      dateFin,
      duree: asNumber(record.duree as string | number | null),
      priorite: asText(record.priorite as string | number | null, "Moyen"),
      etatAvancement: asText(record.etatAvancement as string | number | null, "Non démarré"),
      extrantsObtenus: asText(record.extrantsObtenus as string | number | null),
      livrablesFournis: asText(record.livrablesFournis as string | number | null),
      observations: asText(record.observations as string | number | null),
      etat: record.etat == null ? null : asText(record.etat as string | number | null),
    });
  }

  return normalizeTasks(tasks);
}

function parseIsoDate(value: string) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildWorkbook(tasks: Task[]) {
  const workbook = new ExcelJS.Workbook();
  const planSheet = workbook.addWorksheet("Planificateur");

  planSheet.addRow(PLAN_COLUMNS);
  const headerRow = planSheet.getRow(1);
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  planSheet.views = [{ state: "frozen", ySplit: 1 }];
  PLAN_WIDTHS.forEach((width, index) => {
    planSheet.getColumn(index + 1).width = width;
  });

  tasks.forEach((task) => {
    const rowIndex = planSheet.rowCount + 1;
    const row = planSheet.addRow([
      task.numero,
      task.activite,
      task.tache,
      task.description,
      task.source,
      task.nature,
      task.extrantAttendu,
      task.iov,
      task.responsable,
      parseIsoDate(task.dateDebut),
      parseIsoDate(task.dateFin),
      null,
      task.priorite,
      task.etatAvancement,
      task.extrantsObtenus,
      task.livrablesFournis,
      task.observations,
      task.etat,
    ]);

    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9 };
      cell.alignment = { vertical: "middle" };
    });

    row.getCell(10).numFmt = "dd/mm/yyyy";
    row.getCell(11).numFmt = "dd/mm/yyyy";
    row.getCell(12).value = { formula: `IF(AND(J${rowIndex}<>"",K${rowIndex}<>""),K${rowIndex}-J${rowIndex},"")` };
    row.getCell(12).numFmt = "0";
  });

  const lastDataRow = Math.max(planSheet.rowCount, 2);
  for (let rowIndex = 2; rowIndex <= lastDataRow; rowIndex += 1) {
    planSheet.getCell(`N${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${STATUS_VALUES.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "Choisissez une valeur dans la liste proposée.",
    };
  }

  const ganttSheet = workbook.addWorksheet("Gantt");
  ganttSheet.addRow(["Tâche", "Date de début", "Durée (jours)", "État d'avancement"]);
  ganttSheet.getRow(1).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ganttSheet.views = [{ state: "frozen", ySplit: 1 }];
  ganttSheet.getColumn(1).width = 60;
  ganttSheet.getColumn(2).width = 15;
  ganttSheet.getColumn(3).width = 15;
  ganttSheet.getColumn(4).width = 20;

  tasks
    .filter((task) => task.dateDebut || task.dateFin)
    .forEach((task) => {
      const row = ganttSheet.addRow([task.tache, parseIsoDate(task.dateDebut), task.duree || null, task.etatAvancement]);
      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = { vertical: "middle" };
      });
      row.getCell(2).numFmt = "dd/mm/yyyy";
    });

  return workbook;
}

export async function exportTasksToExcel(tasks: Task[]) {
  const workbook = buildWorkbook(tasks);
  return workbook.xlsx.writeBuffer();
}

export type CompiledOwnerDataset = {
  owner: string;
  tasks: Task[];
};

export async function exportCompiledWorkbook(datasets: CompiledOwnerDataset[]) {
  const workbook = new ExcelJS.Workbook();

  datasets.forEach(({ owner, tasks }) => {
    const ownerWorkbook = buildWorkbook(tasks);
    const sourceSheet = ownerWorkbook.getWorksheet("Planificateur");
    if (!sourceSheet) {
      return;
    }

    const targetSheet = workbook.addWorksheet(owner.slice(0, 31) || "Utilisateur");
    sourceSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const targetRow = targetSheet.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const cloned = targetRow.getCell(colNumber);
        cloned.value = cell.value as ExcelJS.CellValue;
        cloned.style = { ...cell.style };
        cloned.numFmt = cell.numFmt;
      });
      targetRow.height = row.height;
      targetRow.commit();
    });

    sourceSheet.columns.forEach((column, index) => {
      const targetColumn = targetSheet.getColumn(index + 1);
      targetColumn.width = column.width;
    });
    targetSheet.views = sourceSheet.views;
    targetSheet.autoFilter = sourceSheet.autoFilter;
  });

  if (workbook.worksheets.length === 0) {
    throw new Error("Aucune feuille n'a pu être générée.");
  }

  return workbook.xlsx.writeBuffer();
}
