import { StructureResolver } from "sanity/structure";

// 🟢 STRUKTUR MODERN: Mengatur susunan menu navigasi kiri Studio Sanity v5
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content Desk")
    .items([
      // Otomatis menampilkan semua skema yang terdaftar di schemaTypes (termasuk radioConfig)
      ...S.documentTypeListItems(),
    ]);