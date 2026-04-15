import pandas as pd
import json

file_path = r"c:\Users\Janus\Downloads\flujo de caja 2025 a 12 marzo 2026.xlsx"

try:
    xls = pd.ExcelFile(file_path)
    print(f"Hojas en el archivo:")
    for sheet in xls.sheet_names:
        print(f"\n--- Hoja: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
        print("Columnas:", df.columns.tolist())
        print("Primeras filas (muestra):")
        print(df.head(3).to_string())
except Exception as e:
    print(f"Error reading File: {e}")
